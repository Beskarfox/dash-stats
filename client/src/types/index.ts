export interface SystemMetric {
  id: number;
  timestamp: string;
  device_name: string;
  cpu_temp: number;
  cpu_usage: number;
  disk_temp: number;
  disk_sata_temp: number;
  disk_usage_gb: number;
  disk_total_gb: number;
  disk_sata_usage_gb: number;
  disk_sata_total_gb: number;
  ram_usage_mb: number;
  ram_total_mb: number;
  ram_usage_percent: number;
  net_rx_mb: number;
  net_tx_mb: number;
  uptime: string;
  power_usage_w: number;
  disk_services_json?: string;
  cpu_name?: string;
  ram_services_json?: string;
  ram_details_json?: string;
}

export interface MinecraftStatus {
  online: boolean;
  version: string | null;
  players_online: number;
  players_max: number;
  players_list: string[];
  latency_ms: number | null;
  motd: string | null;
  favicon: string | null;
  logs: string[];
  uptime?: string | null;
}
export interface BackupItem {
  folder: string;
  date: string;
  size_bytes: number;
  files: string[];
}

export interface BackupDbStatus {
  status: string;
  timestamp: string | null;
  error_message: string | null;
}

export interface BackupServiceStatus {
  latest_backup: BackupItem | null;
  total_backups_count: number;
  max_backups: number;
  db_status?: BackupDbStatus | null;
}

export interface BackupsStatusResponse {
  minecraft: BackupServiceStatus;
  outline: BackupServiceStatus;
  nextcloud: BackupServiceStatus;
}

export interface BackupLogResponse {
  id: number;
  service: string;
  timestamp: string;
  status: string;
  size_bytes: number;
  progress_pct?: number;
  files: string[];
  error_message: string | null;
}
