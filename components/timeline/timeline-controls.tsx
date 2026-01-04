'use client';

/**
 * Timeline Controls Component
 *
 * Displays total duration, progress indicator, and CTA button for final review.
 */

import { Clock, Film, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { TimelineScene } from '@/app/actions/timeline.server';

interface TimelineControlsProps {
  scenes: TimelineScene[];
  totalDurationSeconds: number;
  allVideosReady: boolean;
  projectId: string;
}

export function TimelineControls({
  scenes,
  totalDurationSeconds,
  allVideosReady,
  projectId,
}: TimelineControlsProps) {
  // Calculate progress
  const totalShots = scenes.reduce((sum, scene) => sum + scene.shots.length, 0);
  const readyShots = scenes.reduce(
    (sum, scene) =>
      sum + scene.shots.filter(
        shot => shot.video_status === 'ready' || shot.video_status === 'approved'
      ).length,
    0
  );
  const progressPercentage = totalShots > 0 ? (readyShots / totalShots) * 100 : 0;

  // Format duration (seconds to MM:SS)
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Duration and Progress Stats */}
      <div className="grid grid-cols-2 gap-6">
        {/* Total Duration */}
        <div className="bg-[#1c1c1f] border border-[#333] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-[#f5c518]" />
            <h3 className="text-white/60 font-courier text-sm uppercase tracking-wider">
              Total Duration
            </h3>
          </div>
          <p className="text-white font-oswald text-3xl font-bold">
            {formatDuration(totalDurationSeconds)}
          </p>
          <p className="text-white/40 font-courier text-xs mt-1">
            {totalDurationSeconds} seconds
          </p>
        </div>

        {/* Video Progress */}
        <div className="bg-[#1c1c1f] border border-[#333] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Film className="w-5 h-5 text-[#00f2ea]" />
            <h3 className="text-white/60 font-courier text-sm uppercase tracking-wider">
              Video Progress
            </h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <p className="text-white font-oswald text-3xl font-bold">
                {readyShots}/{totalShots}
              </p>
              <span className="text-white/60 font-courier text-sm">shots ready</span>
            </div>
            <Progress
              value={progressPercentage}
              className="h-2 bg-black/40"
            />
          </div>
        </div>
      </div>

      {/* Scene Breakdown */}
      <div className="bg-[#1c1c1f] border border-[#333] rounded-lg p-6">
        <h3 className="text-white/60 font-courier text-sm uppercase tracking-wider mb-4">
          Scene Breakdown
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {scenes.slice(0, 8).map((scene) => {
            const sceneReady = scene.shots.every(
              shot => shot.video_status === 'ready' || shot.video_status === 'approved'
            );
            const sceneGenerating = scene.shots.some(shot => shot.video_status === 'generating');
            const sceneDuration = scene.shots.reduce((sum, shot) => sum + shot.shot_duration_seconds, 0);

            return (
              <div
                key={scene.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded border',
                  sceneReady
                    ? 'bg-green-500/10 border-green-500/40'
                    : sceneGenerating
                    ? 'bg-[#00f2ea]/10 border-[#00f2ea]/40'
                    : 'bg-black/20 border-[#333]'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center font-oswald text-sm font-bold',
                    sceneReady
                      ? 'bg-green-500/20 text-green-400'
                      : sceneGenerating
                      ? 'bg-[#00f2ea]/20 text-[#00f2ea]'
                      : 'bg-white/10 text-white/40'
                  )}
                >
                  {scene.scene_number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 font-courier text-xs truncate">
                    {scene.slugline}
                  </p>
                  <p className="text-white/40 font-courier text-xs">
                    {sceneDuration}s • {scene.shots.length} {scene.shots.length === 1 ? 'shot' : 'shots'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {scenes.length > 8 && (
          <p className="text-white/40 font-courier text-xs mt-4 text-center">
            + {scenes.length - 8} more scenes
          </p>
        )}
      </div>

      {/* CTA Button */}
      <div className="flex items-center justify-center">
        <Button
          size="lg"
          disabled={!allVideosReady}
          className={cn(
            'font-oswald text-lg uppercase tracking-wider px-8 py-6',
            allVideosReady
              ? 'bg-[#e02f2f] hover:bg-[#e02f2f]/90 text-white'
              : 'bg-[#333] text-white/40 cursor-not-allowed'
          )}
          onClick={() => {
            if (allVideosReady) {
              window.location.href = `/projects/${projectId}/studio/export`;
            }
          }}
        >
          {allVideosReady ? (
            <>
              Proceed to Final Review
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          ) : (
            'Waiting for videos to complete...'
          )}
        </Button>
      </div>

      {!allVideosReady && (
        <p className="text-center text-white/40 font-courier text-sm">
          All videos must be generated before proceeding to final review
        </p>
      )}
    </div>
  );
}
