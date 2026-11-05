import { MetricCard } from "@/components/atoms/MetricCard";
import { SystemMetric, BackupsStatusResponse } from "@/types";
import { Cpu, HardDrive, ChartNoAxesColumnIncreasing, MemoryStick, Zap, ArrowUpDown } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { getServiceColor, SERVICE_COLORS } from "@/lib/colors";

interface MetricsOverviewProps {
  latest: SystemMetric | null;
  backupsStatus?: BackupsStatusResponse | null;
}

export const MetricsOverview = ({ latest, backupsStatus }: MetricsOverviewProps) => {
  if (!latest) return null;

  // 1. Calculate NVMe SSD breakdown
  const nvmeUsed = latest.disk_usage_gb || 0.0;
  const nvmeTotal = latest.disk_total_gb || 1.0;
  const nvmeFree = Math.max(0, parseFloat((nvmeTotal - nvmeUsed).toFixed(1)));
  const nvmePercent = ((nvmeUsed / nvmeTotal) * 100).toFixed(1);

  let servicesData: { name: string; value: number; color: string }[] = [];
  try {
    if (latest.disk_services_json) {
      const parsed = JSON.parse(latest.disk_services_json);
      let extraAutresGb = 0;
      const serviceItems: { name: string; value: number; color: string }[] = [];

      Object.entries(parsed)
        .filter(([name]) => name.toLowerCase() !== "autres" && name.toLowerCase() !== "disponible")
        .forEach(([name, val]) => {
          const value = typeof val === "number" ? val : 0;
          if (value < 0.101 && name.toLowerCase() !== "ollama") {
            extraAutresGb += value;
          } else if (value > 0) {
            const color = getServiceColor(name);
            serviceItems.push({ name, value, color });
          }
        });

      serviceItems.sort((a, b) => b.value - a.value);

      const autresKey = Object.keys(parsed).find(k => k.toLowerCase() === "autres") || "Autres";
      const autresVal = (parsed[autresKey] || 0) + extraAutresGb;

      servicesData = [
        ...serviceItems,
        { name: "Autres", value: autresVal, color: getServiceColor("autres") },
        { name: "Disponible", value: nvmeFree, color: SERVICE_COLORS.disponible }
      ].filter(item => item.name === "Disponible" || (item.name === "Autres" ? item.value >= 0.001 : item.value > 0));
    }
  } catch (e) {
    console.error("Failed to parse disk services JSON:", e);
  }

  if (servicesData.length === 0) {
    const statsMock = 1.2;
    const statsVal = Math.min(nvmeUsed, statsMock);
    const autresVal = Math.max(0, parseFloat((nvmeUsed - statsVal).toFixed(1)));

    servicesData = [
      { name: "Stats", value: statsVal, color: getServiceColor("stats") },
      { name: "Autres", value: autresVal, color: getServiceColor("autres") },
      { name: "Disponible", value: nvmeFree, color: SERVICE_COLORS.disponible }
    ].filter(item => item.name === "Disponible" || (item.name === "Autres" ? item.value >= 0.001 : item.value > 0));
  }

  // Real measured power only: no value is shown for rows without a RAPL source
  const hasMeasuredPower = !!latest.power_source && latest.power_usage_w !== null && latest.power_usage_w !== undefined;

  // 2. Calculate RAM memory breakdown
  const ramUsed = (latest.ram_usage_mb || 0.0) / 1024.0;
  const ramTotal = (latest.ram_total_mb || 1.0) / 1024.0;
  const ramFree = Math.max(0, parseFloat((ramTotal - ramUsed).toFixed(2)));
  const ramPercent = latest.ram_usage_percent.toFixed(1);

  let ramServicesData: { name: string; value: number; color: string }[] = [];
  try {
    if (latest.ram_services_json) {
      const parsed = JSON.parse(latest.ram_services_json);
      let extraAutresGb = 0;
      const serviceItems: { name: string; value: number; color: string }[] = [];

      Object.entries(parsed)
        .filter(([name]) => name.toLowerCase() !== "autres" && name.toLowerCase() !== "disponible")
        .forEach(([name, val]) => {
          const value = (typeof val === "number" ? val : 0) / 1024.0;
          if (value < 0.0976 && name.toLowerCase() !== "ollama") {
            extraAutresGb += value;
          } else if (value > 0) {
            const color = getServiceColor(name);
            serviceItems.push({ name, value, color });
          }
        });

      serviceItems.sort((a, b) => b.value - a.value);

      const knownServicesGb = serviceItems.reduce((acc, item) => acc + item.value, 0) + extraAutresGb;
      const autresGb = Math.max(0, ramUsed - knownServicesGb) + extraAutresGb;

      ramServicesData = [
        ...serviceItems,
        { name: "Autres", value: autresGb, color: getServiceColor("autres") },
        { name: "Disponible", value: ramFree, color: SERVICE_COLORS.disponible }
      ].filter(item => item.name === "Disponible" || (item.name === "Autres" ? item.value >= 0.001 : item.value > 0));
    }
  } catch (e) {
    console.error("Failed to parse RAM services JSON:", e);
  }

  if (ramServicesData.length === 0) {
    const statsMockGb = 0.15;
    const statsValGb = Math.min(ramUsed, statsMockGb);
    const autresValGb = Math.max(0, ramUsed - statsValGb);

    ramServicesData = [
      { name: "Stats", value: statsValGb, color: getServiceColor("stats") },
      { name: "Autres", value: autresValGb, color: getServiceColor("autres") },
      { name: "Disponible", value: ramFree, color: SERVICE_COLORS.disponible }
    ].filter(item => item.name === "Disponible" || (item.name === "Autres" ? item.value >= 0.001 : item.value > 0));
  }

  // 3. Calculate SATA SSD Backup breakdown
  const sataUsed = latest.disk_sata_usage_gb || 0.0;
  const sataTotal = latest.disk_sata_total_gb || 480.0;
  const sataFree = Math.max(0, parseFloat((sataTotal - sataUsed).toFixed(1)));
  const sataPercent = sataTotal > 0 ? ((sataUsed / sataTotal) * 100).toFixed(1) : "0.0";

  let sataServicesData: { name: string; value: number; color: string }[] = [];
  
  if (backupsStatus) {
    const mcBytes = backupsStatus.minecraft?.latest_backup?.size_bytes || 0;
    const ncBytes = backupsStatus.nextcloud?.latest_backup?.size_bytes || 0;
    const olBytes = backupsStatus.outline?.latest_backup?.size_bytes || 0;

    const mcCount = backupsStatus.minecraft?.total_backups_count || 1;
    const ncCount = backupsStatus.nextcloud?.total_backups_count || 1;
    const olCount = backupsStatus.outline?.total_backups_count || 1;

    const mcGb = parseFloat(((mcBytes * mcCount) / (1024 ** 3)).toFixed(1));
    const ncGb = parseFloat(((ncBytes * ncCount) / (1024 ** 3)).toFixed(1));
    const olGb = parseFloat(((olBytes * olCount) / (1024 ** 3)).toFixed(1));

    const totalBackupsGb = mcGb + ncGb + olGb;
    const autresSataGb = Math.max(0, parseFloat((sataUsed - totalBackupsGb).toFixed(1)));

    sataServicesData = [
      { name: "Minecraft", value: mcGb, color: getServiceColor("minecraft") },
      { name: "Nextcloud", value: ncGb, color: getServiceColor("nextcloud") },
      { name: "Outline", value: olGb, color: getServiceColor("outline") },
      { name: "Autres", value: autresSataGb, color: getServiceColor("autres") },
      { name: "Disponible", value: sataFree, color: SERVICE_COLORS.disponible },
    ].filter(item => item.name === "Disponible" || (item.name === "Autres" ? item.value >= 0.001 : item.value > 0));
  } else {
    // Balanced fallback split if backupsStatus is not yet available
    const third = parseFloat((sataUsed / 3).toFixed(1));
    sataServicesData = [
      { name: "Minecraft", value: third, color: getServiceColor("minecraft") },
      { name: "Nextcloud", value: third, color: getServiceColor("nextcloud") },
      { name: "Outline", value: third, color: getServiceColor("outline") },
      { name: "Disponible", value: sataFree, color: SERVICE_COLORS.disponible },
    ];
  }

  return (
    <div className="flex flex-col gap-16">
      {/* CPU & RAM Section */}
      <div className="flex flex-col gap-4 pt-6">
        <h2 className="font-poppins text-2xl font-bold tracking-wide text-zinc-400 ml-1">Utilisation</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-5">

          {/* CPU Card */}
          <MetricCard
            title="CPU"
            titleExtra={`${latest.cpu_temp}°C`}
            subTitle={latest.cpu_name || "Processeur"}
            value={latest.cpu_usage}
            unit="%"
            icon={<Cpu className="h-6 w-6" />}
            color="blue"
            variant="circle"
            className="md:col-span-2"
          />

          {/* RAM Service breakdown Donut Card */}
          <Card className="relative overflow-hidden glass-card-blended ring-0 bg-card/40 shadow-xl backdrop-blur-xl transition-shadow duration-150 ease-out group p-5 md:col-span-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 z-10 relative">
              {/* Left Details & Legend */}
              <div className="flex-1 flex flex-col gap-4 w-full">
                <div className="flex items-center gap-3">
                  <div className="text-[#ff2c4c] transition-all duration-300 shrink-0">
                    <MemoryStick className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col">
                    <CardTitle className="text-base font-bold tracking-wide text-foreground/90">Mémoire</CardTitle>
                    <span className="text-sm text-muted-foreground/55 font-semibold -mt-0.5">RAM</span>
                  </div>
                </div>

                {/* Legend Grid */}
                <div className="grid grid-cols-[max-content_max-content] gap-x-4 gap-y-1 mt-1">
                  {ramServicesData.filter(item => item.name !== "Autres" && item.name !== "Disponible").map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-foreground/90">{item.name} :</span>
                      <span className="text-muted-foreground">
                        {item.value >= 1.0
                          ? `${item.value.toFixed(1)} Go`
                          : `${(item.value * 1024).toFixed(0)} Mo`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* System Legend at the end */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {ramServicesData.filter(item => item.name === "Autres" || item.name === "Disponible").map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-foreground/90">{item.name} :</span>
                      <span className="text-muted-foreground">
                        {item.name === "Disponible"
                          ? `${item.value.toFixed(1)} Go`
                          : item.value >= 1.0
                            ? `${item.value.toFixed(1)} Go`
                            : `${(item.value * 1024).toFixed(0)} Mo`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Donut Chart */}
              <div className="relative h-32 w-32 shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ramServicesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={50}
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={3}
                      animationDuration={500}
                    >
                      {ramServicesData.map((entry, index) => (
                        <Cell key={`cell-ram-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="flex items-baseline text-foreground">
                    <span className="text-2xl font-semibold tracking-tight">{ramPercent}</span>
                    <span className="text-sm font-semibold text-muted-foreground/60 ml-0.5">%</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

        </div>
      </div>

      {/* Disks SSD Section */}
      <div className="flex flex-col gap-4">
        <h2 className="font-poppins text-2xl font-bold tracking-wide text-zinc-400 ml-1">Stockage</h2>
        <div className="flex flex-col gap-4">

          {/* NVMe SSD Service breakdown Donut Card */}
          <Card className="relative overflow-hidden glass-card-blended ring-0 bg-card/40 shadow-xl backdrop-blur-xl transition-shadow duration-150 ease-out group p-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 z-10 relative">
              {/* Left Details & Legend */}
              <div className="flex-1 flex flex-col gap-4 w-full">
                <div className="flex items-center gap-3">
                  <div className="text-[#f94a29] transition-all duration-300 shrink-0">
                    <HardDrive className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold tracking-wide text-foreground/90">SSD NVMe</CardTitle>
                      {latest && (
                        <span className="text-sm font-semibold text-muted-foreground/55 select-none ml-1">
                          {latest.disk_temp}°C
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground/55 font-semibold -mt-0.5">Système & Services</span>
                  </div>
                </div>

                {/* Legend Grid */}
                <div className="grid grid-cols-[max-content_max-content] gap-x-4 gap-y-1 mt-1">
                  {servicesData.filter(item => item.name !== "Autres" && item.name !== "Disponible").map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-foreground/90">{item.name} :</span>
                      <span className="text-muted-foreground">
                        {item.value >= 1.0
                          ? `${item.value.toFixed(1)} Go`
                          : `${(item.value * 1024).toFixed(0)} Mo`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* System Legend at the end */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {servicesData.filter(item => item.name === "Autres" || item.name === "Disponible").map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-foreground/90">{item.name} :</span>
                      <span className="text-muted-foreground">
                        {item.name === "Disponible"
                          ? `${item.value.toFixed(1)} Go`
                          : item.value >= 1.0
                            ? `${item.value.toFixed(1)} Go`
                            : `${(item.value * 1024).toFixed(0)} Mo`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Donut Chart */}
              <div className="relative h-32 w-32 shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={servicesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={50}
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={3}
                      animationDuration={500}
                    >
                      {servicesData.map((entry, index) => (
                        <Cell key={`cell-nvme-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="flex items-baseline text-foreground">
                    <span className="text-2xl font-semibold tracking-tight">{nvmePercent}</span>
                    <span className="text-sm font-semibold text-muted-foreground/60 ml-0.5">%</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* SSD SATA Backup Donut Card */}
          <Card className="relative overflow-hidden glass-card-blended ring-0 bg-card/40 shadow-xl backdrop-blur-xl transition-shadow duration-150 ease-out group p-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 z-10 relative">
              {/* Left Details & Legend */}
              <div className="flex-1 flex flex-col gap-4 w-full">
                <div className="flex items-center gap-3">
                  <div className="text-[#f59e0b] transition-all duration-300 shrink-0">
                    <HardDrive className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold tracking-wide text-foreground/90">SSD SATA</CardTitle>
                      {/* latest && (
                        <span className="text-sm font-semibold text-muted-foreground/55 select-none ml-1">
                          {latest.disk_sata_temp}°C
                        </span>
                      ) */}
                    </div>
                    <span className="text-sm text-muted-foreground/55 font-semibold -mt-0.5">Backups</span>
                  </div>
                </div>

                {/* Services Legend */}
                <div className="grid grid-cols-[max-content_max-content] gap-x-4 gap-y-1 mt-1">
                  {sataServicesData.filter(item => item.name !== "Autres" && item.name !== "Disponible").map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-foreground/90">{item.name} :</span>
                      <span className="text-muted-foreground">
                        {item.value >= 1.0
                          ? `${item.value.toFixed(1)} Go`
                          : `${(item.value * 1024).toFixed(0)} Mo`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Autres & Disponible Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {sataServicesData.filter(item => item.name === "Autres" || item.name === "Disponible").map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-foreground/90">{item.name} :</span>
                      <span className="text-muted-foreground">
                        {item.name === "Disponible"
                          ? `${item.value.toFixed(1)} Go`
                          : item.value >= 1.0
                            ? `${item.value.toFixed(1)} Go`
                            : `${(item.value * 1024).toFixed(0)} Mo`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Donut Chart */}
              <div className="relative h-32 w-32 shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sataServicesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={40}
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={3}
                      animationDuration={500}
                    >
                      {sataServicesData.map((entry, index) => (
                        <Cell key={`cell-sata-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="flex items-baseline text-foreground">
                    <span className="text-xl font-semibold tracking-tight">{sataPercent}</span>
                    <span className="text-xs font-semibold text-muted-foreground/60 ml-0.5">%</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

        </div>
      </div>

      {/* Others Section */}
      <div className="flex flex-col gap-4">
        <h2 className="font-poppins text-2xl font-bold tracking-wide text-zinc-400 ml-1">Activité</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <MetricCard
            title="Puissance"
            value={hasMeasuredPower ? latest.power_usage_w!.toFixed(1) : "—"}
            unit={hasMeasuredPower ? " W" : undefined}
            icon={<Zap className="h-6 w-6" />}
            description={
              !hasMeasuredPower
                ? "Mesure indisponible (RAPL non accessible)"
                : latest.power_source === "rapl-psys"
                  ? "Mesurée par RAPL (plateforme), hors disques et alimentation"
                  : "Mesurée par RAPL (CPU), hors disques et alimentation"
            }
            color="yellow"
          />
          <MetricCard
            title="Réseau"
            value={(latest.net_rx_mb + latest.net_tx_mb).toFixed(2)}
            unit=" Mo/s"
            icon={<ArrowUpDown className="h-6 w-6" />}
            description={`Entrant : ${latest.net_rx_mb.toFixed(2)} Mo/s • Sortant : ${latest.net_tx_mb.toFixed(2)} Mo/s`}
            color="indigo"
          />
          <MetricCard
            title="Temps d'activité"
            value={latest.uptime.split(',')[0]}
            icon={<ChartNoAxesColumnIncreasing className="h-6 w-6" />}
            description={latest.uptime.replace("actif depuis ", "")}
            color="yellow-muted"
          />
        </div>
      </div>
    </div>
  );
};
