"use client";

import { useEffect, useState, useRef } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ZoomIn, X } from "lucide-react";

interface MetricChartProps {
  title: string;
  data: any[];
  dataKey: string;
  color?: string;
  unit?: string;
}

export const MetricChart = ({ title, data, dataKey, color = "#2563eb", unit = "" }: MetricChartProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isMouseOver, setIsMouseOver] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  const modalChartRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag-to-scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Lock body scroll when modal is open to prevent page scrolling on zoom out
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  // Reset modal zoom when modal is closed
  useEffect(() => {
    if (!isModalOpen) {
      setZoomScale(1);
      setIsDragging(false);
    }
  }, [isModalOpen]);

  // Handle closing sequence with timeout to let transition complete
  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
    }, 280); // matching tailwind duration-300 transition-all
  };

  // Close modal on Escape key press
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen]);

  // Prevent vertical page scroll and execute wheel zoom inside the modal
  useEffect(() => {
    if (!isModalOpen) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        setZoomScale(prev => {
          const step = 0.5;
          const nextScale = prev + (e.deltaY < 0 ? step : -step);
          return Math.min(4, Math.max(1, nextScale));
        });
      }
    };

    const el = containerRef.current;
    if (el) {
      el.addEventListener("wheel", handleWheel, { passive: false });
    }
    return () => {
      if (el) {
        el.removeEventListener("wheel", handleWheel);
      }
    };
  }, [isModalOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    // Only drag with primary mouse button
    if (e.button !== 0) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeftState(containerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // drag speed multiplier
    containerRef.current.scrollLeft = scrollLeftState - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Custom tool-tip component for the main inline chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && isMouseOver && payload && payload.length) {
      let formattedLabel = label;
      try {
        formattedLabel = format(new Date(label), 'PPP HH:mm:ss', { locale: fr });
      } catch (e) {}

      return (
        <div className="flex flex-col gap-2 rounded-xl py-2.5 px-3.5 text-xs text-card-foreground glass-card-blended shadow-xl bg-card/40 backdrop-blur-xl">
          <p className="font-medium text-muted-foreground/80">{formattedLabel}</p>
          <p className="font-extrabold text-foreground text-sm flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full inline-block animate-pulse" style={{ backgroundColor: color }} />
            {payload[0].value ?? "—"}
            {payload[0].value != null && <span className="text-xs font-semibold text-muted-foreground/80">{unit}</span>}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tool-tip component for the large modal chart (exact visual match)
  const CustomTooltipModal = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      let formattedLabel = label;
      try {
        formattedLabel = format(new Date(label), 'PPP HH:mm:ss', { locale: fr });
      } catch (e) {}

      return (
        <div className="flex flex-col gap-2 rounded-xl py-2.5 px-3.5 text-xs text-card-foreground glass-card-blended shadow-xl bg-card/40 backdrop-blur-xl">
          <p className="font-medium text-muted-foreground/80">{formattedLabel}</p>
          <p className="font-extrabold text-foreground text-sm flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full inline-block animate-pulse" style={{ backgroundColor: color }} />
            {payload[0].value ?? "—"}
            {payload[0].value != null && <span className="text-xs font-semibold text-muted-foreground/80">{unit}</span>}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!isMounted) {
    return (
      <Card className="col-span-1 rounded-xl bg-card/40 transition-all duration-300 shadow-xl animate-pulse">
        <CardHeader className="pb-4">
          <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full flex items-center justify-center text-muted-foreground/30 text-xs font-medium">
            Loading trend...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="col-span-1 rounded-xl bg-card/40 transition-all duration-300 shadow-xl group relative overflow-hidden">
        <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0 relative z-20">
          <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase select-none">{title}</CardTitle>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 relative z-30"
            title="Agrandir le graphique"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </CardHeader>
        <CardContent>
          <div
            className="h-[200px] w-full cursor-pointer"
            onClick={() => setIsModalOpen(true)}
            onMouseEnter={() => setIsMouseOver(true)}
            onMouseLeave={() => setIsMouseOver(false)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.04)" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 9, fill: "#a1a1aa" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(str) => {
                    try {
                      return format(new Date(str), 'HH:mm');
                    } catch (e) {
                      return str;
                    }
                  }}
                  stroke="transparent"
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#a1a1aa" }}
                  tickLine={false}
                  axisLine={false}
                  stroke="transparent"
                  unit={unit}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={isMouseOver ? { stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 } : false}
                  wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', outline: 'none' }}
                />
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#color${dataKey})`}
                  activeDot={isMouseOver}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Modal View */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10">
          {/* Backdrop Overlay */}
          <div
            onClick={closeModal}
            className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-all duration-300 ${
              isClosing ? "animate-out fade-out" : "animate-in fade-in"
            }`}
          />

          {/* Modal Content Card */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`rounded-2xl w-full max-w-5xl p-6 md:p-8 shadow-2xl relative flex flex-col gap-6 overflow-hidden transition-all duration-300 z-10 ${
              isClosing ? "animate-out fade-out zoom-out-95" : "animate-in fade-in zoom-in-95"
            }`}
          >
            {/* Glassy Background (avoids nested backdrop-filter issue) */}
            <div className="absolute inset-0 bg-card/40 backdrop-blur-2xl rounded-2xl -z-10 pointer-events-none" />
            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeModal();
              }}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/15 text-muted-foreground hover:text-foreground cursor-pointer transition-all flex items-center justify-center z-50"
              title="Fermer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header & Controls */}
            <div className="flex justify-between items-center pr-12 flex-wrap gap-4 border-b border-white/5 pb-4 z-10">
              <div>
                <h3 className="font-poppins text-xl font-bold text-zinc-300 tracking-wide">
                  {title}
                </h3>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Glissez pour déplacer, la molette ou les boutons pour zoomer
                </p>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-2 bg-zinc-900/60 p-1 rounded-xl backdrop-blur-md">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomScale(prev => Math.max(1, prev - 0.5));
                  }}
                  className="w-8 h-8 flex items-center justify-center text-sm font-semibold rounded-lg hover:bg-white/10 text-violet-300 border-0 cursor-pointer transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                  disabled={zoomScale <= 1}
                  title="Zoom Arrière"
                >
                  ➖
                </button>
                <span className="text-xs font-semibold text-zinc-400 min-w-12 text-center select-none">
                  {zoomScale}x
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomScale(prev => Math.min(4, prev + 0.5));
                  }}
                  className="w-8 h-8 flex items-center justify-center text-sm font-semibold rounded-lg hover:bg-white/10 text-violet-300 border-0 cursor-pointer transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                  disabled={zoomScale >= 4}
                  title="Zoom Avant"
                >
                  ➕
                </button>
              </div>
            </div>

            {/* Large Scrollable Chart Viewport Wrapper (Seamless/No Nested Border or Box BG) */}
            <div className="flex flex-row w-full h-[400px] overflow-hidden z-10">

              {/* Sticky Y-Axis Column (Seamlessly transparent, no border-r) */}
              <div className="w-[50px] h-full shrink-0 bg-transparent pr-1.5 pb-2 select-none flex flex-col justify-between">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 25 }}>
                    <XAxis
                      dataKey="timestamp"
                      tick={false}
                      tickLine={false}
                      axisLine={false}
                      stroke="transparent"
                    />
                    <YAxis
                      dataKey={dataKey}
                      tick={{ fontSize: 10, fill: "#8a8a93" }}
                      tickLine={false}
                      axisLine={false}
                      stroke="transparent"
                      unit={unit}
                    />
                    <Area
                      type="monotone"
                      dataKey={dataKey}
                      stroke="transparent"
                      fill="transparent"
                      activeDot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Large Scrollable Chart Container */}
              <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={`flex-1 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent ${
                  isDragging ? "cursor-grabbing select-none" : "cursor-grab"
                }`}
              >
                <div
                  ref={modalChartRef}
                  className="h-full transition-all duration-300"
                  style={{ width: `${zoomScale * 100}%`, minWidth: "100%" }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 20, left: -25, bottom: 25 }}>
                      <defs>
                        <linearGradient id={`modalColor${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.04)" />
                      <XAxis
                        dataKey="timestamp"
                        tick={{ fontSize: 10, fill: "#a1a1aa" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(str) => {
                          try {
                            return format(new Date(str), 'dd/MM HH:mm', { locale: fr });
                          } catch (e) {
                            return str;
                          }
                        }}
                        stroke="transparent"
                      />
                      <YAxis hide={true} dataKey={dataKey} />
                      <Tooltip
                        content={<CustomTooltipModal />}
                        cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
                        wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', outline: 'none' }}
                        allowEscapeViewBox={{ x: true, y: true }}
                      />
                      <Area
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill={`url(#modalColor${dataKey})`}
                        activeDot={true}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
