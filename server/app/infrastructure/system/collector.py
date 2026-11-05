import os
import time
import platform
import socket
import re
from datetime import datetime
import psutil
from app.core.config import settings
from app.domain.models import SystemMetricDomain

class SystemMetricsCollector:
    @staticmethod
    def get_dir_size(path: str) -> float:
        total_size = 0
        try:
            if os.path.exists(path):
                for dirpath, dirnames, filenames in os.walk(path):
                    for f in filenames:
                        fp = os.path.join(dirpath, f)
                        if not os.path.islink(fp):
                            total_size += os.path.getsize(fp)
        except Exception:
            pass
        return round(total_size / (1024 ** 3), 1)

    @staticmethod
    def get_cpu_name() -> str:
        try:
            if platform.system() == "Windows":
                import winreg
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
                name = winreg.QueryValueEx(key, "ProcessorNameString")[0]
                return name.strip()
            elif platform.system() == "Linux":
                if os.path.exists("/proc/cpuinfo"):
                    with open("/proc/cpuinfo", "r") as f:
                        for line in f:
                            if "model name" in line:
                                return line.split(":")[1].strip()
        except Exception:
            pass
        return platform.processor() or ""

    @staticmethod
    def query_docker_socket(path: str):
        import socket
        import json
        import os
        socket_path = "/var/run/docker.sock"
        if not os.path.exists(socket_path):
            return None
        try:
            s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            s.settimeout(10.0)
            s.connect(socket_path)
            request = f"GET {path} HTTP/1.0\r\nHost: localhost\r\n\r\n"
            s.sendall(request.encode('utf-8'))
            
            response = b""
            while True:
                data = s.recv(4096)
                if not data:
                    break
                response += data
            
            parts = response.split(b"\r\n\r\n", 1)
            if len(parts) < 2:
                return None
            return json.loads(parts[1].decode('utf-8'))
        except Exception:
            return None
        finally:
            try:
                s.close()
            except Exception:
                pass

    @staticmethod
    def get_container_mem_usage(container_id: str) -> float:
        import os
        # Try cgroups v2
        v2_path = f"/sys/fs/cgroup/system.slice/docker-{container_id}.scope/memory.current"
        if os.path.exists(v2_path):
            try:
                with open(v2_path, "r") as f:
                    return float(f.read().strip())
            except Exception:
                pass
        # Try cgroups v1
        v1_path = f"/sys/fs/cgroup/memory/docker/{container_id}/memory.usage_in_bytes"
        if os.path.exists(v1_path):
            try:
                with open(v1_path, "r") as f:
                    return float(f.read().strip())
            except Exception:
                pass
        # Try alternative cgroups v2 path
        v2_alt_path = f"/sys/fs/cgroup/docker/{container_id}/memory.current"
        if os.path.exists(v2_alt_path):
            try:
                with open(v2_alt_path, "r") as f:
                    return float(f.read().strip())
            except Exception:
                pass
        return 0.0

    KNOWN_SERVICES = {
        "beskarfox": "Beskarfox",
        "nextcloud": "Nextcloud",
        "outline": "Outline",
        "stats": "Stats",
        "stats-staging": "Stats",
        "stats-prod": "Stats",
        "nuc-stats": "Stats",
        "temp-stats": "Stats",
        "nuc-monitor": "Stats",
        "nuc": "Stats",
        "minecraft": "Minecraft",
        "traefik": "Traefik",
        "ollama": "Ollama",
        "docker images": "Docker Images",
        "docker cache": "Docker Cache",
    }

    GENERIC_ENV_NAMES = {
        "prod", "staging", "dev", "test", "production", "default",
        "app", "server", "db", "database", "data", "storage",
        "mysql", "mariadb", "postgres", "redis"
    }

    @classmethod
    def resolve_service_name(cls, labels: dict = None, raw_name: str = "", image: str = "") -> str:
        """
        Resolves a clean, displayable service name from Docker container/volume metadata.
        Handles services organized in /opt/<service>/prod and /opt/<service>/staging,
        Docker compose project labels, environment prefixes/suffixes, and container names.
        """
        labels = labels or {}

        # 1. Check explicit custom label
        custom = labels.get("stats.service.name")
        if custom:
            return custom.strip()

        # 2. Check compose working_dir or config_files (e.g. /opt/beskarfox/prod or /opt/beskarfox/staging -> beskarfox)
        working_dir = labels.get("com.docker.compose.project.working_dir", "")
        if not working_dir:
            config_files = labels.get("com.docker.compose.project.config_files", "")
            if config_files:
                working_dir = os.path.dirname(config_files.split(",")[0])

        if working_dir:
            match = re.search(r"/opt/([^/]+)", working_dir)
            if match:
                candidate = match.group(1).lower().strip()
                if candidate not in cls.GENERIC_ENV_NAMES:
                    return cls.KNOWN_SERVICES.get(candidate, candidate.capitalize())

        # 3. Check compose project name (e.g. beskarfox-prod, beskarfox-staging, temp-stats)
        project = labels.get("com.docker.compose.project", "").strip().lower()
        if project and project not in cls.GENERIC_ENV_NAMES:
            cleaned_proj = re.sub(r"[-_](prod|staging|dev|test|production)$", "", project)
            if cleaned_proj in cls.KNOWN_SERVICES:
                return cls.KNOWN_SERVICES[cleaned_proj]
            if project in cls.KNOWN_SERVICES:
                return cls.KNOWN_SERVICES[project]
            return cls.KNOWN_SERVICES.get(cleaned_proj, cleaned_proj.capitalize())

        # 4. Check raw_name (container name or volume name) against known service tokens
        clean_name = raw_name.lstrip("/").lower()
        if clean_name in cls.KNOWN_SERVICES:
            return cls.KNOWN_SERVICES[clean_name]
        for key, display_name in cls.KNOWN_SERVICES.items():
            if key in ("prod", "staging", "dev", "app", "server"):
                continue
            pattern = r"(^|[-_])" + re.escape(key) + r"([-_]|$)"
            if re.search(pattern, clean_name):
                return display_name

        # 5. Check container image name
        if image:
            clean_image = image.lower()
            for key, display_name in cls.KNOWN_SERVICES.items():
                if key in ("prod", "staging", "dev", "app", "server"):
                    continue
                if key in clean_image:
                    return display_name

        # 6. Fallback token splitting
        parts = [p for p in re.split(r"[-_]", clean_name) if p and p not in cls.GENERIC_ENV_NAMES]
        if parts:
            base = parts[0]
            return cls.KNOWN_SERVICES.get(base, base.capitalize())
        return "Autres"

    @classmethod
    def get_docker_ram_usage(cls) -> str:
        import json
        import os
        import subprocess

        ram_usage = {}

        # 1. Try Docker socket query and cgroups reading
        containers = cls.query_docker_socket("/containers/json")
        if containers:
            for container in containers:
                c_id = container.get("Id", "")
                names = container.get("Names", [])
                if not c_id or not names:
                    continue
                name = names[0].lstrip('/')
                labels = container.get("Labels", {})
                image = container.get("Image", "")

                project_display = cls.resolve_service_name(labels=labels, raw_name=name, image=image)

                mem_bytes = cls.get_container_mem_usage(c_id)
                mem_mb = mem_bytes / (1024.0 * 1024.0)
                if mem_mb > 0:
                    ram_usage[project_display] = round(ram_usage.get(project_display, 0.0) + mem_mb, 1)

        # 2. Fallback to docker stats CLI if socket returned nothing (e.g. running outside docker, or permissions issues)
        if not ram_usage:
            try:
                result = subprocess.run(
                    ["docker", "stats", "--no-stream", "--format", "{{.Name}}:{{.MemUsage}}"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    timeout=3
                )
                if result.returncode == 0:
                    for line in result.stdout.strip().split("\n"):
                        if not line or ":" not in line:
                            continue
                        parts = line.split(":", 1)
                        if len(parts) < 2:
                            continue
                        name, mem_part = parts[0], parts[1]
                        mem_str = mem_part.split("/")[0].strip()
                        mem_mb = 0.0
                        try:
                            num_str = "".join([c for c in mem_str if c.isdigit() or c == "."])
                            value = float(num_str) if num_str else 0.0
                            if "gib" in mem_str.lower():
                                mem_mb = value * 1024.0
                            elif "mib" in mem_str.lower():
                                mem_mb = value
                            elif "kib" in mem_str.lower():
                                mem_mb = value / 1024.0
                            elif "b" in mem_str.lower():
                                mem_mb = value / (1024.0 * 1024.0)
                            else:
                                mem_mb = value
                        except ValueError:
                            pass

                        if mem_mb > 0:
                            project_display = cls.resolve_service_name(raw_name=name)
                            ram_usage[project_display] = round(ram_usage.get(project_display, 0.0) + mem_mb, 1)
            except Exception:
                pass

        # 3. Always ensure our local Stats process is represented (if not already counted in Docker)
        if "Stats" not in ram_usage:
            try:
                import psutil
                process = psutil.Process(os.getpid())
                local_stats_mb = process.memory_info().rss / (1024.0 * 1024.0)
                stats_key = "Stats"
                ram_usage[stats_key] = round(local_stats_mb, 1)
            except Exception:
                pass

        # 4. Check Ollama memory (runs as a host service outside Docker)
        if "Ollama" not in ram_usage or ram_usage["Ollama"] == 0.0:
            ollama_mb = cls.get_ollama_ram_usage()
            if ollama_mb > 0:
                ram_usage["Ollama"] = round(ollama_mb, 1)

        return json.dumps(ram_usage)

    @classmethod
    def get_ollama_ram_usage(cls) -> float:
        """
        Retrieves RAM usage of Ollama when running natively on the host (outside Docker).
        Tries scanning /host/proc (mounted in Docker) or /proc (native host),
        systemd cgroups, and psutil.
        Returns total usage in Megabytes (MB).
        """
        import os

        # 1. Try scanning host processes via /host/proc (Docker volume) or /proc (native host)
        proc_dir = "/host/proc" if os.path.exists("/host/proc") else "/proc"
        total_proc_mb = 0.0
        if os.path.exists(proc_dir):
            try:
                for pid in os.listdir(proc_dir):
                    if not pid.isdigit():
                        continue
                    pid_dir = os.path.join(proc_dir, pid)
                    try:
                        comm = ""
                        comm_path = os.path.join(pid_dir, "comm")
                        if os.path.exists(comm_path):
                            with open(comm_path, "r", errors="ignore") as f:
                                comm = f.read().strip().lower()

                        cmd_first = ""
                        has_runner = False
                        cmdline_path = os.path.join(pid_dir, "cmdline")
                        if os.path.exists(cmdline_path):
                            with open(cmdline_path, "rb") as f:
                                raw = f.read().decode("utf-8", errors="ignore")
                                parts = raw.split("\x00")
                                if parts and parts[0]:
                                    cmd_first = os.path.basename(parts[0].strip().lower())
                                if any("ollama_llama_server" in p.lower() for p in parts):
                                    has_runner = True

                        is_ollama = False
                        if comm in ("ollama", "ollama_llama_se", "ollama_llama_server") or comm.startswith("ollama"):
                            is_ollama = True
                        elif cmd_first in ("ollama", "ollama_llama_server") or cmd_first.startswith("ollama"):
                            is_ollama = True
                        elif has_runner:
                            is_ollama = True

                        if is_ollama:
                            # Read resident memory (VmRSS) from /status
                            status_path = os.path.join(pid_dir, "status")
                            if os.path.exists(status_path):
                                with open(status_path, "r", errors="ignore") as f:
                                    for line in f:
                                        if line.startswith("VmRSS:"):
                                            parts = line.split()
                                            if len(parts) >= 2:
                                                total_proc_mb += float(parts[1]) / 1024.0
                                            break
                    except (IOError, OSError, ValueError, FileNotFoundError):
                        continue
            except Exception:
                pass

        if total_proc_mb > 0:
            return round(total_proc_mb, 1)

        # 2. Try systemd cgroups v2 / v1
        cgroup_paths_v2 = [
            "/sys/fs/cgroup/system.slice/ollama.service/memory.current",
            "/sys/fs/cgroup/system.slice/system-ollama.slice/memory.current",
            "/sys/fs/cgroup/ollama.service/memory.current",
        ]
        for p in cgroup_paths_v2:
            if os.path.exists(p):
                try:
                    with open(p, "r") as f:
                        val = float(f.read().strip())
                        mb = val / (1024.0 * 1024.0)
                        if mb > 0:
                            return round(mb, 1)
                except Exception:
                    pass

        cgroup_paths_v1 = [
            "/sys/fs/cgroup/memory/system.slice/ollama.service/memory.usage_in_bytes",
            "/sys/fs/cgroup/memory/ollama.service/memory.usage_in_bytes",
        ]
        for p in cgroup_paths_v1:
            if os.path.exists(p):
                try:
                    with open(p, "r") as f:
                        val = float(f.read().strip())
                        mb = val / (1024.0 * 1024.0)
                        if mb > 0:
                            return round(mb, 1)
                except Exception:
                    pass

        # 3. Fallback to Ollama local REST API if reachable
        try:
            import urllib.request
            import json
            ollama_url = os.getenv("OLLAMA_API_URL", "http://host.docker.internal:11434")
            req = urllib.request.Request(f"{ollama_url}/api/ps")
            with urllib.request.urlopen(req, timeout=0.5) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    models = data.get("models", [])
                    total_bytes = sum(m.get("size", 0) for m in models)
                    if total_bytes > 0:
                        return round(total_bytes / (1024.0 * 1024.0), 1)
        except Exception:
            pass

        # 4. Fallback to psutil if available and running on host
        try:
            import psutil
            psutil_mb = 0.0
            for proc in psutil.process_iter(['name', 'cmdline', 'memory_info']):
                try:
                    p_name = (proc.info.get('name') or '').lower()
                    p_cmd = proc.info.get('cmdline') or []
                    p_bin = os.path.basename(p_cmd[0].lower()) if p_cmd else ''
                    if (
                        p_name.startswith('ollama')
                        or p_bin.startswith('ollama')
                        or any('ollama_llama_server' in a.lower() for a in p_cmd)
                    ):
                        mem = proc.info.get('memory_info')
                        if mem and hasattr(mem, 'rss'):
                            psutil_mb += mem.rss / (1024.0 * 1024.0)
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    pass
            if psutil_mb > 0:
                return round(psutil_mb, 1)
        except Exception:
            pass

        return 0.0

    @staticmethod
    def get_hostname() -> str:
        try:
            return socket.gethostname()
        except Exception:
            return ""

    @staticmethod
    def get_cpu_temp(cpu_usage: float) -> float:
        # 1. Try psutil sensors
        try:
            temps = psutil.sensors_temperatures()
            if temps:
                # Look for typical CPU thermal zones
                for name in ['cpu-thermal', 'coretemp', 'acpitz', 'cpu_thermal']:
                    if name in temps and temps[name]:
                        return float(temps[name][0].current)
                # Fallback to any sensor
                for name, entries in temps.items():
                    if entries:
                        return float(entries[0].current)
        except Exception:
            pass

        # 2. Try Linux sysfs (Intel NUC/generic Linux)
        try:
            if os.path.exists("/sys/class/thermal/thermal_zone0/temp"):
                with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
                    temp_raw = f.read().strip()
                    return float(temp_raw) / 1000.0
        except Exception:
            pass

        # 3. Fallback: Return 0.0 if no hardware sensors are available
        return 0.0

    @staticmethod
    def get_disk_temps() -> tuple[float, float]:
        """Reads NVMe and SATA temperatures directly from Linux sysfs (hwmon)."""
        nvme_temp = 0.0
        sata_temp = 0.0
        
        try:
            hwmon_dir = "/sys/class/hwmon"
            if os.path.exists(hwmon_dir):
                for hwmon in os.listdir(hwmon_dir):
                    hwmon_path = os.path.join(hwmon_dir, hwmon)
                    name_path = os.path.join(hwmon_path, "name")
                    temp_path = os.path.join(hwmon_path, "temp1_input")
                    
                    if os.path.exists(name_path) and os.path.exists(temp_path):
                        with open(name_path, "r") as f:
                            name = f.read().strip()
                        
                        # Read NVMe temperature
                        if name == "nvme" and nvme_temp == 0.0:
                            with open(temp_path, "r") as f:
                                nvme_temp = float(f.read().strip()) / 1000.0
                                
                        # Read SATA temperature (requires 'drivetemp' kernel module)
                        elif name == "drivetemp" and sata_temp == 0.0:
                            with open(temp_path, "r") as f:
                                sata_temp = float(f.read().strip()) / 1000.0
                                
        except Exception as e:
            print(f"Error reading hwmon for disk temps: {e}")
            
        # Fallback for SATA: read from smartctl directly if installed and authorized
        if sata_temp == 0.0:
            import subprocess
            try:
                for dev in ["/dev/sda", "/dev/sdb", "/dev/sdc"]:
                    if not os.path.exists(dev):
                        continue
                    
                    # Try with '-d sat' for USB-SATA bridges
                    result = subprocess.run(["smartctl", "-A", "-d", "sat", dev], capture_output=True, text=True)
                    # smartctl returns non-zero if there are any logged SMART errors, so we don't check returncode.
                    for line in result.stdout.splitlines():
                        # Look for standard SMART temperature attributes (case insensitive)
                        line_lower = line.lower()
                        if "temperature" in line_lower:
                            parts = line.split()
                            # Typically the raw value is at the 10th column (index 9)
                            if len(parts) >= 10:
                                try:
                                    # Some disks have it at index 9, others at the end
                                    temp_val = float(parts[9])
                                    if temp_val > 0.0:
                                        sata_temp = temp_val
                                        break
                                except ValueError:
                                    pass
                    if sata_temp > 0.0:
                        break
            except Exception as e:
                print(f"Error reading SATA fallback with smartctl: {e}")
            
        return round(nvme_temp, 1), round(sata_temp, 1)

    @staticmethod
    def get_uptime() -> str:
        try:
            boot_time_timestamp = psutil.boot_time()
            uptime_seconds = time.time() - boot_time_timestamp

            days, rem = divmod(int(uptime_seconds), 86400)
            hours, rem = divmod(rem, 3600)
            minutes, seconds = divmod(rem, 60)

            parts = []
            if days > 0:
                parts.append(f"{days} jour{'s' if days > 1 else ''}")
            if hours > 0:
                parts.append(f"{hours} heure{'s' if hours > 1 else ''}")
            if minutes > 0:
                parts.append(f"{minutes} minute{'s' if minutes > 1 else ''}")

            if not parts:
                return "actif depuis moins d'une minute"
            return "actif depuis " + ", ".join(parts)
        except Exception:
            return ""

    @classmethod
    def get_rapl_energy(cls):
        try:
            with open('/sys/class/powercap/intel-rapl/intel-rapl:0/energy_uj', 'r') as f:
                return int(f.read().strip())
        except Exception:
            return None

    @classmethod
    def get_host_net_bytes(cls):
        total_rx = 0
        total_tx = 0
        
        # 1. Try reading from host's proc fs if mounted at /host/proc
        proc_net_dev = '/host/proc/net/dev'
        if not os.path.exists(proc_net_dev):
            proc_net_dev = '/proc/net/dev'
            
        try:
            if os.path.exists(proc_net_dev):
                with open(proc_net_dev, 'r') as f:
                    lines = f.readlines()
                
                has_interfaces = False
                for line in lines[2:]:  # skip headers
                    parts = line.split()
                    if len(parts) < 10:
                        continue
                    iface = parts[0].strip(':')
                    
                    # Exclude loopback, virtual interfaces, docker bridges, veths
                    if iface == 'lo' or iface.startswith('docker') or iface.startswith('br-') or iface.startswith('veth') or iface.startswith('vnet') or iface.startswith('wio'):
                        continue
                    
                    rx_bytes = int(parts[1])
                    tx_bytes = int(parts[9])
                    
                    total_rx += rx_bytes
                    total_tx += tx_bytes
                    has_interfaces = True
                
                if has_interfaces:
                    return total_rx, total_tx
        except Exception:
            pass
            
        # 2. Fallback to /sys/class/net if proc dev fails
        try:
            net_dir = '/sys/class/net'
            if os.path.exists(net_dir):
                has_interfaces = False
                for iface in os.listdir(net_dir):
                    if iface == 'lo' or iface.startswith('docker') or iface.startswith('br-') or iface.startswith('veth'):
                        continue
                    
                    rx_file = f'{net_dir}/{iface}/statistics/rx_bytes'
                    tx_file = f'{net_dir}/{iface}/statistics/tx_bytes'
                    
                    if os.path.exists(rx_file) and os.path.exists(tx_file):
                        with open(rx_file, 'r') as f:
                            total_rx += int(f.read().strip())
                        with open(tx_file, 'r') as f:
                            total_tx += int(f.read().strip())
                        has_interfaces = True
                if has_interfaces:
                    return total_rx, total_tx
        except Exception:
            pass
            
        return None

    @classmethod
    def collect(cls) -> SystemMetricDomain:
        # Get start RAPL energy and timestamp
        start_energy = cls.get_rapl_energy()
        start_time = time.time()

        # Get host device name
        device_name = cls.get_hostname()

        # 1. CPU usage
        cpu_usage = psutil.cpu_percent(interval=0.5)

        # 2. CPU Temperature
        cpu_temp = cls.get_cpu_temp(cpu_usage)

        # 3. Disk Temps (NVMe & SATA)
        disk_nvme_temp, disk_sata_temp = cls.get_disk_temps()

        # 4. Disk Space Usage (NVMe and SATA)
        nvme_path = 'C:\\' if platform.system() == 'Windows' else '/'
        try:
            disk_nvme = psutil.disk_usage(nvme_path)
            disk_total_gb = round(disk_nvme.total / (1024 ** 3), 1)
            disk_usage_gb = round(disk_nvme.used / (1024 ** 3), 1)
        except Exception:
            disk_total_gb = 0.0
            disk_usage_gb = 0.0

        # Services sizes breakdown on NVMe SSD
        stats_path = '/opt/stats'
        if platform.system() == 'Windows':
            stats_path = os.getcwd()

        import json
        services_breakdown = {}

        # Scan /opt dynamically
        if os.path.exists('/opt'):
            try:
                for entry in os.listdir('/opt'):
                    full_path = os.path.join('/opt', entry)
                    if os.path.isdir(full_path):
                        # Use the exact folder name as the key
                        size = cls.get_dir_size(full_path)
                        services_breakdown[entry] = size
            except Exception:
                pass

        # Fallbacks for key folders if they weren't found in /opt (e.g. running locally on Windows)
        for key, path in [("beskarfox", "/opt/beskarfox"), ("nextcloud", "/opt/nextcloud"), ("outline", "/opt/outline")]:
            if key not in services_breakdown or services_breakdown[key] == 0.0:
                size = cls.get_dir_size(path)
                if size > 0:
                    services_breakdown[key] = size

        # Check Ollama storage locations
        if "ollama" not in services_breakdown or services_breakdown["ollama"] == 0.0:
            ollama_candidates = [
                "/opt/ollama",
                "/usr/share/ollama/.ollama",
                "/usr/share/ollama",
                "/var/lib/ollama",
                os.path.expanduser("~/.ollama"),
            ]
            for o_path in ollama_candidates:
                if os.path.exists(o_path):
                    size = cls.get_dir_size(o_path)
                    if size > 0:
                        services_breakdown["ollama"] = size
                        break

        if "stats" not in services_breakdown or services_breakdown["stats"] == 0.0:
            services_breakdown["stats"] = cls.get_dir_size(stats_path)

        # Query Docker system df to associate volume sizes and count docker images
        system_df = SystemMetricsCollector.query_docker_socket("/system/df")
        if system_df:
            try:
                # Build volume-to-service mapping from active containers
                volume_to_service = {}
                containers = SystemMetricsCollector.query_docker_socket("/containers/json")
                if containers:
                    for container in containers:
                        c_names = container.get("Names", [])
                        c_name = c_names[0].lstrip('/') if c_names else ""
                        c_labels = container.get("Labels", {})
                        c_image = container.get("Image", "")
                        c_service = cls.resolve_service_name(labels=c_labels, raw_name=c_name, image=c_image)

                        if c_service and c_service != "Autres":
                            for mount in container.get("Mounts", []):
                                if mount.get("Type") == "volume":
                                    v_name = mount.get("Name")
                                    if v_name:
                                        volume_to_service[v_name] = c_service

                # Docker volumes sizes
                volumes = system_df.get("Volumes", [])
                if volumes:
                    for vol in volumes:
                        name = vol.get("Name", "")
                        usage = vol.get("UsageData", {})
                        if usage:
                            size_bytes = usage.get("Size", 0)
                            size_gb = size_bytes / (1024 ** 3)
                            if size_gb > 0.05:  # more than 50MB
                                # Skip anonymous Docker volumes (64-char hex hash names)
                                if re.fullmatch(r"[0-9a-f]{64}", name.strip()):
                                    continue

                                vol_labels = vol.get("Labels") or {}
                                service_display = volume_to_service.get(name)
                                if not service_display:
                                    service_display = cls.resolve_service_name(labels=vol_labels, raw_name=name)

                                if not service_display or service_display == "Autres":
                                    continue

                                # Match against existing key in services_breakdown (case-insensitive)
                                matched_key = None
                                for k in list(services_breakdown.keys()):
                                    if k.lower() == service_display.lower():
                                        matched_key = k
                                        break

                                target_key = matched_key if matched_key else service_display
                                services_breakdown[target_key] = round(
                                    max(services_breakdown.get(target_key, 0.0), size_gb), 1
                                )

                # Docker images size
                images = system_df.get("Images", [])
                if images:
                    total_images_bytes = sum(img.get("Size", 0) for img in images)
                    docker_images_gb = round(total_images_bytes / (1024 ** 3), 1)
                    if docker_images_gb > 0:
                        services_breakdown["Docker Images"] = docker_images_gb

                # Docker build cache size
                build_cache = system_df.get("BuildCache", [])
                if build_cache:
                    total_bc_bytes = sum(b.get("Size", 0) for b in build_cache)
                    build_cache_gb = round(total_bc_bytes / (1024 ** 3), 1)
                    if build_cache_gb > 0:
                        services_breakdown["Docker Cache"] = build_cache_gb
            except Exception:
                pass

        # Normalize and group keys under clean names
        grouped_breakdown = {}
        for key, val in services_breakdown.items():
            clean_key = cls.resolve_service_name(raw_name=key)
            grouped_breakdown[clean_key] = round(grouped_breakdown.get(clean_key, 0.0) + val, 1)

        # Calculate 'Autres' (Others)
        known_size = sum(v for k, v in grouped_breakdown.items() if k != "Autres")
        autres_size = round(disk_usage_gb - known_size, 1)
        if autres_size < 0:
            autres_size = 0.0

        grouped_breakdown["Autres"] = autres_size
        disk_services_json = json.dumps(grouped_breakdown)

        disk_sata_total_gb = 0.0
        disk_sata_usage_gb = 0.0
        try:
            sata_path = None
            if os.path.exists('/mnt/ssdsata/backups'):
                sata_path = '/mnt/ssdsata/backups'
            else:
                parts = psutil.disk_partitions(all=False)
                for p in parts:
                    if 'cdrom' in p.opts or p.fstype == '':
                        continue
                    if platform.system() == 'Windows':
                        if p.mountpoint.upper() != 'C:\\':
                            sata_path = p.mountpoint
                            break
                    else:
                        if p.mountpoint != '/' and (p.mountpoint.startswith('/mnt') or p.mountpoint.startswith('/media') or p.mountpoint.startswith('/data')):
                            sata_path = p.mountpoint
                            break
            if sata_path:
                disk_sata = psutil.disk_usage(sata_path)
                disk_sata_total_gb = round(disk_sata.total / (1024 ** 3), 1)
                disk_sata_usage_gb = round(disk_sata.used / (1024 ** 3), 1)
        except Exception:
            pass

        # 5. RAM Usage
        try:
            mem = psutil.virtual_memory()
            ram_total_mb = round(mem.total / (1024 ** 2), 1)
            ram_usage_mb = round(mem.used / (1024 ** 2), 1)
            ram_usage_percent = round(mem.percent, 2)
        except Exception:
            ram_total_mb = 0.0
            ram_usage_mb = 0.0
            ram_usage_percent = 0.0

        # 6. Network stats
        try:
            host_bytes_start = cls.get_host_net_bytes()
            psutil_start = psutil.net_io_counters()
            
            time.sleep(1.0)
            
            host_bytes_end = cls.get_host_net_bytes()
            psutil_end = psutil.net_io_counters()

            if host_bytes_start is not None and host_bytes_end is not None:
                rx_diff = host_bytes_end[0] - host_bytes_start[0]
                tx_diff = host_bytes_end[1] - host_bytes_start[1]
            else:
                rx_diff = psutil_end.bytes_recv - psutil_start.bytes_recv
                tx_diff = psutil_end.bytes_sent - psutil_start.bytes_sent

            # Calculate speed in MB/s (1024*1024 bytes)
            net_rx_mb = round(rx_diff / (1024 * 1024), 2)
            net_tx_mb = round(tx_diff / (1024 * 1024), 2)

            # Prevent negative speeds (e.g. if counter resets)
            if net_rx_mb < 0: net_rx_mb = 0.0
            if net_tx_mb < 0: net_tx_mb = 0.0
        except Exception:
            net_rx_mb = 0.0
            net_tx_mb = 0.0

        # 7. Uptime
        uptime = cls.get_uptime()

        # Get end RAPL energy and calculate actual consumption
        end_energy = cls.get_rapl_energy()
        end_time = time.time()

        rapl_power = None
        if start_energy is not None and end_energy is not None:
            elapsed = end_time - start_time
            if elapsed > 0:
                rapl_power = (end_energy - start_energy) / (1_000_000 * elapsed)

        # 8. Electricity consumption (W)
        if rapl_power is not None:
            # CPU RAPL power + NUC base idle power (rest of motherboard/components)
            power_usage_w = round(settings.POWER_BASE_W + rapl_power, 2)
        else:
            # Fallback dynamic formula: base_power + (max_power - base_power) * (cpu_usage / 100)
            power_usage_w = settings.POWER_BASE_W + (settings.POWER_MAX_W - settings.POWER_BASE_W) * (cpu_usage / 100.0)
            power_usage_w = max(settings.POWER_BASE_W, round(power_usage_w, 2))

        cpu_name = cls.get_cpu_name()
        ram_services_json = cls.get_docker_ram_usage()

        return SystemMetricDomain(
            device_name=device_name,
            cpu_temp=cpu_temp,
            cpu_usage=cpu_usage,
            disk_temp=disk_nvme_temp,
            disk_sata_temp=disk_sata_temp,
            disk_usage_gb=disk_usage_gb,
            disk_total_gb=disk_total_gb,
            disk_sata_usage_gb=disk_sata_usage_gb,
            disk_sata_total_gb=disk_sata_total_gb,
            ram_usage_mb=ram_usage_mb,
            ram_total_mb=ram_total_mb,
            ram_usage_percent=ram_usage_percent,
            net_rx_mb=net_rx_mb,
            net_tx_mb=net_tx_mb,
            uptime=uptime,
            power_usage_w=power_usage_w,
            disk_services_json=disk_services_json,
            cpu_name=cpu_name,
            ram_services_json=ram_services_json
        )
