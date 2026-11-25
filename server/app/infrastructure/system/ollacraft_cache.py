import json
import logging
import os
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class OllacraftStatusCache:
    """Keeps the last status received from the bot on disk, so it can still be shown while the bot is offline."""

    def __init__(self, path: str):
        self.path = path

    def save(self, status: Dict[str, Any]) -> None:
        try:
            directory = os.path.dirname(self.path)
            if directory:
                os.makedirs(directory, exist_ok=True)
            # Write then rename: a reader never sees a half-written file
            tmp_path = f"{self.path}.tmp"
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(status, f)
            os.replace(tmp_path, self.path)
        except OSError as e:
            logger.warning("Could not save the ollaCraft status cache: %s", e)

    def load(self) -> Optional[Dict[str, Any]]:
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, ValueError):
            return None
        return data if isinstance(data, dict) else None
