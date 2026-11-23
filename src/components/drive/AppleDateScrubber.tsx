import { useEffect, useRef, useState, useCallback } from "react";
import type { DateGroup } from "@/utils/dateGrouping";
import { cx } from "@/utils/cx";

export interface AppleDateScrubberProps {
  groups: DateGroup[];
}

export function AppleDateScrubber({ groups }: AppleDateScrubberProps) {
  // Only display the scrubber if there are at least 2 distinct date groups
  if (groups.length <= 1) return null;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const showScrubberTemporarily = useCallback(() => {
    setIsVisible(true);
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      if (!isDraggingRef.current) {
        setIsVisible(false);
      }
    }, 1800);
  }, []);

  // Listen to window scroll to detect which date group is in view
  useEffect(() => {
    const handleScroll = () => {
      if (isDraggingRef.current) return;
      showScrubberTemporarily();

      const headerOffset = 180;

      // Find the group currently closest to the top of the viewport
      let closestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < groups.length; i++) {
        const el = document.getElementById(`date-group-${groups[i].dateKey}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const distance = Math.abs(rect.top - headerOffset);
          if (rect.top <= headerOffset + 120 && distance < minDistance) {
            minDistance = distance;
            closestIdx = i;
          }
        }
      }

      setActiveIndex(closestIdx);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [groups, showScrubberTemporarily]);

  // Scroll to a specific date group
  const scrollToGroup = useCallback(
    (index: number, instant = false) => {
      const clamped = Math.max(0, Math.min(index, groups.length - 1));
      setActiveIndex(clamped);
      const targetGroup = groups[clamped];
      if (!targetGroup) return;

      const el = document.getElementById(`date-group-${targetGroup.dateKey}`);
      if (el) {
        el.scrollIntoView({
          behavior: instant ? "auto" : "smooth",
          block: "start",
        });
      }
    },
    [groups],
  );

  // Compute position from mouse or touch event
  const handleScrubPointer = useCallback(
    (clientY: number, instant = true) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const relativeY = clientY - rect.top;
      const fraction = Math.max(0, Math.min(1, relativeY / rect.height));
      const targetIndex = Math.min(
        groups.length - 1,
        Math.floor(fraction * groups.length),
      );
      scrollToGroup(targetIndex, instant);
    },
    [groups, scrollToGroup],
  );

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsScrubbing(true);
    setIsVisible(true);
    handleScrubPointer(e.clientY, true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleScrubPointer(moveEvent.clientY, true);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      setIsScrubbing(false);
      showScrubberTemporarily();
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Touch Drag Handlers (Mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    isDraggingRef.current = true;
    setIsScrubbing(true);
    setIsVisible(true);
    handleScrubPointer(e.touches[0].clientY, true);

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length === 0) return;
      moveEvent.preventDefault(); // Prevent native browser scroll while scrubbing
      handleScrubPointer(moveEvent.touches[0].clientY, true);
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
      setIsScrubbing(false);
      showScrubberTemporarily();
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);
  };

  // Thumb position percentage
  const thumbPercent =
    groups.length > 1 ? (activeIndex / (groups.length - 1)) * 100 : 0;
  const currentGroup = groups[activeIndex] || groups[0];

  return (
    <div
      aria-label="Date Timeline Scrubber"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => {
        if (!isDraggingRef.current) showScrubberTemporarily();
      }}
      className={cx(
        "fixed right-1 sm:right-3 top-32 bottom-24 z-30 flex items-center select-none transition-opacity duration-300",
        isVisible || isScrubbing ? "opacity-100" : "opacity-0 hover:opacity-100 pointer-events-none hover:pointer-events-auto",
      )}
    >
      {/* Track & Draggable Area */}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="relative h-[65vh] max-h-[500px] min-h-[220px] w-8 flex justify-center cursor-pointer touch-none"
      >
        {/* Subtle Background Track Pill */}
        <div className="h-full w-1.5 rounded-full bg-border-button-default/40 hover:bg-border-button-default/70 transition-colors" />

        {/* Apple Photos Thumb Indicator */}
        <div
          style={{ top: `${thumbPercent}%` }}
          className={cx(
            "absolute -translate-y-1/2 left-1/2 -translate-x-1/2 transition-transform",
            isScrubbing ? "scale-125" : "scale-100 hover:scale-110",
          )}
        >
          {/* Thumb Pill */}
          <div className="h-6 w-3.5 rounded-full bg-accent-500 shadow-md border-2 border-white dark:border-zinc-900 cursor-grab active:cursor-grabbing" />

          {/* Floating Apple Photos Date Bubble (Pops out to the left of the thumb) */}
          <div
            className={cx(
              "absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-xl border whitespace-nowrap pointer-events-none transition-all duration-150",
              "bg-zinc-900/90 text-white border-white/20 dark:bg-white/95 dark:text-zinc-950 dark:border-black/10",
              isVisible || isScrubbing
                ? "opacity-100 translate-x-0 scale-100"
                : "opacity-0 translate-x-2 scale-95",
            )}
          >
            <span className="text-caption-1-medium font-semibold tracking-tight">
              {currentGroup?.dateLabel}
            </span>
            <span className="text-[10px] opacity-70">
              ({currentGroup?.files.length})
            </span>
            {/* Triangular pointer pointing towards the track thumb */}
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 size-2 rotate-45 bg-zinc-900/90 dark:bg-white/95 border-t border-r border-white/20 dark:border-black/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
