from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict

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


class OllacraftQuest(BaseModel):
    id: str
    amount: int = 1
    done: bool = False
    current: bool = False

class OllacraftPosition(BaseModel):
    x: int
    y: int
    z: int

class OllacraftObjective(BaseModel):
    id: Optional[str] = None
    amount: int = 1
    manual: bool = False
    directive: Optional[str] = None
    sub_goal: Optional[str] = None

class OllacraftAction(BaseModel):
    action: Optional[str] = None
    target: Optional[str] = None
    success: Optional[bool] = None
    message: Optional[str] = None

class OllacraftWaypoint(BaseModel):
    name: str
    x: int
    y: int
    z: int
    dimension: Optional[str] = None

class OllacraftStronghold(BaseModel):
    located: bool = False
    reached: bool = False
    estimate: Optional[OllacraftPosition] = None

class OllacraftEndPortal(BaseModel):
    frame_count: int = 0
    filled_count: int = 0

class OllacraftStatus(BaseModel):
    # False when the bot API cannot be reached (bot stopped, API disabled, wrong key...)
    online: bool
    error: Optional[str] = None
    username: Optional[str] = None
    connected: bool = False
    running: bool = False
    uptime_seconds: Optional[int] = None
    health: Optional[float] = None
    food: Optional[float] = None
    dimension: Optional[str] = None
    position: Optional[OllacraftPosition] = None
    objective: Optional[OllacraftObjective] = None
    quests: List[OllacraftQuest] = []
    inventory: Dict[str, int] = {}
    last_action: Optional[OllacraftAction] = None
    recent_actions: List[OllacraftAction] = []
    decision_source: Optional[str] = None
    milestones: Dict[str, bool] = {}
    waypoints: List[OllacraftWaypoint] = []
    stronghold: Optional[OllacraftStronghold] = None
    end_portal: Optional[OllacraftEndPortal] = None
    advancement: Optional[str] = None
    unlocked_advancements: int = 0
    metrics: Dict[str, int] = {}
    tokens: Dict[str, int] = {}
    updated_at: Optional[str] = None

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

