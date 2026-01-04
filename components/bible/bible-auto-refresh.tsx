'use client';

import { useEffect, useRef } from 'react';
import { useRevalidator } from 'react-router';

interface BibleAutoRefreshProps {
  /** Number of variants currently generating */
  generatingCount: number;
  /** Polling interval in milliseconds */
  intervalMs?: number;
}

/**
 * Client component that auto-refreshes the page while images are generating.
 * This ensures new images appear progressively as they complete.
 *
 * Stops polling automatically when no more images are generating.
 */
export function BibleAutoRefresh({
  generatingCount,
  intervalMs = 3000, // Poll every 3 seconds by default
}: BibleAutoRefreshProps) {
  const revalidator = useRevalidator();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only poll if there are generating images
    if (generatingCount > 0) {
      console.log(`🔄 Auto-refresh: ${generatingCount} images generating, polling every ${intervalMs}ms`);

      intervalRef.current = setInterval(() => {
        console.log('🔄 Refreshing page for new images...');
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
        console.log('✅ All images complete, stopping auto-refresh');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [generatingCount, intervalMs, revalidator]);

  // This component renders nothing - it's purely for side effects
  if (generatingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-[#1c1c1f] border border-[#f5c518] rounded-lg px-4 py-2 shadow-lg z-50">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-[#f5c518] rounded-full animate-pulse" />
        <span className="font-courier text-sm text-[#f5c518]">
          Generating {generatingCount} image{generatingCount > 1 ? 's' : ''}...
        </span>
      </div>
    </div>
  );
}
