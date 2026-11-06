import { Info } from "lucide-react";
import { ReactNode } from "react";

interface InfoTooltipProps {
  label: string;
  children: ReactNode;
  align?: "left" | "right";
}

/**
 * Small "i" icon revealing extra details on hover, keyboard focus or tap (focus on mobile).
 */
export const InfoTooltip = ({ label, children, align = "left" }: InfoTooltipProps) => (
  <span className="relative inline-flex group/info">
    <button
      type="button"
      aria-label={label}
      className="inline-flex items-center justify-center rounded-full text-muted-foreground/50 hover:text-foreground/80 focus-visible:text-foreground/80 focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40 transition-colors"
    >
      <Info className="h-3.5 w-3.5" />
    </button>
    <span
      role="tooltip"
      className={`pointer-events-none absolute top-full z-50 mt-2 w-max max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-border/40 bg-zinc-900/95 px-3 py-2 text-xs font-normal text-foreground/90 shadow-xl backdrop-blur-xl opacity-0 invisible transition-opacity duration-150 group-hover/info:opacity-100 group-hover/info:visible group-focus-within/info:opacity-100 group-focus-within/info:visible ${align === "right" ? "right-0" : "left-0"}`}
    >
      {children}
    </span>
  </span>
);
