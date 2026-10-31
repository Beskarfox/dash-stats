import { useState, useEffect, useRef } from "react";
import { MinecraftStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sword,
  Users,
  Terminal,
  Search,
  Play,
  Pause,
  RefreshCw,
  Wifi,
  FileText,
  Loader2
} from "lucide-react";

interface MinecraftSectionProps {
  status: MinecraftStatus | null;
  loading: boolean;
  onRefresh: () => void;
}

export const MinecraftSection = ({ status, loading, onRefresh }: MinecraftSectionProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const consoleContainerRef = useRef<HTMLDivElement>(null);
  const [pausedLogs, setPausedLogs] = useState<string[]>([]);
  const prevLogsSerializedRef = useRef<string>("");

  // Capture logs when not paused
  useEffect(() => {
    if (status && !isPaused) {
      setPausedLogs(status.logs);
    }
  }, [status, isPaused]);

  // Handle auto-scroll to bottom of logs console (only if logs content actually changed)
  useEffect(() => {
    const serialized = pausedLogs.join("\n");
    if (serialized !== prevLogsSerializedRef.current) {
      if (consoleContainerRef.current) {
        consoleContainerRef.current.scrollTop = consoleContainerRef.current.scrollHeight;
      }
      prevLogsSerializedRef.current = serialized;
    }
  }, [pausedLogs]);

  if (!status && loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!status) {
    return (
      <Card className="glass-card-blended bg-card/40 backdrop-blur-xl p-6 text-center text-muted-foreground">
        Impossible de charger les statistiques Minecraft.
      </Card>
    );
  }

  // Parse log line for syntax highlighting
  const formatLogLine = (line: string, index: number) => {
    // Standard format: [HH:MM:SS] [thread/LEVEL]: Message
    const match = line.match(/^\[(\d{2}:\d{2}:\d{2})\]\s+\[([^\]]+)\]:\s+(.*)$/);
    if (!match) {
      return <div key={index} className="text-zinc-500 font-mono text-xs py-[1px] px-1">{line}</div>;
    }

    const [, time, threadAndLevel, message] = match;
    let level = "INFO";
    if (threadAndLevel.includes("WARN")) level = "WARN";
    if (threadAndLevel.includes("ERROR")) level = "ERROR";
    if (threadAndLevel.includes("FATAL")) level = "FATAL";

    // Highlight types of messages
    let messageColor = "text-zinc-300";

    if (message.startsWith("<") && message.includes(">")) {
      // Chat message
      messageColor = "text-fuchsia-300 font-semibold";
    } else if (message.includes("joined the game")) {
      messageColor = "text-emerald-400 font-medium";
    } else if (message.includes("left the game") || message.includes("lost connection")) {
      messageColor = "text-rose-400 font-medium";
    }

    let levelBadgeColor = "text-cyan-400";
    if (level === "WARN") levelBadgeColor = "text-amber-400 font-bold";
    if (level === "ERROR" || level === "FATAL") levelBadgeColor = "text-red-400 font-bold";

    return (
      <div key={index} className="leading-normal hover:bg-white/5 py-[1px] px-1 rounded transition-colors duration-100 flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-2">
        <div className="flex items-center gap-1.5 shrink-0 select-none">
          <span className="text-zinc-500 font-mono text-[10px] sm:text-xs">[{time}]</span>
          <span className={`${levelBadgeColor} font-mono text-[10px] sm:text-xs`}>
            [{threadAndLevel}]
          </span>
        </div>
        <span className={`${messageColor} font-mono text-xs break-all sm:break-words flex-1 pl-1 sm:pl-0`}>
          {message}
        </span>
      </div>
    );
  };

  // Filter logs based on search term and hide 'issued server command'
  const filteredLogs = pausedLogs.filter((line) => {
    if (line.toLowerCase().includes("issued server command")) return false;
    return line.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const renderPingBars = (ping: number | null) => {
    let bars = 0;
    if (ping !== null) {
      if (ping < 150) bars = 4;
      else if (ping < 300) bars = 3;
      else if (ping < 600) bars = 2;
      else bars = 1;
    }
    
    return (
      <div className="flex items-end gap-[2px] h-4 pb-[1px]" title={ping !== null ? `${ping} ms` : 'Offline'}>
        {[1, 2, 3, 4].map(i => (
          <div 
            key={i} 
            className={`w-[3px] rounded-sm transition-colors ${i <= bars ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-zinc-700/50"}`} 
            style={{ height: `${(i / 4) * 100}%` }}
          />
        ))}
      </div>
    );
  };

  const playPauseButton = (
    <button
      onClick={() => setIsPaused(!isPaused)}
      className={`p-2 rounded-lg border transition-all cursor-pointer ${
        isPaused
          ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
          : "bg-zinc-900/60 text-muted-foreground border-white/5 hover:text-foreground hover:bg-zinc-900"
      }`}
      title={isPaused ? "Reprendre le flux en direct" : "Geler le flux des logs"}
    >
      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="grid gap-6 grid-cols-1 xl:grid-cols-3 xl:h-[75vh] min-h-[500px]">
      {/* LEFT COLUMN: Status and Players list */}
      <div className="xl:col-span-1 flex flex-col gap-6">
        
        {/* Status Card */}
        <Card className="relative overflow-hidden glass-card-blended ring-0 bg-card/40 backdrop-blur-xl shadow-xl p-6">
          <div 
            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] pointer-events-none -z-10 transition-all duration-500" 
            style={{ 
              backgroundColor: status.online ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)" 
            }}
          />
          <div className="flex items-start gap-4 mb-3 bg-black/40 p-3 rounded-xl shadow-inner">
            {/* Server Icon */}
            <div className="w-16 h-16 shrink-0 bg-black/60 rounded-md overflow-hidden flex items-center justify-center">
              {status.favicon ? (
                <img src={status.favicon} alt="Server Icon" className="w-full h-full object-cover" />
              ) : (
                <Sword className="h-8 w-8 text-zinc-600" />
              )}
            </div>
            
            {/* Middle: Title & MOTD */}
            <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
              <h3 className="font-bold font-mono text-base text-foreground/90 truncate leading-tight mb-1">Minecraft Server</h3>
              <div className="text-xs font-mono text-zinc-300 whitespace-pre-wrap break-words line-clamp-2">
                {status.motd || "A Minecraft Server"}
              </div>
            </div>

            {/* Right: Players & Ping */}
            <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-bold font-mono text-zinc-400">
                  {status.players_online} <span className="font-normal text-zinc-600">/</span> {status.players_max}
                </span>
                {renderPingBars(status.latency_ms)}
              </div>
            </div>
          </div>

          <div className="bg-black/20  rounded-xl py-1">
            {/* Status indicator */}
            <div className="flex items-center justify-between py-2 px-3">
              <span className="text-xs font-semibold text-muted-foreground/50">Statut</span>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${status.online ? "bg-emerald-400 animate-pulse" : "bg-rose-500 animate-pulse"}`} />
                <span className={`text-sm font-bold ${status.online ? "text-emerald-400" : "text-rose-400"}`}>
                  {status.online ? "En ligne" : "Hors ligne"}
                </span>
              </div>
            </div>

            {/* Uptime */}
            <div className="flex items-center justify-between py-2 px-3">
              <span className="text-xs font-semibold text-muted-foreground/50">Uptime</span>
              <span className="text-sm font-medium text-foreground/80 font-mono">
                {status.online && status.uptime ? status.uptime : "--"}
              </span>
            </div>

            {/* Version */}
            <div className="flex items-center justify-between py-2 px-3">
              <span className="text-xs font-semibold text-muted-foreground/50">Version</span>
              <span className="text-sm font-medium text-foreground/80 font-mono">
                {status.online && status.version ? status.version : "--"}
              </span>
            </div>

            {/* Latency */}
            <div className="flex items-center justify-between py-2 px-3">
              <span className="text-xs font-semibold text-muted-foreground/50">Latence</span>
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground/80 font-mono">
                <Wifi className="h-3.5 w-3.5 text-muted-foreground/45" />
                <span>{status.online && status.latency_ms !== null ? `${status.latency_ms} ms` : "--"}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Players Card */}
        <Card className="flex-1 glass-card-blended ring-0 bg-card/40 backdrop-blur-xl  shadow-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-foreground/90 font-bold">
              <Users className="h-4 w-4 text-violet-400" />
              <span>Joueurs connectés</span>
            </div>
            <span className="text-[11px] font-bold font-mono text-zinc-400">
              {status.players_online} <span className="font-normal text-zinc-600">/</span> {status.players_max}
            </span>
          </div>

          {/* Player list scrollable */}
          <div className="flex-1 overflow-y-auto max-h-[300px] xl:max-h-[none] space-y-2.5 pr-1.5 custom-scrollbar min-h-[150px]">
            {status.online && status.players_online > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
                {status.players_list.slice().sort((a, b) => a.localeCompare(b)).map((player) => (
                  <div 
                    key={player}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-black/10 hover:bg-black/20 transition-all duration-150"
                  >
                    <div className="h-8 w-8 rounded-lg overflow-hidden shrink-0 bg-zinc-900 flex items-center justify-center">
                      <img 
                        src={`https://mc-heads.net/avatar/${player}/32`}
                        alt={`${player} head`}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          // Fallback to generic Steve head if load fails
                          (e.target as HTMLImageElement).src = "https://mc-heads.net/avatar/Steve/32";
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-semibold text-foreground/90 truncate block">
                        {player}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground/50 gap-2">
                <Users className="h-8 w-8 opacity-25" />
                <p className="text-xs font-medium">Aucun joueur connecté actuellement</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* RIGHT COLUMN: Interactive Console/Logs */}
      <div className="xl:col-span-2 flex">
        <Card className="flex-grow glass-card-blended ring-0 bg-card/40 backdrop-blur-xl  shadow-xl flex flex-col overflow-hidden gap-0 py-0">
          {/* Console Header */}
          <div className="px-4 py-3 sm:px-5 border-b border-white/5 bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            {/* Left Title and Badge + Play/Pause in a row on mobile */}
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="flex items-center gap-2.5 shrink-0">
                <Terminal className="h-4 w-4 text-violet-400" />
                <h3 className="font-bold text-sm tracking-wide text-foreground/80">Console</h3>
                <span className="text-[10px] text-muted-foreground/50 font-mono bg-black/30  px-2 py-0.5 rounded-md">
                  {filteredLogs.length !== pausedLogs.length ? `${filteredLogs.length}/` : ""}{pausedLogs.length} lignes
                </span>
              </div>
              
              {/* Play/Pause Button on mobile */}
              <div className="sm:hidden shrink-0">
                {playPauseButton}
              </div>
            </div>

            {/* Right side search + play/pause (play/pause only on desktop) */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Keyword Search */}
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/45 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg  bg-black/20 text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-violet-500/30 transition-all font-mono"
                />
              </div>

              {/* Play/Pause Button on desktop */}
              <div className="hidden sm:block shrink-0">
                {playPauseButton}
              </div>
            </div>
          </div>

          {/* Console Text Container */}
          <div 
            ref={consoleContainerRef}
            className="flex-grow p-3 sm:p-4 bg-black/10 overflow-y-auto overscroll-contain font-mono custom-scrollbar h-0 min-h-[400px]"
          >
            {filteredLogs.length > 0 ? (
              <div className="space-y-0.5">
                {filteredLogs.map((line, index) => formatLogLine(line, index))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground/40 py-12 gap-1.5 font-sans">
                <FileText className="h-6 w-6 opacity-30" />
                <span className="text-xs font-medium">Aucune ligne de log correspondante</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
