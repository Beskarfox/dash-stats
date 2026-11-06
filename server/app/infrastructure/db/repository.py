from sqlalchemy.orm import Session
from typing import List, Optional
from app.infrastructure.db.models import SystemMetric
from app.domain.models import SystemMetricDomain

class MetricsRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, metric: SystemMetricDomain) -> SystemMetric:
        db_metric = SystemMetric(
            timestamp=metric.timestamp,
            device_name=metric.device_name,
            cpu_temp=metric.cpu_temp,
            cpu_usage=metric.cpu_usage,
            disk_temp=metric.disk_temp,
            disk_sata_temp=metric.disk_sata_temp,
            disk_usage_gb=metric.disk_usage_gb,
            disk_total_gb=metric.disk_total_gb,
            disk_sata_usage_gb=metric.disk_sata_usage_gb,
            disk_sata_total_gb=metric.disk_sata_total_gb,
            ram_usage_mb=metric.ram_usage_mb,
            ram_total_mb=metric.ram_total_mb,
            ram_usage_percent=metric.ram_usage_percent,
            net_rx_mb=metric.net_rx_mb,
            net_tx_mb=metric.net_tx_mb,
            uptime=metric.uptime,
            power_usage_w=metric.power_usage_w,
            power_source=metric.power_source,
            energy_wh=metric.energy_wh,
            disk_services_json=metric.disk_services_json,
            cpu_name=metric.cpu_name,
            ram_services_json=metric.ram_services_json,
            ram_details_json=metric.ram_details_json
        )
        self.db.add(db_metric)
        self.db.commit()
        self.db.refresh(db_metric)
        return db_metric

    def get_latest(self) -> Optional[SystemMetric]:
        return self.db.query(SystemMetric).order_by(SystemMetric.timestamp.desc()).first()

    def get_history(self, limit: int = 100) -> List[SystemMetric]:
        return self.db.query(SystemMetric).order_by(SystemMetric.timestamp.desc()).limit(limit).all()

    def clear_all(self):
        self.db.query(SystemMetric).delete()
        self.db.commit()
