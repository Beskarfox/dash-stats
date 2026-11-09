import socket
import struct
import json
import os
import time
import re
from collections import deque
from typing import Dict, Any, List

# Player IP addresses in Paper logs, e.g. "Steve[/203.0.113.7:51234] logged in" (IPv4 or IPv6).
_PLAYER_ADDRESS_RE = re.compile(r"\[/[^\]\s]*\]?[^\]\s]*\]")
_IPV4_RE = re.compile(r"\b\d{1,3}(?:\.\d{1,3}){3}(?::\d{1,5})?\b")

def mask_ips(line: str) -> str:
    """Hides IP addresses so the public /api/minecraft endpoint does not leak players' IPs."""
    line = _PLAYER_ADDRESS_RE.sub("[/***]", line)
    return _IPV4_RE.sub("***", line)

class MinecraftPinger:
    def __init__(self, host: str = "minecraft-paper", port: int = 25565, log_path: str = "/opt/minecraft/data/logs/latest.log"):
        self.host = host
        self.port = port
        self.log_path = log_path

    def get_docker_uptime(self) -> str:
        import subprocess
        try:
            result = subprocess.run(
                ["docker", "ps", "--filter", "name=minecraft", "--format", "{{.Status}}"],
                capture_output=True, text=True, timeout=2
            )
            if result.returncode == 0 and result.stdout.strip():
                status = result.stdout.strip().split('\n')[0]
                if status.startswith("Up "):
                    return status.replace("Up ", "")
        except Exception:
            pass
        return None

    def _read_var_int(self, sock: socket.socket) -> int:
        i = 0
        j = 0
        while True:
            k = sock.recv(1)
            if not k:
                return 0
            k = k[0]
            i |= (k & 0x7f) << (j * 7)
            j += 1
            if j > 5:
                raise ValueError('var_int too big')
            if not (k & 0x80):
                return i

    def ping(self) -> Dict[str, Any]:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2.5)  # 2.5 seconds timeout
        try:
            start_time = time.time()
            sock.connect((self.host, self.port))
            latency_ms = round((time.time() - start_time) * 1000, 1)
            
            host_bytes = self.host.encode('utf-8')
            # Packet ID 0x00: Handshake
            data = b'\x00'
            # Protocol variant (4 is standard for 1.7.2+)
            data += b'\x04'
            # Server address Length + address
            data += struct.pack('>b', len(host_bytes)) + host_bytes
            # Server port
            data += struct.pack('>H', self.port)
            # Next state (1 for status)
            data += b'\x01'
            # Prepend overall length of handshake packet
            data = struct.pack('>b', len(data)) + data
            
            # Send Handshake and Status Request (Packet ID 0x00 in status state, length 1)
            sock.sendall(data + b'\x01\x00')
            
            length = self._read_var_int(sock)
            if length < 0:
                raise ValueError('negative length read')
                
            packet_type = sock.recv(1)  # should be 0x00 for response
            
            length = self._read_var_int(sock)  # JSON string length
            json_data = b''
            while len(json_data) != length:
                chunk = sock.recv(length - len(json_data))
                if not chunk:
                    raise ValueError('connection aborted')
                json_data += chunk
                
            response = json.loads(json_data.decode('utf-8'))
            
            players_data = response.get('players', {})
            players_list = [p['name'] for p in players_data.get('sample', [])] if 'sample' in players_data else []
            
            # Extract description text (MOTD)
            description = response.get('description', '')
            if isinstance(description, dict):
                description = description.get('text', '')
                
            return {
                "online": True,
                "version": response.get('version', {}).get('name', 'Unknown'),
                "players_online": players_data.get('online', 0),
                "players_max": players_data.get('max', 0),
                "players_list": players_list,
                "latency_ms": latency_ms,
                "motd": description,
                "favicon": response.get('favicon'),
                "uptime": self.get_docker_uptime()
            }
        except Exception as e:
            return {
                "online": False,
                "version": None,
                "players_online": 0,
                "players_max": 0,
                "players_list": [],
                "latency_ms": None,
                "motd": None,
                "favicon": None,
                "uptime": None,
                "error": str(e)
            }
        finally:
            sock.close()

    def get_logs(self, max_lines: int = 100) -> List[str]:
        path_to_read = self.log_path
        if not os.path.exists(path_to_read):
            # Try a default relative path or check dev environment fallback
            alt_path = "./data/minecraft_latest.log"
            if os.path.exists(alt_path):
                path_to_read = alt_path
            else:
                return [f"Minecraft log file not found at {self.log_path}"]

        try:
            # Read a larger buffer (e.g. 500 lines) to account for filtered out commands and empty lines
            with open(path_to_read, "r", encoding="utf-8", errors="ignore") as f:
                raw_lines = deque(f, 500)
                filtered_lines = []
                for line in raw_lines:
                    cleaned = line.strip()
                    if not cleaned:
                        continue
                    # Hide 'issued server command' logs as requested
                    if "issued server command" in cleaned.lower():
                        continue
                    cleaned = cleaned.replace("[Not Secure] ", "")
                    cleaned = mask_ips(cleaned)
                    filtered_lines.append(cleaned)
                
                # Return the last max_lines
                return filtered_lines[-max_lines:]
        except Exception as e:
            return [f"Error reading log file: {str(e)}"]
