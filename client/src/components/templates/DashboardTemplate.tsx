import { ReactNode, useState, useEffect } from "react";
import { LayoutDashboard, Database, TrendingUp, Server, Sword } from "lucide-react";
import GlassSurface from "@/components/reactbits/GlassSurface";

interface DashboardTemplateProps {
  title: ReactNode;
  refreshButton?: ReactNode;
  overview: ReactNode;
  charts: ReactNode;
  table: ReactNode;
  services: ReactNode;
  minecraft?: ReactNode;
  backups?: ReactNode;
  activeTab: "dashboard" | "services" | "history" | "minecraft" | "backups";
  setActiveTab: (tab: "dashboard" | "services" | "history" | "minecraft" | "backups") => void;
  deviceName?: string;
  historyToolbar?: ReactNode;
}

export const DashboardTemplate = ({
  title,
  refreshButton,
  overview,
  charts,
  table,
  services,
  minecraft,
  backups,
  activeTab,
  setActiveTab,
  deviceName,
  historyToolbar
}: DashboardTemplateProps) => {
  const [timeString, setTimeString] = useState("");
  const gitVersion = process.env.NEXT_PUBLIC_GIT_COMMIT || "unknown";
  const tabs = ["dashboard", "history", "services", "minecraft", "backups"];
  const activeIndex = tabs.indexOf(activeTab);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setTimeString(`${hrs}:${mins}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="relative flex min-h-screen flex-col md:flex-row bg-background text-foreground overflow-hidden">
      <img src="https://reactbits.dev/assets/demo/night-sky.webp" alt="" className="fixed inset-0 w-full h-full object-cover pointer-events-none z-0" />

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-border/30 bg-zinc-950/20 backdrop-blur-xl z-20">
        <div className="flex flex-col h-full pt-6 pb-0 overflow-y-auto">
          {/* Logo / Title */}
          <div className="flex items-center px-6 mb-8 gap-2.5">
            <div className="flex-1">{title}</div>
          </div>

          {/* Nav Links */}
          <nav className="px-3 space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center w-full px-4 py-2.5 text-sm font-medium tracking-wide rounded-xl transition-all duration-200 group cursor-pointer focus:outline-none focus-visible:outline-none border-0 bg-transparent ${
                activeTab === "dashboard"
                  ? "text-violet-300"
                  : "text-muted-foreground/70 hover:text-foreground"
              }`}
            >
              <LayoutDashboard className={`mr-2.5 h-4 w-4 transition-colors duration-200 ${activeTab === "dashboard" ? "text-violet-300" : "text-muted-foreground/60 group-hover:text-foreground"}`} />
              Tableau de bord
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center w-full px-4 py-2.5 text-sm font-medium tracking-wide rounded-xl transition-all duration-200 group cursor-pointer focus:outline-none focus-visible:outline-none border-0 bg-transparent ${
                activeTab === "history"
                  ? "text-violet-300"
                  : "text-muted-foreground/70 hover:text-foreground"
              }`}
            >
              <TrendingUp className={`mr-2.5 h-4 w-4 transition-colors duration-200 ${activeTab === "history" ? "text-violet-300" : "text-muted-foreground/60 group-hover:text-foreground"}`} />
              Historique
            </button>
            <button
              onClick={() => setActiveTab("services")}
              className={`flex items-center w-full px-4 py-2.5 text-sm font-medium tracking-wide rounded-xl transition-all duration-200 group cursor-pointer focus:outline-none focus-visible:outline-none border-0 bg-transparent ${
                activeTab === "services"
                  ? "text-violet-300"
                  : "text-muted-foreground/70 hover:text-foreground"
              }`}
            >
              <Server className={`mr-2.5 h-4 w-4 transition-colors duration-200 ${activeTab === "services" ? "text-violet-300" : "text-muted-foreground/60 group-hover:text-foreground"}`} />
              Services
            </button>

            <button
              onClick={() => setActiveTab("minecraft")}
              className={`flex items-center w-full px-4 py-2.5 text-sm font-medium tracking-wide rounded-xl transition-all duration-200 group cursor-pointer focus:outline-none focus-visible:outline-none border-0 bg-transparent ${
                activeTab === "minecraft"
                  ? "text-violet-300"
                  : "text-muted-foreground/70 hover:text-foreground"
              }`}
            >
              <Sword className={`mr-2.5 h-4 w-4 transition-colors duration-200 ${activeTab === "minecraft" ? "text-violet-300" : "text-muted-foreground/60 group-hover:text-foreground"}`} />
              Minecraft
            </button>
            <button
              onClick={() => setActiveTab("backups")}
              className={`flex items-center w-full px-4 py-2.5 text-sm font-medium tracking-wide rounded-xl transition-all duration-200 group cursor-pointer focus:outline-none focus-visible:outline-none border-0 bg-transparent ${
                activeTab === "backups"
                  ? "text-violet-300"
                  : "text-muted-foreground/70 hover:text-foreground"
              }`}
            >
              <Database className={`mr-2.5 h-4 w-4 transition-colors duration-200 ${activeTab === "backups" ? "text-violet-300" : "text-muted-foreground/60 group-hover:text-foreground"}`} />
              Backups
            </button>
          </nav>

          {/* Refresh Action in Sidebar (Desktop) */}
          {refreshButton && (
            <div className="px-3 mt-auto mb-4">
              {refreshButton}
            </div>
          )}

          {/* Footer in Sidebar (Desktop) */}
          <div className={`${refreshButton ? "" : "mt-auto"} border-t border-border/30 bg-background/10 py-4 px-6 text-center text-[10px] text-muted-foreground/45 tracking-wider font-mono`}>
            ver. {gitVersion}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col md:pl-60 z-10">
        {/* Header - Mobile Only */}
        <header className="md:hidden sticky top-0 z-10 border-b border-border/30 bg-background/65 backdrop-blur-md transition-all">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
            {title}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground/45 tracking-wider pr-1">
                ver. {gitVersion}
              </span>
              {refreshButton && (
                <div className="scale-90 transform origin-right">
                  {refreshButton}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="container mx-auto max-w-7xl flex-grow px-4 sm:px-6 lg:px-8 py-8 pb-36 md:pb-16">
          <div className="flex flex-col gap-10">
            {activeTab === "dashboard" && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-end pr-4 md:pr-0 pt-4 pb-6">
                  <div className="font-poppins text-4xl md:text-7xl font-extrabold bg-clip-text text-transparent bg-gradient-to-br from-white/55 to-white/25 tracking-tight select-none">
                    {timeString || "--:--"}
                  </div>
                </div>
                {overview}
              </section>
            )}

            {activeTab === "services" && (
              <section className="pt-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="font-poppins text-3xl font-bold tracking-tight text-zinc-400 ml-1 mb-6">Services</h2>
                {services}
              </section>
            )}

            {activeTab === "history" && (
              <section className="pt-16 animate-in fade-in duration-200 space-y-16">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-row items-center justify-between gap-4 ml-1 flex-wrap w-full">
                    <h2 className="font-poppins text-3xl font-bold tracking-tight text-zinc-400">Historique</h2>
                    {historyToolbar}
                  </div>
                  {charts}
                </div>
                <div className="pt-8 space-y-6">
                  <h3 className="font-poppins text-2xl font-bold tracking-tight text-zinc-400 ml-1">Journaux bruts</h3>
                  {table}
                </div>
              </section>
            )}

            {activeTab === "minecraft" && minecraft && (
              <section className="pt-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="font-poppins text-3xl font-bold tracking-tight text-zinc-400 ml-1 mb-6">Minecraft</h2>
                {minecraft}
              </section>
            )}

            {activeTab === "backups" && backups && (
              <section className="pt-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="font-poppins text-3xl font-bold tracking-tight text-zinc-400 ml-1 mb-6">Backups</h2>
                {backups}
              </section>
            )}
          </div>
        </main>
      </div>

      {/* Bottom Nav Bar - Mobile Only */}
      <div className="md:hidden fixed bottom-5 inset-x-0 mx-4 z-40 flex justify-center">
        <GlassSurface 
          borderRadius={24}
          className="w-full max-w-[320px] px-2 py-2 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          contentClassName="w-full p-0"
        >
          <div className="relative w-full grid grid-cols-5">
            {/* Sliding active tab indicator */}
            <div 
              className="absolute inset-y-0 transition-all duration-300 ease-out pointer-events-none"
              style={{
                left: `${activeIndex * 20}%`,
                width: `20%`
              }}
            >
              <div className="w-full h-full bg-white/10 rounded-2xl" />
            </div>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`relative flex flex-col items-center gap-1 py-1.5 px-2 rounded-2xl transition-all duration-300 cursor-pointer border-0 bg-transparent ${
                activeTab === "dashboard" ? "text-violet-300 font-semibold" : "text-muted-foreground/60"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="text-[9px] font-medium tracking-wide">Aperçu</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`relative flex flex-col items-center gap-1 py-1.5 px-2 rounded-2xl transition-all duration-300 cursor-pointer border-0 bg-transparent ${
                activeTab === "history" ? "text-violet-300 font-semibold" : "text-muted-foreground/60"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span className="text-[9px] font-medium tracking-wide">Historique</span>
            </button>
            <button
              onClick={() => setActiveTab("services")}
              className={`relative flex flex-col items-center gap-1 py-1.5 px-2 rounded-2xl transition-all duration-300 cursor-pointer border-0 bg-transparent ${
                activeTab === "services" ? "text-violet-300 font-semibold" : "text-muted-foreground/60"
              }`}
            >
              <Server className="h-4 w-4" />
              <span className="text-[9px] font-medium tracking-wide">Services</span>
            </button>
            <button
              onClick={() => setActiveTab("minecraft")}
              className={`relative flex flex-col items-center gap-1 py-1.5 px-2 rounded-2xl transition-all duration-300 cursor-pointer border-0 bg-transparent ${
                activeTab === "minecraft" ? "text-violet-300 font-semibold" : "text-muted-foreground/60"
              }`}
            >
              <Sword className="h-4 w-4" />
              <span className="text-[9px] font-medium tracking-wide">Minecraft</span>
            </button>
            <button
              onClick={() => setActiveTab("backups")}
              className={`relative flex flex-col items-center gap-1 py-1.5 px-2 rounded-2xl transition-all duration-300 cursor-pointer border-0 bg-transparent ${
                activeTab === "backups" ? "text-violet-300 font-semibold" : "text-muted-foreground/60"
              }`}
            >
              <Database className="h-4 w-4" />
              <span className="text-[9px] font-medium tracking-wide">Backups</span>
            </button>
          </div>
        </GlassSurface>
      </div>
    </div>
  );
};
