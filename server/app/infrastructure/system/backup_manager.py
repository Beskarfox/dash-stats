import os
import shutil
import time
import subprocess
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
import os
from sqlalchemy.orm import Session
from app.core.config import settings
from app.infrastructure.db.backup_repository import BackupLogsRepository
from app.domain.models import BackupLogDomain

class BackupManager:
    _active_backups = set()

    # Margin applied to the size of the latest backup when estimating the space a new one needs
    SPACE_MARGIN = 1.1

    # Empty file written in every backup folder once the backup has succeeded. It makes a folder
    # recognisable as a valid backup even if the SQLite database (backup_logs) is lost or reset.
    COMPLETE_MARKER = ".backup_complete"

    def __init__(self, db: Session, backup_root: str = "/mnt/ssdsata/backups"):
        self.db = db
        self.backup_root = backup_root
        self.repo = BackupLogsRepository(db)

    def _successful_folders(self, service: str) -> set:
        from app.infrastructure.db.models import BackupLog
        logs = self.db.query(BackupLog).filter(
            BackupLog.service == service,
            BackupLog.status == "success"
        ).all()
        return {log.timestamp.strftime("%Y%m%d_%H%M%S") for log in logs if log.timestamp}

    def _failed_folders(self, service: str) -> set:
        from app.infrastructure.db.models import BackupLog
        logs = self.db.query(BackupLog).filter(
            BackupLog.service == service,
            BackupLog.status == "failed"
        ).all()
        return {log.timestamp.strftime("%Y%m%d_%H%M%S") for log in logs if log.timestamp}

    def _is_complete(self, dir_path: str) -> bool:
        return os.path.isfile(os.path.join(dir_path, self.COMPLETE_MARKER))

    def _mark_complete(self, dir_path: str):
        open(os.path.join(dir_path, self.COMPLETE_MARKER), "w").close()

    def backfill_markers(self):
        """Writes the completion marker in backup folders that the DB knows as successful but
        that predate the marker, so they stay recognised if the DB is ever lost."""
        for service in ["minecraft", "outline", "nextcloud"]:
            service_dir = os.path.join(self.backup_root, service)
            if not os.path.isdir(service_dir):
                continue
            for name in self._successful_folders(service):
                dir_path = os.path.join(service_dir, name)
                if os.path.isdir(dir_path) and not self._is_complete(dir_path):
                    try:
                        self._mark_complete(dir_path)
                    except OSError as e:
                        print(f"Could not write completion marker in {dir_path}: {e}")

    def get_backup_history(self) -> List[Dict[str, Any]]:
        """Returns a list of all backup logs from the database with progress percentage."""
        logs = self.repo.get_all(limit=50)
        
        last_success_sizes = {}
        for l in logs:
            if l.status == "success" and l.service not in last_success_sizes and l.size_bytes:
                last_success_sizes[l.service] = l.size_bytes

        result = []
        for log in logs:
            size_bytes = log.size_bytes or 0
            progress_pct = 100 if log.status == "success" else 0

            if log.status == "running":
                try:
                    if log.timestamp:
                        folder_str = log.timestamp.strftime("%Y%m%d_%H%M%S")
                        target_dir = os.path.join(self.backup_root, log.service, folder_str)
                        if os.path.exists(target_dir):
                            current_size = 0
                            for root, dirs, files in os.walk(target_dir):
                                for f in files:
                                    current_size += os.path.getsize(os.path.join(root, f))
                            size_bytes = current_size
                            ref_size = last_success_sizes.get(log.service, 0)
                            if ref_size > 0:
                                progress_pct = min(99, int((current_size / ref_size) * 100))
                            else:
                                progress_pct = 50
                except Exception:
                    pass

            result.append({
                "id": log.id,
                "service": log.service,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "status": log.status,
                "size_bytes": size_bytes,
                "progress_pct": progress_pct,
                "files": json.loads(log.files_json) if log.files_json else [],
                "error_message": log.error_message
            })
        return result

    def get_latest_backups_status(self) -> Dict[str, Any]:
        """Scans the backup directory physically and returns metadata for each service."""
        services = ["minecraft", "outline", "nextcloud"]
        status = {}

        for service in services:
            latest_db_log = self.repo.get_latest_for_service(service)
            service_dir = os.path.join(self.backup_root, service)
            
            # A folder is a valid backup if it carries the completion marker, or if the DB
            # knows it as successful (backups made before the marker existed).
            successful_folders = self._successful_folders(service)

            # Find physically existing backups on disk
            physical_backups = []
            if os.path.exists(service_dir):
                for name in os.listdir(service_dir):
                    dir_path = os.path.join(service_dir, name)
                    if os.path.isdir(dir_path):
                        # Ignore folders that are not valid backups (failed, interrupted or in progress)
                        if name not in successful_folders and not self._is_complete(dir_path):
                            continue

                        # Calculate folder size and list files
                        size = 0
                        files = []
                        for f in os.listdir(dir_path):
                            fp = os.path.join(dir_path, f)
                            if f != self.COMPLETE_MARKER and os.path.isfile(fp):
                                size += os.path.getsize(fp)
                                files.append(f)
                        
                        try:
                            # Parse directory name (format: YYYYMMDD_HHMMSS)
                            dt = datetime.strptime(name, "%Y%m%d_%H%M%S")
                            physical_backups.append({
                                "folder": name,
                                "date": dt.isoformat(),
                                "size_bytes": size,
                                "files": files
                            })
                        except ValueError:
                            continue

            # Sort physical backups by date descending
            physical_backups.sort(key=lambda x: x["folder"], reverse=True)

            status[service] = {
                "latest_backup": physical_backups[0] if physical_backups else None,
                "total_backups_count": len(physical_backups),
                "max_backups": int(getattr(settings, f"MAX_BACKUPS_{service.upper()}", 0)),
                "db_status": {
                    "status": latest_db_log.status if latest_db_log else "unknown",
                    "timestamp": latest_db_log.timestamp.isoformat() if latest_db_log and latest_db_log.timestamp else None,
                    "error_message": latest_db_log.error_message if latest_db_log else None
                } if latest_db_log else None
            }

        return status

    def run_backup(self, service: str) -> Dict[str, Any]:
        """Runs the backup for a specific service and logs the status in the DB."""
        if service not in ["minecraft", "outline", "nextcloud"]:
            return {"status": "failed", "error": f"Unknown service: {service}"}

        # Prevent concurrent duplicate executions of the same service backup
        if service in self._active_backups:
            print(f"Backup for {service} is already running. Skipping duplicate run.")
            return {"status": "skipped", "message": f"Backup for {service} is already running."}

        self._active_backups.add(service)

        # Everything after marking the service active runs inside try/finally, so that an
        # error at any step (DB log, cleanup, mkdir...) always releases the service and
        # never leaves a log stuck in 'running'.
        log_id = None
        target_dir = None
        try:
            # 1. Capture the exact timestamp for both DB and folder name
            now = datetime.utcnow()
            timestamp_str = now.strftime("%Y%m%d_%H%M%S")

            # 2. Create a DB log entry with status 'running'
            log_domain = BackupLogDomain(
                service=service,
                status="running",
                timestamp=now
            )
            db_log = self.repo.add(log_domain)
            log_id = db_log.id

            # 3. Before creating the new backup: enforce the retention limit and, only if the
            #    disk is too small to hold the new backup next to the existing ones, delete the
            #    oldest backups of this service to make room.
            self._cleanup_old_backups(service, reserve_space=True)

            # Create target folder path
            target_dir = os.path.join(self.backup_root, service, timestamp_str)
            os.makedirs(target_dir, exist_ok=True)
            
            # 2. Execute backup commands
            if service == "outline":
                self._backup_outline(target_dir, timestamp_str)
            elif service == "nextcloud":
                self._backup_nextcloud(target_dir, timestamp_str)
            elif service == "minecraft":
                self._backup_minecraft(target_dir, timestamp_str)

            # 3. Calculate size and files list
            size_bytes = 0
            files = []
            for f in os.listdir(target_dir):
                fp = os.path.join(target_dir, f)
                if os.path.isfile(fp):
                    size_bytes += os.path.getsize(fp)
                    files.append(f)

            # 4. Mark the folder as a complete backup, then update DB log to 'success'
            self._mark_complete(target_dir)
            self.repo.update(
                log_id=log_id,
                status="success",
                size_bytes=size_bytes,
                files_json=json.dumps(files)
            )

            # 5. Clean up older backups (keep limit)
            self._cleanup_old_backups(service)

            return {
                "status": "success",
                "service": service,
                "timestamp": timestamp_str,
                "size_bytes": size_bytes,
                "files": files
            }

        except Exception as e:
            error_msg = str(e)
            print(f"Error during backup of {service}: {error_msg}")
            
            # Update DB log to 'failed' (if it was created). A failed DB write may have left
            # the session unusable, so roll back first; never let this mask the original error.
            if log_id is not None:
                try:
                    self.db.rollback()
                    self.repo.update(
                        log_id=log_id,
                        status="failed",
                        error_message=error_msg
                    )
                except Exception as db_err:
                    print(f"Could not mark backup log {log_id} as failed: {db_err}")

            # Clean up target directory if empty or failed
            try:
                if target_dir and os.path.exists(target_dir) and not os.listdir(target_dir):
                    os.rmdir(target_dir)
            except OSError:
                pass

            return {"status": "failed", "service": service, "error": error_msg}

        finally:
            self._active_backups.discard(service)

    def _backup_outline(self, target_dir: str, date_str: str):
        # 1. Database dump
        db_file = os.path.join(target_dir, f"outline_db_{date_str}.sql")
        with open(db_file, "w") as f:
            # We redirect standard output of the docker exec pg_dump command to the sql file
            res = subprocess.run(
                ["docker", "exec", "outline-postgres-1", "pg_dump", "-U", "postgres", "outline"],
                stdout=f,
                stderr=subprocess.PIPE,
                text=True
            )
            if res.returncode != 0:
                raise Exception(f"PostgreSQL pg_dump failed: {res.stderr}")

        # 2. Config files backup
        config_tar = os.path.join(target_dir, f"outline_config_{date_str}.tar.gz")
        res = subprocess.run([
            "tar", "--exclude=./data", "-czf", config_tar, "-C", "/opt/outline", "."
        ], capture_output=True, text=True)
        if res.returncode != 0:
            raise Exception(f"Outline config compression failed: {res.stderr}")

        # 3. Storage volume backup
        volume_tar = os.path.join(target_dir, f"outline_volume_storage_{date_str}.tar.gz")
        res = subprocess.run([
            "docker", "run", "--rm",
            "-v", "outline_storage-data:/volume",
            "-v", f"{target_dir}:/backup",
            "alpine", "tar", "-czf", f"/backup/outline_volume_storage_{date_str}.tar.gz", "-C", "/volume", "."
        ], capture_output=True, text=True)
        if res.returncode != 0:
            raise Exception(f"Outline volume backup container failed: {res.stderr}")

    def _backup_nextcloud(self, target_dir: str, date_str: str):
        # 1. Database dump
        db_user = settings.NEXTCLOUD_DB_USER
        db_password = settings.NEXTCLOUD_DB_PASSWORD
        if not db_user or not db_password:
            raise Exception("NEXTCLOUD_DB_USER and NEXTCLOUD_DB_PASSWORD must be set to back up Nextcloud")

        db_file = os.path.join(target_dir, f"nextcloud_db_{date_str}.sql")
        with open(db_file, "w") as f:
            # The password goes through the environment (`-e MYSQL_PWD` without a value copies it
            # from the docker CLI's env), so it never appears on a command line visible in `ps`.
            res = subprocess.run([
                "docker", "exec", "-e", "MYSQL_PWD", "nextcloud-db", "mysqldump", "-u", db_user, "nextcloud"
            ], stdout=f, stderr=subprocess.PIPE, text=True, env={**os.environ, "MYSQL_PWD": db_password})
            if res.returncode != 0:
                raise Exception(f"MariaDB mysqldump failed: {res.stderr}")

        # 2. Config & Data files backup (excluding only the database mount to avoid active locks)
        # We use a plain tar archive (no gzip compression) to process 60GB of media files quickly without CPU overhead.
        config_tar = os.path.join(target_dir, f"nextcloud_config_{date_str}.tar")
        res = subprocess.run([
            "tar", "--exclude=./db",
            "-cf", config_tar, "-C", "/opt/nextcloud", "."
        ], capture_output=True, text=True)
        if res.returncode != 0:
            raise Exception(f"Nextcloud config compression failed: {res.stderr}")

    def _backup_minecraft(self, target_dir: str, date_str: str):
        # 1. Tell Minecraft to save-off and save-all (best effort, ignored if offline)
        subprocess.run(["docker", "exec", "minecraft-paper", "rcon-cli", "save-off"], capture_output=True, text=True)
        subprocess.run(["docker", "exec", "minecraft-paper", "rcon-cli", "save-all", "flush"], capture_output=True, text=True)

        try:
            # 2. Backup Minecraft data files
            data_tar = os.path.join(target_dir, f"minecraft_data_{date_str}.tar.gz")
            res = subprocess.run([
                "tar", "-czf", data_tar, "-C", "/opt/minecraft", "."
            ], capture_output=True, text=True)
            if res.returncode != 0:
                raise Exception(f"Minecraft data compression failed: {res.stderr}")
        finally:
            # 3. Tell Minecraft to save-on
            subprocess.run(["docker", "exec", "minecraft-paper", "rcon-cli", "save-on"], capture_output=True, text=True)

    def _cleanup_old_backups(self, service: str, reserve_space: bool = False):
        """Keeps only a fixed number of recent backups to prevent disk saturation on small drives."""
        service_dir = os.path.join(self.backup_root, service)
        if not os.path.exists(service_dir):
            return

        successful_folders = self._successful_folders(service)
        failed_folders = self._failed_folders(service)

        # Find folders
        folders = []
        for name in os.listdir(service_dir):
            dir_path = os.path.join(service_dir, name)
            if os.path.isdir(dir_path):
                try:
                    # Verify it matches the date format YYYYMMDD_HHMMSS
                    datetime.strptime(name, "%Y%m%d_%H%M%S")
                    if self._is_complete(dir_path) or name in successful_folders:
                        folders.append((name, dir_path))
                    elif name in failed_folders:
                        # Only delete folders the DB explicitly knows as failed
                        print(f"Deleting failed backup directory: {dir_path}")
                        shutil.rmtree(dir_path)
                    else:
                        # Unknown folder (in progress, or DB lost/reset): never delete it automatically
                        print(f"Keeping unknown backup directory (not in DB, no completion marker): {dir_path}")
                except ValueError:
                    continue

        # Sort folders by name descending (newest first)
        folders.sort(key=lambda x: x[0], reverse=True)

        # Define limits from environment variables with safe defaults
        limit = 3
        if service == "nextcloud":
            limit = int(os.environ.get("MAX_BACKUPS_NEXTCLOUD", 1))
        elif service == "minecraft":
            limit = int(os.environ.get("MAX_BACKUPS_MINECRAFT", 3))
        elif service == "outline":
            limit = int(os.environ.get("MAX_BACKUPS_OUTLINE", 5))

        # Delete folders exceeding the limit
        if len(folders) > limit:
            for name, dir_path in folders[limit:]:
                print(f"Cleaning up old backup exceeding limit ({limit}): {dir_path}")
                shutil.rmtree(dir_path)
            folders = folders[:limit]

        if reserve_space:
            self._free_space_for_new_backup(service, folders)

    def _free_space_for_new_backup(self, service: str, folders: List[tuple]):
        """Deletes the oldest backups of `service` only while the disk lacks room for a new one.

        The space needed is estimated from the size of the latest backup (plus a margin), so
        existing backups are kept whenever the disk can hold one more. `folders` is the list of
        (name, path) of successful backups, newest first.
        """
        if not folders:
            return

        needed = int(self._dir_size(folders[0][1]) * self.SPACE_MARGIN)
        free = shutil.disk_usage(self.backup_root).free
        if free >= needed:
            return

        print(f"Not enough space for a new {service} backup: {free} bytes free, ~{needed} bytes needed.")
        while folders and free < needed:
            name, dir_path = folders.pop()  # oldest first
            if not folders:
                print(f"WARNING: deleting the last remaining {service} backup to make room: {dir_path}. "
                      f"If the new backup fails, no {service} backup will be left.")
            else:
                print(f"Deleting old backup to free space: {dir_path}")
            shutil.rmtree(dir_path)
            free = shutil.disk_usage(self.backup_root).free

        if free < needed:
            print(f"WARNING: still not enough space for the {service} backup "
                  f"({free} bytes free, ~{needed} bytes needed); trying anyway.")

    @staticmethod
    def _dir_size(path: str) -> int:
        total = 0
        for root, _, files in os.walk(path):
            for f in files:
                fp = os.path.join(root, f)
                if not os.path.islink(fp):
                    total += os.path.getsize(fp)
        return total
