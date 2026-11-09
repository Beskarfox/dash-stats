from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import secrets
from app.core.database import get_db
from app.interfaces.api import schemas
from app.use_cases.metrics import MetricsUseCases
from app.domain.models import SystemMetricDomain
from app.core.config import settings
from app.infrastructure.system.minecraft_pinger import MinecraftPinger
from app.infrastructure.system.backup_manager import BackupManager

router = APIRouter()

async def verify_api_key(x_api_key: str = Header(...)):
    # Constant-time comparison against the key from settings (validated at startup)
    if not secrets.compare_digest(x_api_key.encode(), settings.API_KEY.encode()):
        raise HTTPException(status_code=403, detail="Could not validate credentials")
    return x_api_key

# Manual metrics submission (useful for testing or backwards compatibility)
@router.post("/metrics", response_model=schemas.SystemMetric)
def create_metric(metric: schemas.SystemMetricCreate, db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    use_cases = MetricsUseCases(db)
    # Map every field of the schema (disk_sata_*, disk_services_json, cpu_name...) to the domain model.
    metric_domain = SystemMetricDomain(**metric.model_dump())
    return use_cases.repository.add(metric_domain)

@router.get("/metrics", response_model=List[schemas.SystemMetric])
def read_metrics(limit: int = Query(100, ge=1, le=10000), db: Session = Depends(get_db)):
    use_cases = MetricsUseCases(db)
    return use_cases.get_history(limit)

@router.get("/metrics/latest", response_model=schemas.SystemMetric)
def read_latest_metric(db: Session = Depends(get_db)):
    use_cases = MetricsUseCases(db)
    
    # Return last known state from DB immediately for instant page loads (< 1ms)
    metric = use_cases.get_latest()
    if metric is not None:
        return metric

    # Fallback to live collection if DB is completely empty (e.g. first run)
    try:
        return use_cases.collect_live()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to collect live metrics and no metrics in database: {str(e)}")

@router.post("/metrics/collect", response_model=schemas.SystemMetric)
def force_collect(db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    use_cases = MetricsUseCases(db)
    try:
        return use_cases.collect_and_save()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to collect metrics: {str(e)}")

@router.post("/metrics/reset")
def reset_metrics(db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    use_cases = MetricsUseCases(db)
    try:
        use_cases.clear_history()
        return {"status": "success", "message": "All metrics data has been cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear metrics: {str(e)}")

@router.get("/devices", response_model=List[str])
def read_devices(db: Session = Depends(get_db)):
    use_cases = MetricsUseCases(db)
    latest = use_cases.get_latest()
    if latest:
        return [latest.device_name]
    from app.infrastructure.system.collector import SystemMetricsCollector
    return [SystemMetricsCollector.get_hostname()]

@router.get("/minecraft", response_model=schemas.MinecraftStatus)
def read_minecraft_status():
    pinger = MinecraftPinger(
        host=settings.MINECRAFT_HOST,
        port=settings.MINECRAFT_PORT,
        log_path=settings.MINECRAFT_LOG_PATH
    )
    status = pinger.ping()
    logs = pinger.get_logs(max_lines=100)
    status["logs"] = logs
    return status

@router.get("/backups", response_model=schemas.BackupsStatusResponse)
def read_backups_status(db: Session = Depends(get_db)):
    manager = BackupManager(db)
    return manager.get_latest_backups_status()

@router.get("/backups/history", response_model=List[schemas.BackupLogResponse])
def read_backups_history(db: Session = Depends(get_db)):
    manager = BackupManager(db)
    return manager.get_backup_history()

@router.post("/backups/run")
def trigger_backup(request: schemas.BackupTriggerRequest, db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    # Backups are run by the separate backup worker (it alone has full Docker socket access):
    # this endpoint only queues a request that the worker picks up within a few seconds.
    from app.infrastructure.db.models import BackupRequest
    service_limits = {
        "minecraft": settings.MAX_BACKUPS_MINECRAFT,
        "outline": settings.MAX_BACKUPS_OUTLINE,
        "nextcloud": settings.MAX_BACKUPS_NEXTCLOUD,
    }
    if request.service == "all":
        services = [s for s in ["minecraft", "outline", "nextcloud"] if service_limits.get(s, 1) != 0]
    else:
        if request.service not in ["minecraft", "outline", "nextcloud"]:
            raise HTTPException(status_code=400, detail=f"Invalid service name: {request.service}")
        if service_limits.get(request.service, 1) == 0:
            raise HTTPException(status_code=400, detail=f"{request.service} backups are disabled (MAX_BACKUPS_{request.service.upper()}=0)")
        services = [request.service]

    for s in services:
        db.add(BackupRequest(service=s))
    db.commit()
    if request.service == "all":
        return {"status": "success", "message": "Backups queued for all services"}
    return {"status": "success", "message": f"Backup queued for {request.service}"}
