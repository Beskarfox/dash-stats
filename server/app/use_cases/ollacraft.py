from datetime import datetime, timezone
from typing import Any, Dict

from app.infrastructure.system.ollacraft_cache import OllacraftStatusCache
from app.infrastructure.system.ollacraft_client import OllacraftClient


class OllacraftUseCases:
    def __init__(self, client: OllacraftClient, cache: OllacraftStatusCache):
        self.client = client
        self.cache = cache

    def get_status(self) -> Dict[str, Any]:
        """
        Live status of the bot while it is connected. When it is not (stopped, API unreachable, not yet
        connected), the last status received is returned flagged as stale, so its progress stays visible.
        """
        status = self.client.fetch_status()
        if status.get("online"):
            status["last_seen"] = datetime.now(timezone.utc).isoformat()
            self.cache.save(status)
            return status

        last = self.cache.load()
        if not last:
            return status

        # Live-only fields no longer hold: keep the progress, drop what claims the bot is active
        return {
            **last,
            "online": False,
            "stale": True,
            "connected": False,
            "running": False,
            "uptime_seconds": None,
            "error": status.get("error"),
        }
