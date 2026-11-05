"""Backup worker: runs the scheduled and manually requested backups.

It runs as its own container (see docker-compose.yml), separate from the public API: backups need
full access to the Docker socket (`docker exec`, `docker run -v`), which is equivalent to root on
the host, so that access must never live in the Internet-facing process. The API only inserts rows
in `backup_requests`; this worker picks them up.
"""
import os
import sys
import time
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.db_init import init_db
from app.infrastructure.db.models import BackupLog, BackupRequest
from app.infrastructure.system.backup_manager import BackupManager

SERVICES = ["minecraft", "outline", "nextcloud"]

# How often the worker checks for backups requested through the API
REQUEST_POLL_SECONDS = int(os.getenv("BACKUP_REQUEST_POLL_SECONDS", "10"))


def service_limit(service: str) -> int:
    return int(getattr(settings, f"MAX_BACKUPS_{service.upper()}", 0))


def cleanup_zombies():
    """Marks backups left 'running' by a previous worker lifecycle as failed and removes their folder."""
    db = SessionLocal()
    try:
        manager = BackupManager(db)
        zombies = db.query(BackupLog).filter(BackupLog.status == "running").all()
        if zombies:
            print(f"Cleaning up {len(zombies)} zombie running backup entries...")
        for z in zombies:
            z.status = "failed"
            z.error_message = "Interrompu par le redémarrage du serveur"
            if z.timestamp:
                folder_path = os.path.join(manager.backup_root, z.service, z.timestamp.strftime("%Y%m%d_%H%M%S"))
                if os.path.isdir(folder_path):
                    print(f"Physically removing aborted backup folder on startup: {folder_path}")
                    try:
                        import shutil
                        shutil.rmtree(folder_path)
                    except OSError as del_err:
                        print(f"Failed to delete aborted folder {folder_path}: {del_err}")
        db.commit()
    except Exception as e:
        print(f"Error cleaning up zombie backup logs: {e}")
    finally:
        db.close()


def backfill_markers():
    db = SessionLocal()
    try:
        BackupManager(db).backfill_markers()
    except Exception as e:
        print(f"Error writing backup completion markers: {e}")
    finally:
        db.close()


def run_requested_backups():
    """Runs the backups queued through POST /api/backups/run (each service at most once)."""
    db = SessionLocal()
    try:
        requests = db.query(BackupRequest).order_by(BackupRequest.id).all()
        if not requests:
            return
        services = []
        for r in requests:
            if r.service not in services:
                services.append(r.service)
            db.delete(r)
        db.commit()

        manager = BackupManager(db)
        for service in services:
            if service not in SERVICES:
                print(f"Ignoring backup request for unknown service: {service}")
                continue
            if service_limit(service) == 0:
                print(f"Ignoring backup request for {service}: backups disabled (MAX_BACKUPS_{service.upper()}=0)")
                continue
            print(f"Running requested backup for {service}...")
            manager.run_backup(service)
    except Exception as e:
        print(f"Error running requested backups: {e}")
    finally:
        db.close()


def run_scheduled_backups():
    """Runs a backup for each enabled service whose latest backup is missing or too old."""
    db = SessionLocal()
    try:
        manager = BackupManager(db)
        status = manager.get_latest_backups_status()
        for service in SERVICES:
            if service_limit(service) == 0:
                print(f"{service} backups disabled (MAX_BACKUPS_{service.upper()}=0). Skipping.")
                continue

            latest = status[service]["latest_backup"]
            if latest is None:
                print(f"No physical backup found for {service}. Triggering initial backup...")
            else:
                age = (datetime.utcnow() - datetime.fromisoformat(latest["date"])).total_seconds()
                if age < settings.BACKUP_AGE_THRESHOLD_SECONDS:
                    continue
                print(f"Latest backup for {service} is {age / 3600:.1f} hours old. Triggering scheduled backup...")
            manager.run_backup(service)
    except Exception as e:
        print(f"Error inside scheduled backup check: {e}")
    finally:
        db.close()


def main():
    init_db()
    cleanup_zombies()
    backfill_markers()
    print(f"Backup worker started. Scheduled check every {settings.BACKUP_CHECK_INTERVAL_SECONDS}s, "
          f"manual requests polled every {REQUEST_POLL_SECONDS}s.")

    next_scheduled_check = 0.0
    while True:
        run_requested_backups()
        if time.monotonic() >= next_scheduled_check:
            run_scheduled_backups()
            next_scheduled_check = time.monotonic() + settings.BACKUP_CHECK_INTERVAL_SECONDS
        time.sleep(REQUEST_POLL_SECONDS)


if __name__ == "__main__":
    main()
