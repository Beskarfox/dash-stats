from datetime import datetime
from typing import Optional

class SystemMetricDomain:
    def __init__(
        self,
        id: Optional[int] = None,
        timestamp: Optional[datetime] = None,
        device_name: str = "host-machine",
        cpu_temp: float = 0.0,
        cpu_usage: float = 0.0,
        disk_temp: float = 0.0,
        disk_sata_temp: float = 0.0,
        disk_usage_gb: float = 0.0,
        disk_total_gb: float = 0.0,
        disk_sata_usage_gb: float = 0.0,
        disk_sata_total_gb: float = 0.0,
        ram_usage_mb: float = 0.0,
        ram_total_mb: float = 0.0,
        ram_usage_percent: float = 0.0,
        net_rx_mb: float = 0.0,
        net_tx_mb: float = 0.0,
        uptime: str = "unknown",
        power_usage_w: Optional[float] = None,
        power_source: Optional[str] = None,
        energy_wh: Optional[float] = None,
        disk_services_json: Optional[str] = None,
        cpu_name: Optional[str] = None,
        ram_services_json: Optional[str] = None
    ):
        self.id = id
        self.timestamp = timestamp or datetime.utcnow()
        self.device_name = device_name
        self.cpu_temp = cpu_temp
        self.cpu_usage = cpu_usage
        self.disk_temp = disk_temp
        self.disk_sata_temp = disk_sata_temp
        self.disk_usage_gb = disk_usage_gb
        self.disk_total_gb = disk_total_gb
        self.disk_sata_usage_gb = disk_sata_usage_gb
        self.disk_sata_total_gb = disk_sata_total_gb
        self.ram_usage_mb = ram_usage_mb
        self.ram_total_mb = ram_total_mb
        self.ram_usage_percent = ram_usage_percent
        self.net_rx_mb = net_rx_mb
        self.net_tx_mb = net_tx_mb
        self.uptime = uptime
        self.power_usage_w = power_usage_w
        self.power_source = power_source
        self.energy_wh = energy_wh
        self.disk_services_json = disk_services_json
        self.cpu_name = cpu_name
        self.ram_services_json = ram_services_json


class BackupLogDomain:
    def __init__(
        self,
        id: Optional[int] = None,
        service: str = "",
        timestamp: Optional[datetime] = None,
        status: str = "running",
        size_bytes: int = 0,
        files_json: Optional[str] = None,
        error_message: Optional[str] = None
    ):
        self.id = id
        self.service = service
        self.timestamp = timestamp or datetime.utcnow()
        self.status = status
        self.size_bytes = size_bytes
        self.files_json = files_json
        self.error_message = error_message
