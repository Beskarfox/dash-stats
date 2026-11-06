import { MetricChart } from "@/components/molecules/MetricChart";
import { SystemMetric } from "@/types";

// Electricity price used to convert the measured energy into a cost
const PRICE_EUR_PER_KWH = 0.18;

interface HistorySectionProps {
  history: SystemMetric[];
  timeRange: "24h" | "7d" | "30d" | "all";
}

export const HistorySection = ({ history, timeRange }: HistorySectionProps) => {
  const reversedHistory = [...history].reverse();

  // Filter data points based on selected timeRange
  const filterData = (data: typeof reversedHistory) => {
    if (timeRange === "all") return data;
    const limitDate = new Date();
    if (timeRange === "24h") {
      limitDate.setHours(limitDate.getHours() - 24);
    } else if (timeRange === "7d") {
      limitDate.setDate(limitDate.getDate() - 7);
    } else if (timeRange === "30d") {
      limitDate.setDate(limitDate.getDate() - 30);
    }
    return data.filter(item => new Date(item.timestamp) >= limitDate);
  };

  const filteredHistory = filterData(reversedHistory);

  // Cumulative cost from the energy actually measured by RAPL between two collections (energy_wh).
  // Rows without a measurement (older estimated rows, RAPL unavailable) add nothing, and their
  // power is hidden (null = gap in the chart) instead of showing an estimated value.
  let cumulativeCost = 0.0;
  const historyWithCumulative = filteredHistory.map((item) => {
    cumulativeCost += ((item.energy_wh ?? 0) / 1000.0) * PRICE_EUR_PER_KWH;
    return {
      ...item,
      power_usage_w: item.power_source ? item.power_usage_w : null,
      cumulative_cost_eur: parseFloat(cumulativeCost.toFixed(3))
    };
  });

  // Downsample helper to prevent rendering lag on large timeframes
  const downsample = (data: any[], maxPoints = 150) => {
    if (data.length <= maxPoints) return data;
    const step = Math.ceil(data.length / maxPoints);
    const sampled = [];
    for (let i = 0; i < data.length; i += step) {
      sampled.push(data[i]);
    }
    if (sampled.length > 0 && data.length > 0 && sampled[sampled.length - 1].id !== data[data.length - 1].id) {
      sampled.push(data[data.length - 1]);
    }
    return sampled;
  };

  const chartData = downsample(historyWithCumulative, 150);

  return (
    <div className="flex flex-col gap-16">
      {/* Section Utilisation */}
      <div className="flex flex-col gap-4 pt-20">
        <h2 className="font-poppins text-2xl font-bold tracking-wide text-zinc-400 ml-1">Utilisation</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <MetricChart
            title="Température CPU"
            data={chartData}
            dataKey="cpu_temp"
            color="#3b82f6"
            unit="°C"
          />
          <MetricChart
            title="Utilisation CPU"
            data={chartData}
            dataKey="cpu_usage"
            color="#60a5fa"
            unit="%"
          />
          <MetricChart
            title="Utilisation RAM"
            data={chartData}
            dataKey="ram_usage_percent"
            color="#ff2c4c"
            unit="%"
          />
        </div>
      </div>

      {/* Section Activité */}
      <div className="flex flex-col gap-4">
        <h2 className="font-poppins text-2xl font-bold tracking-wide text-zinc-400 ml-1">Activité</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <MetricChart
            title="Usage Réseau (Entrant)"
            data={chartData}
            dataKey="net_rx_mb"
            color="#8b5cf6"
            unit=" Mo/s"
          />
          <MetricChart
            title="Usage Réseau (Sortant)"
            data={chartData}
            dataKey="net_tx_mb"
            color="#6366f1"
            unit=" Mo/s"
          />
          <MetricChart
            title="Puissance mesurée (RAPL)"
            data={chartData}
            dataKey="power_usage_w"
            color="#eab308"
            unit=" W"
          />
          <MetricChart
            title="Coût électrique cumulé (énergie mesurée, 0,18 €/kWh)"
            data={chartData}
            dataKey="cumulative_cost_eur"
            color="#10b981"
            unit=" €"
          />
        </div>
      </div>
    </div>
  );
};
