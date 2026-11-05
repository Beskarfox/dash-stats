import sys
import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add the server directory to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.db_init import init_db
from app.interfaces.api.routes import router as api_router
from app.use_cases.metrics import MetricsUseCases

# Backups are NOT run by this process: they need full access to the Docker socket, so they run
# in the separate, non-exposed backup worker (backup_worker.py). This API only queues requests.

# Refuse to start with a missing or publicly known API key: it protects the write endpoints
# (/metrics/reset, /backups/run...) of an API exposed on the Internet.
if not settings.API_KEY or settings.API_KEY == "your-secret-key":
    raise SystemExit("API_KEY is not set (or still 'your-secret-key'). Set a strong random value in .env, "
                     "e.g. with: openssl rand -hex 32")

init_db()

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: launch background worker tasks
    task_cron = asyncio.create_task(cron_worker())
    background_tasks.add(task_cron)
    task_cron.add_done_callback(background_tasks.discard)
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
