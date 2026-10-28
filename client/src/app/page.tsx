"use client";

import { useEffect, useState } from "react";
import { DashboardTemplate } from "@/components/templates/DashboardTemplate";
import { MetricsOverview } from "@/components/organisms/MetricsOverview";
import { ServicesSection } from "@/components/organisms/ServicesSection";
import { HistorySection } from "@/components/organisms/HistorySection";
import { DataTable } from "@/components/molecules/DataTable";
import { MinecraftSection } from "@/components/organisms/MinecraftSection";
import { BackupSection } from "@/components/organisms/BackupSection";
import { metricsService, backupsService } from "@/services/api";
import { SystemMetric, MinecraftStatus, BackupsStatusResponse } from "@/types";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import GlassSurface from "@/components/reactbits/GlassSurface";

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [latest, setLatest] = useState<SystemMetric | null>(null);
  const [history, setHistory] = useState<SystemMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "services" | "history" | "minecraft" | "backups">("dashboard");
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d" | "all">("30d");

  // Minecraft specific states
  const [minecraftStatus, setMinecraftStatus] = useState<MinecraftStatus | null>(null);
  const [minecraftLoading, setMinecraftLoading] = useState(false);

  // Backups specific states
  const [backupsStatus, setBackupsStatus] = useState<BackupsStatusResponse | null>(null);
  const [backupsLoading, setBackupsLoading] = useState(false);

  const fetchLatestData = async () => {
    try {
      const latestData = await metricsService.getLatest();
      setLatest(latestData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch latest metrics:", err);
      if (!latest) {
        setError("Échec de la récupération des données depuis le serveur.");
      }
    }
  };

  const fetchHistoryData = async () => {
    try {
      const historyData = await metricsService.getHistory(300);
      setHistory(historyData);
    } catch (err) {
      console.error("Failed to fetch history metrics:", err);
    }
  };

  const fetchMinecraftData = async (showLoading = false) => {
    try {
      if (showLoading) setMinecraftLoading(true);
      const data = await metricsService.getMinecraftStatus();
      setMinecraftStatus(data);
    } catch (err) {
      console.error("Failed to fetch Minecraft status:", err);
    } finally {
      if (showLoading) setMinecraftLoading(false);
    }
  };

  const fetchBackupsData = async (showLoading = false) => {
    try {
      if (showLoading) setBackupsLoading(true);
      const data = await backupsService.getStatus();
      setBackupsStatus(data);
    } catch (err) {
      console.error("Failed to fetch backups status:", err);
    } finally {
      if (showLoading) setBackupsLoading(false);
    }
  };

  // Initial load: fetch latest data only (loads instantly)
  useEffect(() => {
    const init = async () => {
      setIsMounted(true);
      setLoading(true);
      
      const savedTab = localStorage.getItem("nuc_active_tab");
      if (savedTab && ["dashboard", "services", "history", "minecraft", "backups"].includes(savedTab)) {
        setActiveTab(savedTab as any);
      }

      await Promise.all([fetchLatestData(), fetchBackupsData()]);
      setLoading(false);
    };
    init();
  }, []);

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("nuc_active_tab", activeTab);
    }
  }, [activeTab, isMounted]);

  // Fetch tab data when entering a tab that needs it
  useEffect(() => {
    if (isMounted) {
      if (activeTab === "history") {
        fetchHistoryData();
      } else if (activeTab === "minecraft") {
        fetchMinecraftData(true);
      } else if (activeTab === "backups") {
        fetchBackupsData(true);
      }
    }
  }, [activeTab, isMounted]);

  // Poll for data: poll latest every 5s, poll history every 30s if on history tab, poll minecraft every 5s if active
  useEffect(() => {
    if (isMounted) {
      const intervalLatest = setInterval(() => {
        fetchLatestData();
      }, 5000);

      const intervalHistory = setInterval(() => {
        if (activeTab === "history") {
          fetchHistoryData();
        }
      }, 30000);

      const intervalMinecraft = setInterval(() => {
        if (activeTab === "minecraft") {
          fetchMinecraftData();
        }
      }, 5000);

      const intervalBackups = setInterval(() => {
        if (activeTab === "backups") {
          fetchBackupsData();
        }
      }, 10000);

      return () => {
        clearInterval(intervalLatest);
        clearInterval(intervalHistory);
        clearInterval(intervalMinecraft);
        clearInterval(intervalBackups);
      };
    }
  }, [isMounted, activeTab]);

  const Title = (
    <div className="flex items-center gap-2.5">
      <div className="relative h-8 w-8 opacity-[0.65] shrink-0 select-none">
        <img
          src="https://beskarfox.com/Assets/img/Beskarfox_TW.png"
          alt="Beskarfox Logo"
          className="h-full w-full object-contain"
          style={{ filter: "sepia(1) saturate(5) hue-rotate(230deg)" }}
        />
      </div>
      <h1 className="text-xl tracking-tight text-violet-300 font-bold font-poppins">
        Dashboard
      </h1>
      {(loading || (activeTab === "minecraft" && minecraftLoading) || (activeTab === "backups" && backupsLoading)) && (
        <Loader2 className="h-4 w-4 animate-spin text-violet-400/60 ml-1.5 shrink-0" />
      )}
    </div>
  );

  const historyToolbar = (
    <GlassSurface
      borderRadius={12}
      className="p-1 rounded-xl shrink-0"
      contentClassName="flex items-center gap-1 p-0"
    >
      {(["all", "30d", "7d", "24h"] as const).map((range) => {
        const labels = {
          "24h": "24 heures",
          "7d": "7 jours",
          "30d": "30 jours",
          "all": "Tout"
        };
        return (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border-0 ${
              timeRange === range
                ? "bg-white/10 text-violet-300 shadow-sm"
                : "text-muted-foreground/70 hover:text-foreground bg-transparent"
            }`}
          >
            {labels[range]}
          </button>
        );
      })}
    </GlassSurface>
  );

  if (!isMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (error && !latest) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-destructive">Erreur</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={() => fetchLatestData()}>Réessayer</Button>
        </div>
      </div>
    );
  }

  return (
    <DashboardTemplate
      title={Title}
      refreshButton={null}
      overview={<MetricsOverview latest={latest} backupsStatus={backupsStatus} />}
      services={<ServicesSection latest={latest} />}
      charts={<HistorySection history={history} timeRange={timeRange} />}
      table={<DataTable data={history} />}
      minecraft={
        <MinecraftSection 
          status={minecraftStatus} 
          loading={minecraftLoading} 
          onRefresh={() => fetchMinecraftData(true)} 
        />
      }
      backups={
        <BackupSection
          status={backupsStatus}
          loading={backupsLoading}
        />
      }
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      deviceName={latest?.device_name}
      historyToolbar={historyToolbar}
    />
  );
}
