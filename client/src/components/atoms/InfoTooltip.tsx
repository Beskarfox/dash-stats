"use client";

import { Info } from "lucide-react";
import { ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface InfoTooltipProps {
  label: string;
  children: ReactNode;
}

// Minimum distance between the bubble and the edges of the screen
const VIEWPORT_MARGIN = 12;
const GAP = 8;
const MAX_WIDTH = 320;
// Duration of the fade/scale transition (ms), kept in sync with the `duration-150` class below
const TRANSITION_MS = 150;

type Position = { top: number; left: number; width: number };

/**
 * Small "i" icon revealing extra details.
 *
 * - Rendered in a portal on <body> with fixed positioning: never clipped by a card's `overflow-hidden`,
 *   and clamped to the viewport (flipped above the icon when there is no room below).
 * - Tap/click toggles it (works the same on every mobile browser); a real mouse also opens it on hover.
 * - Closes on outside tap, Escape, or when the icon scrolls out of view.
 */
export const InfoTooltip = ({ label, children }: InfoTooltipProps) => {
  const [open, setOpen] = useState(false); // mounted in the DOM
  const [shown, setShown] = useState(false); // visually shown: drives the enter/leave transition
  const hideTimer = useRef<number | undefined>(undefined);
  const showFrame = useRef<number | undefined>(undefined);
  const [position, setPosition] = useState<Position | null>(null);
  const pinnedRef = useRef(false); // opened by a click/tap: stays open until dismissed
  const triggerRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const id = useId();

  // Position from the icon only (the bubble's height is estimated until it is measured)
  const computePosition = useCallback((bubbleHeight = 0): Position | null => {
    const trigger = triggerRef.current;
    if (!trigger) return null;
    const t = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(MAX_WIDTH, vw - 2 * VIEWPORT_MARGIN);

    let left = t.left + t.width / 2 - width / 2;
    left = Math.min(Math.max(left, VIEWPORT_MARGIN), vw - width - VIEWPORT_MARGIN);

    let top = t.bottom + GAP;
    if (bubbleHeight && top + bubbleHeight > vh - VIEWPORT_MARGIN && t.top - GAP - bubbleHeight >= VIEWPORT_MARGIN) {
      top = t.top - GAP - bubbleHeight;
    }
    return { top, left, width };
  }, []);

  const show = useCallback(() => {
    window.clearTimeout(hideTimer.current);
    setPosition(computePosition());
    setOpen(true);
    // Two frames: the bubble is first painted in its hidden state, so the transition always plays
    // (also when reopened while it was still fading out)
    if (showFrame.current) window.cancelAnimationFrame(showFrame.current);
    showFrame.current = window.requestAnimationFrame(() => {
      showFrame.current = window.requestAnimationFrame(() => setShown(true));
    });
  }, [computePosition]);

  // Fade out first, then unmount once the transition is over
  const hide = useCallback(() => {
    pinnedRef.current = false;
    if (showFrame.current) window.cancelAnimationFrame(showFrame.current);
    setShown(false);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setOpen(false), TRANSITION_MS);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(hideTimer.current);
      if (showFrame.current) window.cancelAnimationFrame(showFrame.current);
    },
    []
  );

  // Once rendered, flip above the icon if the measured bubble does not fit below
  useLayoutEffect(() => {
    if (!open || !bubbleRef.current) return;
    const next = computePosition(bubbleRef.current.offsetHeight);
    if (next) setPosition(prev => (prev && prev.top === next.top && prev.left === next.left && prev.width === next.width ? prev : next));
  }, [open, computePosition]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: Event) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !bubbleRef.current?.contains(target)) hide();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    const onScrollOrResize = () => {
      const t = triggerRef.current?.getBoundingClientRect();
      if (!t || t.bottom < 0 || t.top > window.innerHeight) hide();
      else setPosition(computePosition(bubbleRef.current?.offsetHeight ?? 0));
    };
    // Registered on the next tick so the tap that opened the bubble can never close it
    const timer = window.setTimeout(() => {
      document.addEventListener("click", onOutside, true);
      document.addEventListener("keydown", onKeyDown);
      window.addEventListener("scroll", onScrollOrResize, true);
      window.addEventListener("resize", onScrollOrResize);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("click", onOutside, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, hide, computePosition]);

  const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={shown}
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          e.stopPropagation();
          if (shown && pinnedRef.current) {
            hide();
          } else {
            pinnedRef.current = true;
            show();
          }
        }}
        onMouseEnter={() => {
          if (canHover() && !shown) show();
        }}
        onMouseLeave={() => {
          if (canHover() && !pinnedRef.current) hide();
        }}
        className={`relative inline-flex h-6 w-6 -m-1 items-center justify-center rounded-full cursor-pointer touch-manipulation transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-400/60 ${
          shown ? "text-violet-300" : "text-muted-foreground/50 hover:text-violet-300"
        }`}
      >
        <Info className="h-3.5 w-3.5 pointer-events-none" />
      </button>
      {open &&
        position &&
        createPortal(
          <div
            ref={bubbleRef}
            id={id}
            role="tooltip"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: 100,
              // Blurred glass background, set inline so it applies on every browser (Firefox included)
              backdropFilter: "blur(20px) saturate(140%)",
              WebkitBackdropFilter: "blur(20px) saturate(140%)",
            }}
            className={`rounded-xl py-2.5 px-3.5 text-xs text-card-foreground bg-white/5 border border-white/10 shadow-xl whitespace-normal transition-[opacity,scale,translate] duration-150 ease-out origin-top motion-reduce:transition-none ${
              shown ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-1"
            }`}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
};
