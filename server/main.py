import sys
import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add the server directory to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.interfaces.api.routes import router as api_router
from app.use_cases.metrics import MetricsUseCases
from app.infrastructure.system.backup_manager import BackupManager
from datetime import datetime

# Refuse to start with a missing or publicly known API key: it protects the write endpoints
# (/metrics/reset, /backups/run...) of an API exposed on the Internet.
if not settings.API_KEY or settings.API_KEY == "your-secret-key":
    raise SystemExit("API_KEY is not set (or still 'your-secret-key'). Set a strong random value in .env, "
                     "e.g. with: openssl rand -hex 32")

# Initialize DB tables, then add any column missing from an existing database.
# The database is NEVER deleted: it holds the backup logs, and losing them used to make the
# backup cleanup treat every existing backup folder as an orphan.
from sqlalchemy import inspect, text
from app.infrastructure.db import models as _models  # noqa: F401  (registers tables on Base)

Base.metadata.create_all(bind=engine)

def migrate_missing_columns():
    inspector = inspect(engine)
    for table in Base.metadata.sorted_tables:
        if not inspector.has_table(table.name):
            continue
        existing = {c["name"] for c in inspector.get_columns(table.name)}
        for column in table.columns:
            if column.name in existing:
                continue
            if column.primary_key:
                print(f"Cannot add primary key column {table.name}.{column.name} automatically; skipping.")
                continue
            ddl = f"ALTER TABLE {table.name} ADD COLUMN {column.name} {column.type.compile(engine.dialect)}"
            default = column.default.arg if column.default is not None and column.default.is_scalar else None
            if isinstance(default, (int, float)) and not isinstance(default, bool):
                ddl += f" DEFAULT {default}"
            elif isinstance(default, str):
                ddl += " DEFAULT '" + default.replace("'", "''") + "'"
            print(f"Schema migration: adding missing column {table.name}.{column.name}")
            with engine.begin() as conn:
                conn.execute(text(ddl))

try:
    migrate_missing_columns()
except Exception as e:
    print(f"Error during schema migration: {e}")

background_tasks = set()

async def collect_metrics_once():
    db = SessionLocal()
    try:
        await asyncio.to_thread(MetricsUseCases(db).collect_and_save)
    finally:
        db.close()

async def cron_worker():
    # The first iteration runs immediately, so the database has data right after startup.
    print(f"Background worker started. Collecting metrics every {settings.COLLECTION_INTERVAL_SECONDS} seconds.")

    while True:
        try:
            print("Scheduled capture: collecting system metrics...")
            await collect_metrics_once()
        except asyncio.CancelledError:
            print("Cron worker background task cancelled.")
            break
        except Exception as e:
            print(f"Error during scheduled metrics capture: {e}")

        # Sleep outside the try above: an error must never make the loop spin without pausing.
        try:
            await asyncio.sleep(settings.COLLECTION_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            print("Cron worker background task cancelled.")
            break

async def backup_worker():
    # Wait a few seconds after startup to avoid concurrency conflicts with initial metrics capture
    await asyncio.sleep(15)
    # Mark any zombie "running" backups from previous lifecycle as failed/interrupted
    db = SessionLocal()
    try:
        from app.infrastructure.db.models import BackupLog
        zombies = db.query(BackupLog).filter(BackupLog.status == "running").all()
        if zombies:
            print(f"Cleaning up {len(zombies)} zombie running backup entries...")
            for z in zombies:
                z.status = "failed"
                z.error_message = "Interrompu par le redémarrage du serveur"
                
                # Physically clean up the aborted backup folder to free disk space
                try:
                    if z.timestamp:
                        folder_str = z.timestamp.strftime("%Y%m%d_%H%M%S")
                        folder_path = os.path.join("/mnt/ssdsata/backups", z.service, folder_str)
                        if os.path.exists(folder_path):
                            print(f"Physically removing aborted backup folder on startup: {folder_path}")
                            for root, dirs, files in os.walk(folder_path, topdown=False):
                                for file in files:
                                    os.remove(os.path.join(root, file))
                                for d in dirs:
                                    os.rmdir(os.path.join(root, d))
                            os.rmdir(folder_path)
                except Exception as del_err:
                    print(f"Failed to delete aborted folder {z.service}: {del_err}")
            db.commit()
    except Exception as e:
        print(f"Error cleaning up zombie backup logs: {e}")
    finally:
        db.close()

    # Mark existing successful backups with the completion marker (one-time backfill)
    db = SessionLocal()
    try:
        BackupManager(db).backfill_markers()
    except Exception as e:
        print(f"Error writing backup completion markers: {e}")
    finally:
        db.close()

    while True:
        db = SessionLocal()
        try:
            manager = BackupManager(db)
            status = manager.get_latest_backups_status()
            
            # Check backups status for each service
            for service in ["minecraft", "outline", "nextcloud"]:
                # Skip backups for services with retention set to 0 (disabled)
                service_limits = {
                    "minecraft": settings.MAX_BACKUPS_MINECRAFT,
                    "outline": settings.MAX_BACKUPS_OUTLINE,
                    "nextcloud": settings.MAX_BACKUPS_NEXTCLOUD,
                }
                if service_limits.get(service, 1) == 0:
                    print(f"{service} backups disabled (MAX_BACKUPS_{service.upper()}=0). Skipping.")
                    continue

                latest = status[service]["latest_backup"]
                needs_backup = False
                
                if latest is None:
                    print(f"No physical backup found for {service}. Triggering initial backup...")
                    needs_backup = True
                else:
                    # Parse backup date and calculate elapsed time
                    latest_date = datetime.fromisoformat(latest["date"])
                    diff_seconds = (datetime.utcnow() - latest_date).total_seconds()
                    
                    # Check against the age threshold from settings
                    if diff_seconds >= settings.BACKUP_AGE_THRESHOLD_SECONDS:
                        print(f"Latest backup for {service} is {diff_seconds / 3600:.1f} hours old. Triggering scheduled backup...")
                        needs_backup = True
                
                if needs_backup:
                    # Run backup inside a separate worker thread to avoid blocking the event loop
                    await asyncio.to_thread(manager.run_backup, service)
        except Exception as e:
            print(f"Error inside background backup worker: {e}")
        finally:
            db.close()
            
        try:
            # Check backups based on the configured interval
            await asyncio.sleep(settings.BACKUP_CHECK_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            print("Backup worker background task cancelled.")
            break

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: launch background worker tasks
    task_cron = asyncio.create_task(cron_worker())
    background_tasks.add(task_cron)
    task_cron.add_done_callback(background_tasks.discard)

    task_backup = asyncio.create_task(backup_worker())
    background_tasks.add(task_backup)
    task_backup.add_done_callback(background_tasks.discard)
    yield
    # Shutdown: cancel background worker tasks
    for task in background_tasks:
        task.cancel()
    if background_tasks:
        await asyncio.gather(*background_tasks, return_exceptions=True)

app = FastAPI(title="System Monitor API", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
