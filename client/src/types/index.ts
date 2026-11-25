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
  // Measured power (RAPL), null when unavailable. Without power_source, the row predates real
  // measurements and its value was estimated: it must not be displayed as a measurement.
  power_usage_w: number | null;
  power_source?: "rapl-psys" | "rapl-package" | null;
  energy_wh?: number | null;
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
export interface OllacraftQuest {
  id: string;
  amount: number;
  done: boolean;
  current: boolean;
}

export interface OllacraftPosition {
  x: number;
  y: number;
  z: number;
}

export interface OllacraftAction {
  action: string | null;
  target: string | null;
  success: boolean | null;
  message: string | null;
}

export interface OllacraftWaypoint extends OllacraftPosition {
  name: string;
  dimension: string | null;
}

export interface OllacraftStatus {
  online: boolean;
  error?: string | null;
  username: string | null;
  connected: boolean;
  running: boolean;
  uptime_seconds: number | null;
  health: number | null;
  food: number | null;
  dimension: string | null;
  position: OllacraftPosition | null;
  objective: {
    id: string | null;
    amount: number;
    manual: boolean;
    directive: string | null;
    sub_goal: string | null;
  } | null;
  quests: OllacraftQuest[];
  inventory: Record<string, number>;
  inventory_slots: ({ name: string; count: number } | null)[];
  last_action: OllacraftAction | null;
  recent_actions: OllacraftAction[];
  decision_source: string | null;
  milestones: Record<string, boolean | string | null>;
  waypoints: OllacraftWaypoint[];
  stronghold: { located: boolean; reached: boolean; estimate: OllacraftPosition | null } | null;
  end_portal: { frame_count: number; filled_count: number } | null;
  advancement: string | null;
  unlocked_advancements: number;
  metrics: Record<string, number>;
  tokens: Record<string, number>;
  updated_at: string | null;
  // Set when the bot is offline and the data is the last status received from it
  stale?: boolean;
  last_seen?: string | null;
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
