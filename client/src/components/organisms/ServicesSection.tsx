import { SystemMetric } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, BookOpen, Activity, Cpu, HardDrive, Globe, ExternalLink } from "lucide-react";

interface ServicesSectionProps {
  latest: SystemMetric | null;
}

export const ServicesSection = ({ latest }: ServicesSectionProps) => {
  if (!latest) return null;

  // 1. Parse RAM services usage
  let ramUsage: Record<string, number> = {};
  try {
    if (latest.ram_services_json) {
      ramUsage = JSON.parse(latest.ram_services_json);
    }
  } catch (e) {
    console.error("Failed to parse RAM services JSON:", e);
  }

  // 2. Parse Disk services usage
  let diskUsage: Record<string, number> = {};
  try {
    if (latest.disk_services_json) {
      diskUsage = JSON.parse(latest.disk_services_json);
    }
  } catch (e) {
    console.error("Failed to parse Disk services JSON:", e);
  }

  // Track which backend keys were already mapped/consumed
  const consumedRamKeys = new Set<string>();
  const consumedDiskKeys = new Set<string>();

  const getServiceRAM = (key: string): number => {
    const kLower = key.toLowerCase();
    let total = 0;
    for (const [rKey, val] of Object.entries(ramUsage)) {
      if (rKey.toLowerCase() === kLower || rKey.toLowerCase().includes(kLower) || kLower.includes(rKey.toLowerCase())) {
        total += val;
        consumedRamKeys.add(rKey);
      }
    }
    return total;
  };

  const getServiceDisk = (key: string): number => {
    const kLower = key.toLowerCase();
    for (const [dKey, val] of Object.entries(diskUsage)) {
      if (dKey.toLowerCase() === kLower || dKey.toLowerCase().includes(kLower) || kLower.includes(dKey.toLowerCase())) {
        consumedDiskKeys.add(dKey);
        return val;
      }
    }
    return 0;
  };

  // 3. Define services list with resolved metrics, icons, colors, domains and names
  const servicesList = [
    {
      name: "Beskarfox",
      key: "Beskarfox",
      description: "Site principal",
      url: "https://beskarfox.com",
      displayUrl: "beskarfox.com",
      icon: <Globe className="h-6 w-6" />,
      color: "emerald",
      glowColor: "rgba(16, 185, 129, 0.12)",
      iconBg: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      hasMetrics: true,
      ram: getServiceRAM("Beskarfox"),
      disk: getServiceDisk("Beskarfox")
    },
    {
      name: "Nextcloud",
      key: "Nextcloud",
      description: "Stockage cloud",
      url: "https://cloud.beskarfox.com",
      displayUrl: "cloud.beskarfox.com",
      icon: <Cloud className="h-6 w-6" />,
      color: "blue",
      glowColor: "rgba(59, 130, 246, 0.12)",
      iconBg: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
      hasMetrics: true,
      ram: getServiceRAM("Nextcloud"),
      disk: getServiceDisk("Nextcloud")
    },
    {
      name: "Stats",
      key: "Stats",
      description: "Dashboard",
      url: "https://stats.beskarfox.com",
      displayUrl: "stats.beskarfox.com",
      icon: <Activity className="h-6 w-6" />,
      color: "purple",
      glowColor: "rgba(168, 85, 247, 0.12)",
      iconBg: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
      hasMetrics: true,
      ram: getServiceRAM("Stats"),
      disk: getServiceDisk("Stats")
    },
    {
      name: "Outline",
      key: "Outline",
      description: "Docs",
      url: "https://outline.beskarfox.com",
      displayUrl: "outline.beskarfox.com",
      icon: <BookOpen className="h-6 w-6" />,
      color: "indigo",
      glowColor: "rgba(99, 102, 241, 0.12)",
      iconBg: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
      hasMetrics: true,
      ram: getServiceRAM("Outline"),
      disk: getServiceDisk("Outline")
    },
  ];

  // Now create cards for other detected conteneurs/folders
  const unconsumedKeys = Array.from(new Set([
    ...Object.keys(ramUsage).filter(k => !consumedRamKeys.has(k)),
    ...Object.keys(diskUsage).filter(k => !consumedDiskKeys.has(k))
  ])).filter(key => {
    const lower = key.toLowerCase().trim();
    return (
      lower !== "autres" &&
      lower !== "docker images" &&
      lower !== "docker cache" &&
      lower !== "minecraft"
    );
  });

  const dynamicServices = unconsumedKeys.map((key, index) => {
    const colors = ["blue", "purple", "indigo", "emerald", "orange", "cyan"];
    const color = colors[index % colors.length];
    
    const colorMaps: Record<string, { glow: string; bg: string }> = {
      blue: { glow: "rgba(59, 130, 246, 0.12)", bg: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
      purple: { glow: "rgba(168, 85, 247, 0.12)", bg: "bg-purple-500/10 text-purple-400 border border-purple-500/20" },
      indigo: { glow: "rgba(99, 102, 241, 0.12)", bg: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" },
      emerald: { glow: "rgba(16, 185, 129, 0.12)", bg: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
      orange: { glow: "rgba(249, 74, 41, 0.12)", bg: "bg-orange-500/10 text-orange-400 border border-orange-500/20" },
      cyan: { glow: "rgba(6, 182, 212, 0.12)", bg: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" },
      amber: { glow: "rgba(245, 158, 11, 0.12)", bg: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
    };
    const isOllama = key.toLowerCase() === "ollama";
    const serviceColor = isOllama ? "amber" : color;
    const mapped = colorMaps[serviceColor] || colorMaps.blue;

    return {
      name: key,
      key: key,
      description: isOllama ? "Service IA local" : "Conteneur Docker / Service",
      url: "",
      displayUrl: "",
      icon: isOllama ? <Cpu className="h-6 w-6" /> : <Cloud className="h-6 w-6" />,
      color: serviceColor,
      glowColor: mapped.glow,
      iconBg: mapped.bg,
      hasMetrics: true,
      ram: ramUsage[key] || 0,
      disk: diskUsage[key] || 0
    };
  });

  // Helper function to render each service card
  const renderCard = (service: any) => {
    const memMb = service.ram || 0;
    const diskGb = service.disk || 0;
    const isActive = memMb > 0 || !service.hasMetrics;

    const formattedMem = memMb >= 1024
      ? `${(memMb / 1024).toFixed(1)} Go`
      : `${memMb.toFixed(0)} Mo`;

    return (
      <Card
        key={service.name}
        className="relative overflow-hidden glass-card-blended ring-0 bg-card/40 backdrop-blur-xl transition-shadow duration-150 ease-out shadow-xl group p-6 flex flex-col justify-between"
        style={{ "--glow": service.glowColor } as React.CSSProperties}
      >
        <div>
          {/* Header Block */}
          <div className="flex items-start gap-4 mb-6">
            <div className={`p-2.5 rounded-xl shrink-0 ${service.iconBg}`}>
              {service.icon}
            </div>
            <div className="flex flex-col">
              <CardTitle className="text-lg font-bold tracking-wide text-foreground/90">
                {service.name}
              </CardTitle>
              <span className="text-xs text-muted-foreground/60 leading-normal">
                {service.description}
              </span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            {service.hasMetrics ? (
              <>
                {/* RAM Usage Block */}
                <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground/50">
                    <Cpu className="h-3.5 w-3.5 text-muted-foreground/45" />
                    <span>Mémoire RAM</span>
                  </div>
                  <span className="text-lg font-semibold tracking-tight text-foreground/90">
                    {isActive ? formattedMem : "--"}
                  </span>
                </div>

                {/* Disk Space Block */}
                <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground/50">
                    <HardDrive className="h-3.5 w-3.5 text-muted-foreground/45" />
                    <span>Espace Disque</span>
                  </div>
                  <span className="text-lg font-semibold tracking-tight text-foreground/90">
                    {diskGb > 0 ? `${diskGb.toFixed(1)} Go` : "--"}
                  </span>
                </div>
              </>
            ) : (
              <div className="col-span-2 flex items-center justify-center p-6 rounded-xl bg-black/20  text-xs text-muted-foreground/50 font-medium text-center">
                TODO
              </div>
            )}
          </div>
        </div>

        {/* Link Footer */}
        {service.url && (
          <div className="mt-6 pt-4 border-t border-white/5 flex items-center">
            <a
              href={service.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-muted-foreground/75 hover:text-violet-300 transition-colors flex items-center gap-1.5 group/link"
            >
              <span>{service.displayUrl}</span>
              <ExternalLink className="h-3 w-3 opacity-60 transition-all" />
            </a>
          </div>
        )}
      </Card>
    );
  };

  // Combine all services and sort them by RAM usage (descending), then by Disk space (descending)
  const allServices = [...servicesList, ...dynamicServices];
  allServices.sort((a, b) => {
    const ramDiff = (b.ram || 0) - (a.ram || 0);
    if (ramDiff !== 0) return ramDiff;
    return (b.disk || 0) - (a.disk || 0);
  });

  const col1: any[] = [];
  const col2: any[] = [];
  allServices.forEach((service, index) => {
    if (index % 2 === 0) {
      col1.push(service);
    } else {
      col2.push(service);
    }
  });

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
      {/* Column 1 (Beskarfox & Stats) */}
      <div className="flex flex-col gap-6">
        {col1.map(renderCard)}
      </div>
      {/* Column 2 (Nextcloud & Outline) */}
      <div className="flex flex-col gap-6">
        {col2.map(renderCard)}
      </div>
    </div>
  );
};
