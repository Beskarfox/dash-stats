from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class SystemMetricBase(BaseModel):
    device_name: Optional[str] = "default"
    cpu_temp: float
    cpu_usage: float
    disk_temp: float
    disk_sata_temp: Optional[float] = 0.0
    disk_usage_gb: float
    disk_total_gb: float
    disk_sata_usage_gb: Optional[float] = 0.0
    disk_sata_total_gb: Optional[float] = 0.0
    ram_usage_mb: float
    ram_total_mb: float
    ram_usage_percent: float
    net_rx_mb: float
    net_tx_mb: float
    uptime: str
    power_usage_w: Optional[float] = None
    power_source: Optional[str] = None  # "rapl-psys" / "rapl-package"; None = no real measurement
    energy_wh: Optional[float] = None   # measured energy since the previous saved collection
    disk_services_json: Optional[str] = None
    cpu_name: Optional[str] = None
    ram_services_json: Optional[str] = None
    ram_details_json: Optional[str] = None

class SystemMetricCreate(SystemMetricBase):
    pass

class SystemMetric(SystemMetricBase):
    id: Optional[int] = 0
    timestamp: datetime

    class Config:
        from_attributes = True

class SataDiskStats(BaseModel):
    temp_c: float
    usage_gb: float
    total_gb: float
    free_gb: float
    usage_percent: float
    timestamp: datetime

class MinecraftStatus(BaseModel):
    online: bool
    version: Optional[str] = None
    players_online: int = 0
    players_max: int = 0
    players_list: List[str] = []
    latency_ms: Optional[float] = None
    motd: Optional[str] = None
    favicon: Optional[str] = None
    logs: List[str] = []
    uptime: Optional[str] = None


class BackupItem(BaseModel):
    folder: str
    date: str
    size_bytes: int
    files: List[str]

class BackupServiceStatus(BaseModel):
    latest_backup: Optional[BackupItem] = None
    total_backups_count: int
    max_backups: int = 0

class BackupsStatusResponse(BaseModel):
    minecraft: BackupServiceStatus
    outline: BackupServiceStatus
    nextcloud: BackupServiceStatus

class BackupLogResponse(BaseModel):
    id: int
    service: str
    timestamp: str
    status: str
    size_bytes: int
    progress_pct: Optional[int] = 100
    files: List[str]
    error_message: Optional[str] = None

class BackupTriggerRequest(BaseModel):
    service: str

