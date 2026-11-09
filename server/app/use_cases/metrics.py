from sqlalchemy.orm import Session
from app.infrastructure.system.collector import SystemMetricsCollector
from app.infrastructure.db.repository import MetricsRepository
from app.domain.models import SystemMetricDomain

class MetricsUseCases:
    def __init__(self, db: Session):
        self.repository = MetricsRepository(db)

    def collect_and_save(self):
        # Collect system metrics from host
        metric_domain = SystemMetricsCollector.collect()
        # Save to database
        db_metric = self.repository.add(metric_domain)
        return db_metric

    def collect_live(self):
        # Collect live system metrics without saving to DB (no energy accounting)
        return SystemMetricsCollector.collect(track_energy=False)

    def get_latest(self):
        return self.repository.get_latest()

    def get_history(self, limit: int = 100):
        return self.repository.get_history(limit)

    def clear_history(self):
        self.repository.clear_all()
