import { useState } from "react";
import { MinecraftStatus, OllacraftStatus } from "@/types";
import { MinecraftSection } from "@/components/organisms/MinecraftSection";
import { OllacraftSection } from "@/components/organisms/OllacraftSection";
import { Server, Bot } from "lucide-react";

type MinecraftSubTab = "server" | "ollama";

interface MinecraftTabsProps {
  status: MinecraftStatus | null;
  loading: boolean;
  onRefresh: () => void;
  ollacraft: OllacraftStatus | null;
  ollacraftError?: string | null;
}

const SUB_TABS: { id: MinecraftSubTab; label: string; icon: typeof Server }[] = [
  { id: "server", label: "Serveur", icon: Server },
  { id: "ollama", label: "Ollama", icon: Bot },
];

export const MinecraftTabs = ({ status, loading, onRefresh, ollacraft, ollacraftError }: MinecraftTabsProps) => {
  const [subTab, setSubTab] = useState<MinecraftSubTab>("server");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 p-1 rounded-xl bg-black/20 w-fit">
        {SUB_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              subTab === id ? "bg-violet-500/15 text-violet-200" : "text-muted-foreground/60 hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {id === "ollama" && ollacraft?.online && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
          </button>
        ))}
      </div>

      {subTab === "server" ? (
        <MinecraftSection status={status} loading={loading} onRefresh={onRefresh} />
      ) : (
        <OllacraftSection status={ollacraft} loading={loading} fetchError={ollacraftError} />
      )}
    </div>
  );
};
