"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TrimSliderProps {
  /** Total video duration in seconds */
  duration: number;
  /** Current playback time in seconds */
  currentTime: number;
  /** Trim start point in seconds */
  trimStart: number;
  /** Trim end point in seconds */
  trimEnd: number;
  /** Callback when trim points change */
  onTrimChange: (start: number, end: number) => void;
  /** Callback when user seeks (clicks on the timeline) */
  onSeek: (time: number) => void;
  /** Disable interaction */
  disabled?: boolean;
  /** Class name for the container */
  className?: string;
}

/**
 * TrimSlider - Dual-handle video trim slider
 *
 * A timeline component with two draggable handles for setting video trim points.
 * Displays the current playback position, trim region, and time labels.
 *
 * Features:
 * - Drag handles to set trim start/end points
 * - Click on track to seek
 * - Visual indicators for trimmed region
 * - Time display for trim points
 * - Keyboard support (arrow keys for fine adjustment)
 */
export function TrimSlider({
  duration,
  currentTime,
  trimStart,
  trimEnd,
  onTrimChange,
  onSeek,
  disabled = false,
  className,
}: TrimSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const [activeHandle, setActiveHandle] = useState<"start" | "end" | null>(null);

  // Convert time to percentage
  const timeToPercent = useCallback(
    (time: number) => (duration > 0 ? (time / duration) * 100 : 0),
    [duration]
  );

  // Convert percentage to time
  const percentToTime = useCallback(
    (percent: number) => (percent / 100) * duration,
    [duration]
  );

  // Get position from mouse/touch event
  const getPositionFromEvent = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      return percentToTime(percent);
    },
    [percentToTime]
  );

  // Handle mouse/touch move during drag
  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!dragging || disabled) return;
      e.preventDefault();

      const time = getPositionFromEvent(e);

      if (dragging === "start") {
        // Ensure start doesn't go past end (minimum 0.5s gap)
        const newStart = Math.min(time, trimEnd - 0.5);
        const clampedStart = Math.max(0, newStart);
        onTrimChange(clampedStart, trimEnd);
        onSeek(clampedStart);
      } else {
        // Ensure end doesn't go before start (minimum 0.5s gap)
        const newEnd = Math.max(time, trimStart + 0.5);
        const clampedEnd = Math.min(duration, newEnd);
        onTrimChange(trimStart, clampedEnd);
        onSeek(clampedEnd);
      }
    },
    [dragging, disabled, getPositionFromEvent, trimStart, trimEnd, duration, onTrimChange, onSeek]
  );

  // Handle mouse/touch up to end drag
  const handleUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Add/remove global event listeners for dragging
  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
      window.addEventListener("touchmove", handleMove);
      window.addEventListener("touchend", handleUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [dragging, handleMove, handleUp]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, handle: "start" | "end") => {
      if (disabled) return;

      const step = e.shiftKey ? 1 : 0.1; // Shift for 1s steps, otherwise 0.1s

      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        if (handle === "start") {
          const nextStart = Math.max(0, trimStart - step);
          onTrimChange(nextStart, trimEnd);
          onSeek(nextStart);
        } else {
          const nextEnd = Math.max(trimStart + 0.5, trimEnd - step);
          onTrimChange(trimStart, nextEnd);
          onSeek(nextEnd);
        }
      } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        if (handle === "start") {
          const nextStart = Math.min(trimEnd - 0.5, trimStart + step);
          onTrimChange(nextStart, trimEnd);
          onSeek(nextStart);
        } else {
          const nextEnd = Math.min(duration, trimEnd + step);
          onTrimChange(trimStart, nextEnd);
          onSeek(nextEnd);
        }
      }
    },
    [disabled, trimStart, trimEnd, duration, onTrimChange, onSeek]
  );

  // Handle track click for seeking
  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      if (!trackRef.current) return;

      // Don't seek if clicking on handles
      if ((e.target as HTMLElement).closest("[data-handle]")) return;

      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const time = percentToTime(percent);

      // Seek to clicked position (within trim bounds)
      const clampedTime = Math.max(trimStart, Math.min(trimEnd, time));
      onSeek(clampedTime);
    },
    [disabled, percentToTime, trimStart, trimEnd, onSeek]
  );

  // Format time as MM:SS.ms
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 10);
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${ms}`;
  };

  const startPercent = timeToPercent(trimStart);
  const endPercent = timeToPercent(trimEnd);
  const currentPercent = timeToPercent(currentTime);
  const trimDuration = trimEnd - trimStart;

  return (
    <div className={cn("relative select-none", className)}>
      {/* Time labels */}
      <div className="flex justify-between text-xs text-gray-400 mb-1 font-mono">
        <span className="text-[#f5c518]">IN: {formatTime(trimStart)}</span>
        <span className="text-gray-500">Duration: {formatTime(trimDuration)}</span>
        <span className="text-[#f5c518]">OUT: {formatTime(trimEnd)}</span>
      </div>

      {/* Track container */}
      <div
        ref={trackRef}
        className={cn(
          "relative h-10 bg-[#1c1c1f] rounded cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={handleTrackClick}
      >
        {/* Excluded region (before trim start) */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-black/60"
          style={{ width: `${startPercent}%` }}
        />

        {/* Excluded region (after trim end) */}
        <div
          className="absolute top-0 bottom-0 right-0 bg-black/60"
          style={{ width: `${100 - endPercent}%` }}
        />

        {/* Active trim region */}
        <div
          className="absolute top-0 bottom-0 bg-[#f5c518]/20 border-y-2 border-[#f5c518]"
          style={{
            left: `${startPercent}%`,
            width: `${endPercent - startPercent}%`,
          }}
        />

        {/* Current playback position */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white z-20"
          style={{ left: `${currentPercent}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45" />
        </div>

        {/* Start handle */}
        <div
          data-handle="start"
          className={cn(
            "absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize z-30 group",
            "flex items-center justify-center",
            activeHandle === "start" && "z-40"
          )}
          style={{ left: `${startPercent}%` }}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (!disabled) setDragging("start");
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            if (!disabled) setDragging("start");
          }}
          onFocus={() => setActiveHandle("start")}
          onBlur={() => setActiveHandle(null)}
          onKeyDown={(e) => handleKeyDown(e, "start")}
          tabIndex={disabled ? -1 : 0}
          role="slider"
          aria-label="Trim start"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={trimStart}
        >
          <div
            className={cn(
              "w-1 h-full bg-[#f5c518] rounded-l transition-all",
              "group-hover:w-1.5 group-hover:bg-[#ffdc50]",
              (dragging === "start" || activeHandle === "start") && "w-1.5 bg-[#ffdc50]"
            )}
          />
        </div>

        {/* End handle */}
        <div
          data-handle="end"
          className={cn(
            "absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize z-30 group",
            "flex items-center justify-center",
            activeHandle === "end" && "z-40"
          )}
          style={{ left: `${endPercent}%` }}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (!disabled) setDragging("end");
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            if (!disabled) setDragging("end");
          }}
          onFocus={() => setActiveHandle("end")}
          onBlur={() => setActiveHandle(null)}
          onKeyDown={(e) => handleKeyDown(e, "end")}
          tabIndex={disabled ? -1 : 0}
          role="slider"
          aria-label="Trim end"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={trimEnd}
        >
          <div
            className={cn(
              "w-1 h-full bg-[#f5c518] rounded-r transition-all",
              "group-hover:w-1.5 group-hover:bg-[#ffdc50]",
              (dragging === "end" || activeHandle === "end") && "w-1.5 bg-[#ffdc50]"
            )}
          />
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="text-xs text-gray-500 mt-1 text-center">
        Drag handles to trim. Use arrow keys for fine adjustment (Shift + arrows for 1s steps).
      </div>
    </div>
  );
}
