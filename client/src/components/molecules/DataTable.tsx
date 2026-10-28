import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SystemMetric } from "@/types";
import { format } from "date-fns";
import GlassSurface from "@/components/reactbits/GlassSurface";

interface DataTableProps {
  data: SystemMetric[];
}

export const DataTable = ({ data }: DataTableProps) => {
  return (
    <GlassSurface
      borderRadius={16}
      className="rounded-xl overflow-hidden shadow-xl w-full"
      contentClassName="w-full h-full block p-0"
    >
      <Table>
        <TableHeader className="bg-zinc-900/40">
          <TableRow className="border-b border-border/30 hover:bg-transparent">
            <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Date / Heure</TableHead>
            <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Utilisation CPU</TableHead>
            <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Temp. CPU</TableHead>
            <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Utilisation RAM</TableHead>
            <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Utilisation Disque</TableHead>
            <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Réseau Entrant</TableHead>
            <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Puissance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow className="border-b border-border/30">
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                Aucun journal de télémétrie enregistré.
              </TableCell>
            </TableRow>
          ) : (
            data.slice(0, 10).map((metric) => (
              <TableRow key={metric.id} className="border-b border-border/30 hover:bg-zinc-800/25 transition-colors duration-200">
                <TableCell className="px-4 py-3 font-medium text-muted-foreground/90">
                  {(() => {
                    try {
                      return format(new Date(metric.timestamp), "yyyy-MM-dd HH:mm:ss");
                    } catch (e) {
                      return metric.timestamp;
                    }
                  })()}
                </TableCell>
                <TableCell className="px-4 py-3 font-semibold text-foreground">{metric.cpu_usage}%</TableCell>
                <TableCell className="px-4 py-3 font-semibold text-foreground">{metric.cpu_temp}°C</TableCell>
                <TableCell className="px-4 py-3 font-semibold text-foreground">{metric.ram_usage_percent.toFixed(1)}%</TableCell>
                <TableCell className="px-4 py-3 font-semibold text-foreground">{((metric.disk_usage_gb / metric.disk_total_gb) * 100).toFixed(1)}%</TableCell>
                <TableCell className="px-4 py-3 font-semibold text-foreground">{metric.net_rx_mb} Mo/s</TableCell>
                <TableCell className="px-4 py-3 font-semibold text-foreground">{(metric.power_usage_w || 0).toFixed(1)} W</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </GlassSurface>
  );
};
