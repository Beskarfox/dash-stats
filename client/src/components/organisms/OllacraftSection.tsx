import { OllacraftStatus } from "@/types";
import { Card } from "@/components/ui/card";
import {
  Bot,
  Heart,
  Drumstick,
  MapPin,
  Compass,
  Check,
  Circle,
  Target,
  Package,
  History,
  Flag,
  Cpu,
  Loader2,
  WifiOff
} from "lucide-react";

interface OllacraftSectionProps {
  status: OllacraftStatus | null;
  loading: boolean;
}

// French labels of the quest chain stages and common identifiers (falls back to the raw identifier)
const LABELS: Record<string, string> = {
  wooden_pickaxe: "Pioche en bois",
  cobblestone: "Pierre",
  stone_pickaxe: "Pioche en pierre",
  furnace: "Four",
  raw_iron: "Fer brut",
  iron_ingot: "Lingots de fer",
  iron_pickaxe: "Pioche en fer",
  iron_sword: "Épée en fer",
  shield: "Bouclier",
  iron_helmet: "Casque en fer",
  iron_chestplate: "Plastron en fer",
  iron_leggings: "Jambières en fer",
  iron_boots: "Bottes en fer",
  bucket: "Seau",
  water_bucket: "Seau d'eau",
  flint_and_steel: "Briquet",
  bed: "Lit",
  nether_portal: "Portail du Nether",
  blaze_rod: "Bâtons de blaze",
  blaze_powder: "Poudre de blaze",
  ender_pearl: "Perles de l'Ender",
  ender_eye: "Yeux de l'Ender",
  bow: "Arc",
  arrow: "Flèches",
  end_bed: "Lit de l'End",
  stronghold: "Forteresse (stronghold)",
  end_portal: "Portail de l'End",
  ender_dragon: "Ender Dragon",
};

// The quest chain split by the world it is played in (quests the dashboard does not know land in the last phase)
const PHASES: { id: string; label: string; bar: string; text: string; quests: string[] }[] = [
  {
    id: "overworld",
    label: "Overworld",
    bar: "bg-emerald-400",
    text: "text-emerald-300",
    quests: [
      "wooden_pickaxe", "cobblestone", "stone_pickaxe", "furnace", "raw_iron", "iron_ingot", "iron_pickaxe",
      "iron_sword", "shield", "iron_helmet", "iron_chestplate", "iron_leggings", "iron_boots", "bucket",
      "water_bucket", "flint_and_steel", "bed",
    ],
  },
  {
    id: "nether",
    label: "Nether",
    bar: "bg-rose-400",
    text: "text-rose-300",
    quests: ["nether_portal", "blaze_rod", "blaze_powder", "ender_pearl", "ender_eye"],
  },
  {
    id: "end",
    label: "End",
    bar: "bg-violet-400",
    text: "text-violet-300",
    quests: ["bow", "arrow", "end_bed", "stronghold", "end_portal", "ender_dragon"],
  },
];

const DIMENSIONS: Record<string, string> = {
  overworld: "Overworld",
  the_nether: "Nether",
  the_end: "End",
};

const label = (id: string | null | undefined) => (id ? LABELS[id] || id.replace(/_/g, " ") : "--");

const formatUptime = (seconds: number | null) => {
  if (seconds === null) return "--";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}j ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
};

