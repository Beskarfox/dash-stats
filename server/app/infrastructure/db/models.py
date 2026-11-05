from sqlalchemy import Column, Integer, Float, String, DateTime
from datetime import datetime
from app.core.database import Base

class SystemMetric(Base):
    __tablename__ = "system_metrics"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    device_name = Column(String, default="default", index=True)
    cpu_temp = Column(Float)
    cpu_usage = Column(Float)
    disk_temp = Column(Float)
    disk_sata_temp = Column(Float, default=0.0)
    disk_usage_gb = Column(Float)
    disk_total_gb = Column(Float)
    disk_sata_usage_gb = Column(Float)
    disk_sata_total_gb = Column(Float)
    ram_usage_mb = Column(Float)
    ram_total_mb = Column(Float)
    ram_usage_percent = Column(Float)
    net_rx_mb = Column(Float)
    net_tx_mb = Column(Float)
    uptime = Column(String)
    # Measured power (RAPL), NULL when no measurement is available. Rows without power_source
    # predate real measurements and hold estimated values.
    power_usage_w = Column(Float, nullable=True)
    power_source = Column(String, nullable=True)
    energy_wh = Column(Float, nullable=True)
    disk_services_json = Column(String, nullable=True)
    cpu_name = Column(String, nullable=True)
    ram_services_json = Column(String, nullable=True)


class BackupLog(Base):
    __tablename__ = "backup_logs"

    id = Column(Integer, primary_key=True, index=True)
    service = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String)
    size_bytes = Column(Integer, default=0)
    files_json = Column(String, nullable=True)
    error_message = Column(String, nullable=True)


class BackupRequest(Base):
    """Manual backup requested through the API, picked up by the separate backup worker."""
    __tablename__ = "backup_requests"

    id = Column(Integer, primary_key=True, index=True)
    service = Column(String, index=True)
    requested_at = Column(DateTime, default=datetime.utcnow)
