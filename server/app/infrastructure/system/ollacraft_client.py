import json
import urllib.error
import urllib.request
from typing import Any, Dict


class OllacraftClient:
    """Reads the status of the ollaCraft bot from its read-only HTTP API (GET /status)."""

    def __init__(self, base_url: str, api_key: str, timeout: float = 2.5):
        self.base_url = (base_url or "").rstrip("/")
        self.api_key = api_key
        self.timeout = timeout

    @staticmethod
    def _offline(error: str) -> Dict[str, Any]:
        return {"online": False, "error": error}

    def fetch_status(self) -> Dict[str, Any]:
        if not self.base_url:
            return self._offline("OLLACRAFT_API_URL is not configured")
        if not self.api_key:
            return self._offline("OLLACRAFT_API_KEY is not configured")

        request = urllib.request.Request(
            f"{self.base_url}/status",
            headers={"X-API-Key": self.api_key, "Accept": "application/json"},
            method="GET",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code in (401, 403):
                return self._offline("Bot API rejected the API key")
            return self._offline(f"Bot API returned HTTP {e.code}")
        except (urllib.error.URLError, TimeoutError, OSError):
            # Do not echo the exception: it contains the internal host and port
            return self._offline("Bot API unreachable")
        except ValueError:
            return self._offline("Bot API returned an invalid response")

        if not isinstance(payload, dict):
            return self._offline("Bot API returned an invalid response")

        payload["online"] = bool(payload.get("connected"))
        return payload
