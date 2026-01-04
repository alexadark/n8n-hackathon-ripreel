'use client';

import { useEffect, useRef } from 'react';
import { useRevalidator } from 'react-router';

interface AutoRefreshProps {
  /** Number of items currently generating */
  generatingCount: number;
  /** Polling interval in milliseconds */
  intervalMs?: number;
  /** Label for the generating items (e.g., "image", "video") */
  itemLabel?: string;
}

/**
 * Client component that auto-refreshes the page while items are generating.
 * This ensures new items appear progressively as they complete.
 *
 * Stops polling automatically when no more items are generating.
 *
 * This is the centralized polling component - individual cards should NOT poll.
 */
export function AutoRefresh({
  generatingCount,
  intervalMs = 5000, // Poll every 5 seconds by default (was 3s, increased for performance)
  itemLabel = 'image',
}: AutoRefreshProps) {
  const revalidator = useRevalidator();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only poll if there are generating items
    if (generatingCount > 0) {
      console.log(`🔄 Auto-refresh: ${generatingCount} ${itemLabel}(s) generating, polling every ${intervalMs}ms`);

      intervalRef.current = setInterval(() => {
        console.log(`🔄 Refreshing page for new ${itemLabel}s...`);
        revalidator.revalidate();
      }, intervalMs);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      // Clean up any existing interval
      if (intervalRef.current) {
        console.log(`✅ All ${itemLabel}s complete, stopping auto-refresh`);
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [generatingCount, intervalMs, revalidator, itemLabel]);

  // This component renders nothing when not generating
  if (generatingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-[#1c1c1f] border border-[#f5c518] rounded-lg px-4 py-2 shadow-lg z-50">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-[#f5c518] rounded-full animate-pulse" />
        <span className="font-courier text-sm text-[#f5c518]">
          Generating {generatingCount} {itemLabel}{generatingCount > 1 ? 's' : ''}...
        </span>
      </div>
    </div>
  );
}
