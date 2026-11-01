import React, { useState, useEffect } from "react";
import { 
  Sword, Cloud, BookOpen, Database, Calendar, HardDrive, 
  CheckCircle2, XCircle, AlertCircle, FileArchive, Loader2 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { backupsService } from "@/services/api";
import { BackupsStatusResponse, BackupLogResponse } from "@/types";

interface BackupSectionProps {
  status: BackupsStatusResponse | null;
  loading: boolean;
}

export const BackupSection = ({ status, loading }: BackupSectionProps) => {
  const [history, setHistory] = useState<BackupLogResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch history log list
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await backupsService.getHistory();
      setHistory(data);
    } catch (e) {
      console.error("Failed to fetch backup history logs:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [status]);

  // Reset pagination to first page when new history data is loaded
  useEffect(() => {
    setCurrentPage(1);
  }, [history]);

  const formatSize = (bytes: number) => {
    if (bytes <= 0) return "--";
    const gb = bytes / (1024 ** 3);
    if (gb >= 0.1) {
      return `${gb.toFixed(1)} Go`;
    }
    const mb = bytes / (1024 ** 2);
    return `${mb.toFixed(0)} Mo`;
  };

  const formatDate = (isoStr: string) => {
    try {
      const normalizedStr = (isoStr.endsWith("Z") || isoStr.includes("+") || isoStr.includes("-", 10))
        ? isoStr
        : isoStr + "Z";
      const dt = new Date(normalizedStr);
      return dt.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const getServiceConfig = (serviceName: string) => {
    switch (serviceName.toLowerCase()) {
      case "minecraft":
        return {
          title: "Minecraft",
          icon: <Sword className="h-5 w-5" />,
          color: "cyan",
          bg: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]",
          glow: "rgba(6, 182, 212, 0.12)"
        };
      case "outline":
        return {
          title: "Outline Docs",
          icon: <BookOpen className="h-5 w-5" />,
          color: "indigo",
          bg: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]",
          glow: "rgba(99, 102, 241, 0.12)"
        };
      case "nextcloud":
        return {
          title: "Nextcloud",
          icon: <Cloud className="h-5 w-5" />,
          color: "blue",
          bg: "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]",
          glow: "rgba(59, 130, 246, 0.12)"
        };
      default:
        return {
          title: serviceName,
          icon: <Database className="h-5 w-5" />,
          color: "zinc",
          bg: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20",
          glow: "rgba(255, 255, 255, 0.05)"
        };
    }
  };

  const services = ["minecraft", "outline", "nextcloud"];

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE);
  const paginatedHistory = history.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-16">
      {/* Services Cards Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {services.map(srv => {
          const cfg = getServiceConfig(srv);
          const srvStatus = status ? status[srv as keyof BackupsStatusResponse] : null;
          const isRunning = srvStatus?.db_status?.status === "running";
          
          return (
            <Card 
              key={srv}
              className="relative overflow-hidden glass-card-blended ring-0 bg-card/40 backdrop-blur-xl  shadow-xl p-6 flex flex-col justify-between"
              style={{ "--glow": cfg.glow } as React.CSSProperties}
            >
              <div>
                {/* Header block */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3.5">
                    <div className={`p-3 rounded-2xl ${cfg.bg}`}>
                      {cfg.icon}
                    </div>
                    <span className="font-poppins text-lg font-bold tracking-wide text-foreground/90 leading-tight">
                      {cfg.title}
                    </span>
                  </div>

                  {isRunning && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                      <span>En cours</span>
                    </span>
                  )}
                </div>

                {/* Details layout */}
                <div className="space-y-3.5">
                  {/* Latest Backup */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground/50">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/45" />
                      <span>Dernière sauvegarde</span>
                    </div>
                    <span className="text-xs font-bold text-foreground/80 font-mono">
                      {srvStatus?.latest_backup 
                        ? formatDate(srvStatus.latest_backup.date)
                        : "Aucune"}
                    </span>
                  </div>

                  {/* Size & Completion Progress */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground/50">
                      <HardDrive className="h-3.5 w-3.5 text-muted-foreground/45" />
                      <span>Taille (Progression)</span>
                    </div>
                    <span className="text-xs font-bold text-foreground/80 font-mono">
                      {srvStatus?.latest_backup 
                        ? `${formatSize(srvStatus.latest_backup.size_bytes)} (100%)`
                        : "--"}
                    </span>
                  </div>

                  {/* Archived file counts */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground/50">
                      <FileArchive className="h-3.5 w-3.5 text-muted-foreground/45" />
                      <span>Total d'archives stockées</span>
                    </div>
                    <span className="text-xs font-bold text-foreground/80 font-mono">
                      {srvStatus ? `${srvStatus.total_backups_count} / ${srvStatus.max_backups}` : `0 / 0`}
                    </span>
                  </div>
                </div>
              </div>

              {srvStatus?.latest_backup && (
                <div className="mt-6 pt-4 border-t border-white/5">
                  <span className="block text-[10px] font-semibold text-muted-foreground/40 mb-1.5">Fichiers sauvegardés :</span>
                  <div className="space-y-1">
                    {srvStatus.latest_backup.files.map((file, idx) => (
                      <span key={idx} className="block text-[10px] text-zinc-400 font-mono truncate" title={file}>
                        • {file}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* History Log Section */}
      <div className="pt-8 space-y-6">
        <h3 className="font-poppins text-2xl font-bold tracking-tight text-zinc-400 ml-1">Historique</h3>

        <Card className="glass-card-blended ring-0 bg-card/40 backdrop-blur-xl  shadow-xl overflow-hidden p-0 gap-0 py-0 flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-zinc-950/30 text-[10px] uppercase font-bold text-muted-foreground/50 tracking-wider">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Service</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3">Taille (Avancement)</th>
                  <th className="px-5 py-3">Fichiers / Erreurs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {paginatedHistory.length > 0 ? (
                  paginatedHistory.map((log) => {
                    const cfg = getServiceConfig(log.service);
                    return (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-zinc-400 whitespace-nowrap">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-foreground/90 whitespace-nowrap">
                          <span className="flex items-center gap-2">
                            <span className={`p-1 rounded ${cfg.bg}`}>
                              {React.cloneElement(cfg.icon, { className: "h-3.5 w-3.5" })}
                            </span>
                            <span>{cfg.title}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {log.status === "success" && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Réussi</span>
                            </span>
                          )}
                          {log.status === "failed" && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <XCircle className="h-3 w-3" />
                              <span>Échoué</span>
                            </span>
                          )}
                          {log.status === "running" && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>En cours</span>
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-zinc-400 whitespace-nowrap">
                          {log.status === "failed" 
                            ? "--"
                            : log.status === "running"
                              ? `${formatSize(log.size_bytes)} (${log.progress_pct ?? 0}%)`
                              : `${formatSize(log.size_bytes)} (100%)`}
                        </td>
                        <td className="px-5 py-3.5 max-w-xs sm:max-w-sm truncate text-zinc-400">
                          {log.status === "failed" && log.error_message && (
                            <span className="text-rose-400/90 font-mono text-[11px] flex items-center gap-1.5 leading-snug" title={log.error_message}>
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{log.error_message}</span>
                            </span>
                          )}
                          {log.status === "success" && log.files && log.files.length > 0 && (
                            <span className="font-mono text-[11px]" title={log.files.join(", ")}>
                              {log.files.join(" • ")}
                            </span>
                          )}
                          {log.status === "running" && (
                            <span className="italic text-amber-300/80 text-[11px]">
                              Sauvegarde en cours d'écriture ({log.progress_pct ?? 0}%)...
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground/40 font-medium">
                      {historyLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                          <span>Chargement de l'historique...</span>
                        </div>
                      ) : (
                        <span>Aucun log de sauvegarde disponible</span>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-white/5 bg-black/10 text-xs text-muted-foreground">
              <span>
                Page <strong className="text-zinc-300 font-semibold">{currentPage}</strong> sur <strong className="text-zinc-300 font-semibold">{totalPages}</strong>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg  bg-zinc-900/40 text-zinc-300 hover:bg-zinc-900 hover:text-foreground transition-all duration-200 disabled:opacity-40 disabled:hover:text-zinc-300 disabled:cursor-not-allowed select-none cursor-pointer font-medium"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg  bg-zinc-900/40 text-zinc-300 hover:bg-zinc-900 hover:text-foreground transition-all duration-200 disabled:opacity-40 disabled:hover:text-zinc-300 disabled:cursor-not-allowed select-none cursor-pointer font-medium"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