const StatRow = ({ name, value }: { name: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between py-2 px-3">
    <span className="text-xs font-semibold text-muted-foreground/50">{name}</span>
    <span className="text-sm font-medium text-foreground/80 font-mono">{value}</span>
  </div>
);

const CardTitleRow = ({ icon, title, extra }: { icon: React.ReactNode; title: string; extra?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2 text-foreground/90 font-bold">
      {icon}
      <span>{title}</span>
    </div>
    {extra}
  </div>
);

export const OllacraftSection = ({ status, loading }: OllacraftSectionProps) => {
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
        Impossible de charger le suivi d&apos;Ollama.
      </Card>
    );
  }

  if (!status.online) {
    return (
      <Card className="glass-card-blended ring-0 bg-card/40 backdrop-blur-xl shadow-xl p-8 flex flex-col items-center text-center gap-3">
        <WifiOff className="h-8 w-8 text-rose-400/70" />
        <h3 className="font-bold text-foreground/90">Ollama est hors ligne</h3>
        <p className="text-xs text-muted-foreground/60 max-w-md">
          {status.connected === false && !status.error
            ? "Le bot est lancé mais n'est pas encore connecté au serveur Minecraft."
            : status.error || "L'API du bot est injoignable."}
        </p>
      </Card>
    );
  }

  const username = status.username || "Ollama";
  const quests = status.quests;
  const doneCount = quests.filter((q) => q.done).length;
  const progress = quests.length > 0 ? Math.round((doneCount / quests.length) * 100) : 0;
  const phases = PHASES.map((phase, index) => ({
    ...phase,
    items: quests.filter((q) =>
      phase.quests.includes(q.id) ||
      (index === PHASES.length - 1 && !PHASES.some((p) => p.quests.includes(q.id)))
    ),
  })).map((phase) => ({ ...phase, done: phase.items.filter((q) => q.done).length }));
  const inventory = Object.entries(status.inventory).sort((a, b) => b[1] - a[1]);
  const objective = status.objective;
  const metrics = status.metrics;
  const decisions = (metrics.deterministicDecisions || 0) + (metrics.llmDecisions || 0);
  const llmShare = decisions > 0 ? Math.round(((metrics.llmDecisions || 0) / decisions) * 100) : 0;

  return (
    <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
      {/* LEFT COLUMN: identity, objective, inventory */}
      <div className="xl:col-span-1 flex flex-col gap-6">
        <Card className="relative overflow-hidden glass-card-blended ring-0 bg-card/40 backdrop-blur-xl shadow-xl p-6">
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] pointer-events-none -z-10"
            style={{ backgroundColor: status.running ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)" }}
          />
          <div className="flex items-center gap-4 mb-3 bg-black/40 p-3 rounded-xl shadow-inner">
            <div className="w-14 h-14 shrink-0 bg-black/60 rounded-md overflow-hidden flex items-center justify-center">
              <img
                src={`https://mc-heads.net/avatar/${username}/64`}
                alt={`${username} head`}
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold font-mono text-base text-foreground/90 truncate">{username}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`h-2 w-2 rounded-full animate-pulse ${status.running ? "bg-emerald-400" : "bg-amber-400"}`} />
                <span className={`text-xs font-bold ${status.running ? "text-emerald-400" : "text-amber-300"}`}>
                  {status.running ? "Mode autonome actif" : "En pause"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-black/20 rounded-xl py-1">
            <StatRow
              name="Vie"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-rose-400" />
                  {status.health !== null ? `${Math.round(status.health)} / 20` : "--"}
                </span>
              }
            />
            <StatRow
              name="Faim"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <Drumstick className="h-3.5 w-3.5 text-amber-400" />
                  {status.food !== null ? `${Math.round(status.food)} / 20` : "--"}
                </span>
              }
            />
            <StatRow
              name="Dimension"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5 text-muted-foreground/45" />
                  {status.dimension ? DIMENSIONS[status.dimension] || status.dimension : "--"}
                </span>
              }
            />
            <StatRow
              name="Position"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground/45" />
                  {status.position ? `${status.position.x}, ${status.position.y}, ${status.position.z}` : "--"}
                </span>
              }
            />
            <StatRow name="Uptime du bot" value={formatUptime(status.uptime_seconds)} />
          </div>
        </Card>

        <Card className="glass-card-blended ring-0 bg-card/40 backdrop-blur-xl shadow-xl p-6">
          <CardTitleRow
            icon={<Target className="h-4 w-4 text-violet-400" />}
            title="Objectif en cours"
            extra={
              objective?.manual ? (
                <span className="text-[10px] font-bold text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-md">MANUEL</span>
              ) : null
            }
          />
          <p className="text-lg font-bold text-foreground/90">
            {label(objective?.id)}
            {objective && objective.amount > 1 ? <span className="text-muted-foreground/60"> ×{objective.amount}</span> : null}
          </p>
          {objective?.directive && <p className="text-xs text-muted-foreground/60 mt-2 leading-relaxed">{objective.directive}</p>}
          {objective?.sub_goal && <p className="text-xs text-violet-300/80 mt-2 font-mono">→ {objective.sub_goal}</p>}
        </Card>

        <Card className="glass-card-blended ring-0 bg-card/40 backdrop-blur-xl shadow-xl p-6">
          <CardTitleRow
            icon={<Package className="h-4 w-4 text-violet-400" />}
            title="Inventaire"
            extra={<span className="text-[11px] font-bold font-mono text-zinc-400">{inventory.length} types</span>}
          />
          {inventory.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-1.5 max-h-[320px] overflow-y-auto pr-1.5 custom-scrollbar">
              {inventory.map(([item, count]) => (
                <div key={item} className="flex items-center justify-between p-2 rounded-lg bg-black/10">
                  <span className="text-xs text-foreground/80 truncate">{label(item)}</span>
                  <span className="text-xs font-bold font-mono text-zinc-300">×{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs font-medium text-muted-foreground/50 text-center py-6">Inventaire vide</p>
          )}
        </Card>
      </div>

      {/* RIGHT COLUMN: quest chain, activity, milestones, IA */}
      <div className="xl:col-span-2 flex flex-col gap-6">
        <Card className="glass-card-blended ring-0 bg-card/40 backdrop-blur-xl shadow-xl p-6">
          <CardTitleRow
            icon={<Bot className="h-4 w-4 text-violet-400" />}
            title="Progression"
            extra={
              <span className="text-[11px] font-bold font-mono text-zinc-400">
                {doneCount} <span className="font-normal text-zinc-600">/</span> {quests.length} · {progress}%
              </span>
            }
          />
          {/* One segment per world, each filled by its own share of finished quests */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {phases.map((phase) => {
              const share = phase.items.length > 0 ? Math.round((phase.done / phase.items.length) * 100) : 0;
              return (
                <div key={phase.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[11px] font-bold ${phase.text}`}>{phase.label}</span>
                    <span className="text-[10px] font-mono text-zinc-500">{phase.done}/{phase.items.length}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/30 overflow-hidden">
                    <div className={`h-full rounded-full ${phase.bar} transition-all duration-500`} style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-5">
            {phases.map((phase) => (
              <div key={phase.id}>
                <h4 className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${phase.text}`}>{phase.label}</h4>
                <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                  {phase.items.map((quest) => (
                    <li
                      key={quest.id}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${quest.current ? "bg-violet-500/10 ring-1 ring-violet-400/20" : ""}`}
                    >
                      {quest.done ? (
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className={`h-4 w-4 shrink-0 ${quest.current ? "text-violet-300 animate-pulse" : "text-zinc-700"}`} />
                      )}
                      <span
                        className={`text-sm truncate ${
                          quest.done ? "text-muted-foreground/50 line-through" : quest.current ? "text-violet-200 font-semibold" : "text-foreground/70"
                        }`}
                      >
                        {label(quest.id)}
                        {quest.amount > 1 ? <span className="text-muted-foreground/40 font-mono"> ×{quest.amount}</span> : null}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <Card className="glass-card-blended ring-0 bg-card/40 backdrop-blur-xl shadow-xl p-6">
            <CardTitleRow icon={<History className="h-4 w-4 text-violet-400" />} title="Dernières actions" />
            {status.recent_actions.length > 0 ? (
              <ul className="space-y-1.5">
                {status.recent_actions
                  .slice()
                  .reverse()
                  .map((action, index) => (
                    <li key={index} className="flex items-start gap-2.5 p-2 rounded-lg bg-black/10">
                      <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${action.success ? "bg-emerald-400" : "bg-rose-400"}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-foreground/80 truncate">
                          {action.action} {action.target && action.target !== "none" ? `· ${action.target}` : ""}
                        </p>
                        {action.message && <p className="text-[11px] text-muted-foreground/50 break-words line-clamp-2">{action.message}</p>}
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-xs font-medium text-muted-foreground/50 text-center py-6">Aucune action récente</p>
            )}
          </Card>

          <Card className="glass-card-blended ring-0 bg-card/40 backdrop-blur-xl shadow-xl p-6">
            <CardTitleRow icon={<Flag className="h-4 w-4 text-violet-400" />} title="Repères" />
            <div className="bg-black/20 rounded-xl py-1 mb-3">
              <StatRow
                name="Stronghold"
                value={status.stronghold?.reached ? "Atteint" : status.stronghold?.located ? "Localisé" : "Inconnu"}
              />
              <StatRow
                name="Portail de l'End"
                value={status.end_portal && status.end_portal.frame_count > 0 ? `${status.end_portal.filled_count} / ${status.end_portal.frame_count}` : "--"}
              />
              <StatRow name="Advancements" value={status.unlocked_advancements} />
            </div>
            {status.waypoints.length > 0 ? (
              <ul className="space-y-1.5">
                {status.waypoints.map((wp) => (
                  <li key={wp.name} className="flex items-center justify-between p-2 rounded-lg bg-black/10 gap-3">
                    <span className="text-xs text-foreground/80 truncate">{wp.name.replace(/_/g, " ")}</span>
                    <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                      {wp.x}, {wp.y}, {wp.z}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs font-medium text-muted-foreground/50 text-center py-3">Aucun repère enregistré</p>
            )}
          </Card>
        </div>

        <Card className="glass-card-blended ring-0 bg-card/40 backdrop-blur-xl shadow-xl p-6">
          <CardTitleRow icon={<Cpu className="h-4 w-4 text-violet-400" />} title="Activité de l'IA" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { name: "Décisions sans LLM", value: metrics.deterministicDecisions || 0 },
              { name: "Décisions via LLM", value: `${metrics.llmDecisions || 0} (${llmShare}%)` },
              { name: "Déblocages", value: metrics.recoveries || 0 },
              { name: "Tokens", value: (status.tokens.totalTokens || 0).toLocaleString("fr-FR") },
            ].map((item) => (
              <div key={item.name} className="bg-black/20 rounded-xl p-3">
                <p className="text-[11px] font-semibold text-muted-foreground/50">{item.name}</p>
                <p className="text-lg font-bold font-mono text-foreground/85 mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
