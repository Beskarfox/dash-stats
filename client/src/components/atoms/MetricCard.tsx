import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface MetricCardProps {
  title: ReactNode;
  titleExtra?: string;
  subTitle?: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  description?: string;
  color?: "blue" | "red" | "orange" | "yellow" | "yellow-muted" | "indigo";
  variant?: "progress" | "circle";
  className?: string;
}

export const MetricCard = ({
  title,
  titleExtra,
  subTitle,
  value,
  unit,
  icon,
  description,
  color = "indigo",
  variant = "progress",
  className
}: MetricCardProps) => {
  const numericValue = Number(value);
  const isPercent = unit === "%";

  const colorConfig = {
    blue: {
      bar: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]",
      stroke: "stroke-blue-500 drop-shadow-[0_0_4px_rgba(59,130,246,0.4)]",
      iconColor: "text-blue-400",
      cardStyle: "",
    },
    red: {
      bar: "bg-[#ff2c4c] shadow-[0_0_8px_rgba(255,44,76,0.5)]",
      stroke: "stroke-[#ff2c4c] drop-shadow-[0_0_4px_rgba(255,44,76,0.4)]",
      iconColor: "text-[#ff2c4c]",
      cardStyle: "",
    },
    orange: {
      bar: "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]",
      stroke: "stroke-orange-500 drop-shadow-[0_0_4px_rgba(249,115,22,0.4)]",
      iconColor: "text-orange-400",
      cardStyle: "",
    },
    yellow: {
      bar: "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]",
      stroke: "stroke-yellow-500 drop-shadow-[0_0_4px_rgba(234,179,8,0.5)]",
      iconColor: "text-yellow-400",
      cardStyle: "",
    },
    "yellow-muted": {
      bar: "bg-yellow-500/60 shadow-[0_0_6px_rgba(234,179,8,0.3)]",
      stroke: "stroke-yellow-500/60 drop-shadow-[0_0_3px_rgba(234,179,8,0.3)]",
      iconColor: "text-yellow-400/60",
      cardStyle: "",
    },
    indigo: {
      bar: "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]",
      stroke: "stroke-indigo-500 drop-shadow-[0_0_4px_rgba(99,102,241,0.4)]",
      iconColor: "text-indigo-400",
      cardStyle: "",
    },
  };

  const currentColors = colorConfig[color] || colorConfig.indigo;

  // Circle dimensions
  const radius = 38;
  const strokeWidth = 5.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isNaN(numericValue)
    ? circumference
    : circumference - (Math.min(Math.max(numericValue, 0), 100) / 100) * circumference;

  const isLongValue = typeof value === "string" && value.length > 8;
  const isPower = unit === " W";
  const valueClass = isLongValue 
    ? "text-lg font-bold text-foreground/90 tracking-tight" 
    : isPower 
      ? "text-2xl font-bold tracking-tight text-foreground" 
      : "text-3xl font-extrabold tracking-tight text-foreground";
  const unitClass = isPower 
    ? "text-xs font-semibold text-muted-foreground/45 ml-0.5" 
    : "text-sm font-semibold text-muted-foreground/70 ml-1";

  if (variant === "circle") {
    return (
      <Card className={`relative overflow-hidden glass-card-blended ring-0 bg-card/40 shadow-xl backdrop-blur-xl transition-shadow duration-150 ease-out ${currentColors.cardStyle} group p-5 flex flex-col justify-center h-full ${className || ""}`}>
        <div className="flex flex-row items-center justify-between gap-4 z-10 relative w-full">
          {/* Left info block */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {icon && (
                <div className={`${currentColors.iconColor} transition-all duration-300 shrink-0`}>
                  {icon}
                </div>
              )}
              <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold tracking-wide text-foreground/90">{title}</CardTitle>
                {titleExtra && (
                  <span className="text-sm font-semibold text-muted-foreground/55 select-none ml-1">
                    {titleExtra}
                  </span>
                )}
              </div>
              {subTitle && <span className="text-sm text-muted-foreground/55 font-semibold -mt-0.5">{subTitle}</span>}
            </div>
            </div>

            {description && (
              <p className="text-sm font-medium tracking-wide text-muted-foreground/65">
                {description}
              </p>
            )}
          </div>

          {/* Right SVG Circle block */}
          <div className="relative flex items-center justify-center h-24 w-24 shrink-0 self-center my-auto">
            <svg className="transform -rotate-90" width={96} height={96} viewBox="0 0 96 96">
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-white/10"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                className={currentColors.stroke}
                style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-extrabold tracking-tight text-foreground">{value}</span>
              {unit && <span className="text-xs font-bold text-muted-foreground/50">{unit}</span>}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`relative overflow-hidden glass-card-blended ring-0 bg-card/40 shadow-xl backdrop-blur-xl transition-shadow duration-150 ease-out ${currentColors.cardStyle} group ${className || ""}`}>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2 z-10">
        {icon && (
          <div className={`${currentColors.iconColor} transition-all duration-300 shrink-0`}>
            {icon}
          </div>
        )}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
          <CardTitle className="text-base font-bold tracking-wide text-foreground/90">{title}</CardTitle>
          {titleExtra && (
            <span className="text-sm font-semibold text-muted-foreground/55 select-none ml-1">
              {titleExtra}
            </span>
          )}
        </div>
          {subTitle && <span className="text-sm text-muted-foreground/55 font-semibold -mt-0.5">{subTitle}</span>}
        </div>
      </CardHeader>
      <CardContent className="z-10">
        <div className="text-3xl font-extrabold tracking-tight text-foreground flex items-baseline">
          <span className={valueClass}>{value}</span>
          {unit && <span className={unitClass}>{unit}</span>}
        </div>

        {isPercent && !isNaN(numericValue) && (
          <div className="mt-3.5 w-full bg-zinc-800/50 rounded-full h-1.5 overflow-hidden border border-border/30">
            <div
              className={`h-full rounded-full transition-all duration-500 ${currentColors.bar}`}
              style={{ width: `${Math.min(Math.max(numericValue, 0), 100)}%` }}
            />
          </div>
        )}

        {description && (
          <p className="text-sm font-medium tracking-wide text-muted-foreground/65 mt-2">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
