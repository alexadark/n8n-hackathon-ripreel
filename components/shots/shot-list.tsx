'use client';

import { useState, useTransition } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Wand2,
  Loader2,
  Play,
  CheckCircle,
  XCircle,
  Image,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShotCard } from './shot-card';
import { shotsAction, shotImagesAction } from '@/hooks/use-server-action';
import { getApiKeysFromStorage } from '@/hooks/use-api-keys';
import type { SceneShot, ShotImageVariant } from '@/lib/drizzle/schema';

interface ShotListProps {
  sceneId: string;
  sceneApprovedImageUrl: string | null;
  shots: SceneShot[];
  shotImageVariants: Record<string, ShotImageVariant[]>; // shotId -> variants
  onRefresh?: () => void;
}

export function ShotList({
  sceneId,
  sceneApprovedImageUrl,
  shots,
  shotImageVariants,
  onRefresh,
}: ShotListProps) {
  const [isExpanded, setIsExpanded] = useState(shots.length > 0);
  const [isPending, startTransition] = useTransition();
  const [isCreatingShots, setIsCreatingShots] = useState(false);
  const [generatingShots, setGeneratingShots] = useState<Set<string>>(new Set());
  const [generatingAllImages, setGeneratingAllImages] = useState(false);

  const hasShots = shots.length > 0;
  const hasApprovedImage = !!sceneApprovedImageUrl;

  // Calculate shot video stats
  const videoStats = {
    total: shots.length,
    pending: shots.filter((s) => s.video_status === null).length,
    generating: shots.filter((s) => s.video_status === 'generating').length,
    ready: shots.filter(
      (s) => s.video_status === 'ready' || s.video_status === 'approved'
    ).length,
    failed: shots.filter((s) => s.video_status === 'failed').length,
  };

  // Calculate shot image stats
  const imageStats = {
    withImage: shots.filter((s) => !!s.start_frame_image_url).length,
    withSceneImage: shots.filter(
      (s) => !s.start_frame_image_url && !!sceneApprovedImageUrl
    ).length,
    noImage: shots.filter(
      (s) => !s.start_frame_image_url && !sceneApprovedImageUrl
    ).length,
    generating: Object.values(shotImageVariants).flat().filter(
      (v) => v.status === 'generating'
    ).length,
  };

  const handleCreateShots = async () => {
    setIsCreatingShots(true);
    startTransition(async () => {
      // Use createShotsFromScene which copies shots from parsed raw_scene_data.shots
      const result = await shotsAction('createShotsFromScene', sceneId);
      if (result.success) {
        onRefresh?.();
      } else {
        console.error('Failed to create shots:', result.error);
      }
      setIsCreatingShots(false);
    });
  };

  const handleGenerateVideo = async (shotId: string) => {
    setGeneratingShots((prev) => new Set(prev).add(shotId));
    startTransition(async () => {
      const apiKeys = getApiKeysFromStorage();
      const result = await shotsAction('generateShotVideoMVP', shotId, apiKeys);
      if (!result.success) {
        console.error('Failed to generate video:', result.error);
      }
      // Keep in generating set for a short time to show UI feedback
      setTimeout(() => {
        setGeneratingShots((prev) => {
          const next = new Set(prev);
          next.delete(shotId);
          return next;
        });
        onRefresh?.();
      }, 1000);
    });
  };

  const handleGenerateAllVideos = async () => {
    const pendingShots = shots.filter(
      (s) => s.video_status === null || s.video_status === 'failed'
    );

    for (const shot of pendingShots) {
      await handleGenerateVideo(shot.id);
    }
  };

  const handleGenerateAllImages = async () => {
    setGeneratingAllImages(true);
    startTransition(async () => {
      const apiKeys = getApiKeysFromStorage();
      const result = await shotImagesAction(
        'generateAllShotImagesForScene',
        sceneId,
        'both', // Generate with both models
        apiKeys
      );
      if (result.success) {
        onRefresh?.();
      } else {
        console.error('Failed to generate all shot images:', result.error);
      }
      setGeneratingAllImages(false);
    });
  };

  return (
    <div className="mt-2">
      {/* Header / Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left py-1 hover:bg-[#1c1c1f]/50 rounded transition-colors"
      >
        {isExpanded ? (
          <ChevronDown size={14} className="text-[#666]" />
        ) : (
          <ChevronRight size={14} className="text-[#666]" />
        )}
        <span className="font-courier text-xs text-[#888]">
          {hasShots ? (
            <>
              {videoStats.total} shot{videoStats.total !== 1 ? 's' : ''}
              {/* Image stats */}
              {imageStats.withImage > 0 && (
                <span className="text-green-400 ml-2">
                  <Image size={10} className="inline mr-1" />
                  {imageStats.withImage} images
                </span>
              )}
              {imageStats.generating > 0 && (
                <span className="text-[#00f2ea] ml-2">
                  <Loader2 size={10} className="inline mr-1 animate-spin" />
                  {imageStats.generating} img gen
                </span>
              )}
              {/* Video stats */}
              {videoStats.ready > 0 && (
                <span className="text-green-400 ml-2">
                  <CheckCircle size={10} className="inline mr-1" />
                  {videoStats.ready} videos
                </span>
              )}
              {videoStats.generating > 0 && (
                <span className="text-[#00f2ea] ml-2">
                  <Loader2 size={10} className="inline mr-1 animate-spin" />
                  {videoStats.generating} vid gen
                </span>
              )}
              {videoStats.failed > 0 && (
                <span className="text-red-400 ml-2">
                  <XCircle size={10} className="inline mr-1" />
                  {videoStats.failed} failed
                </span>
              )}
            </>
          ) : (
            'No shots yet'
          )}
        </span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-2 space-y-2">
          {/* No shots - show create button */}
          {!hasShots && (
            <div className="p-4 bg-[#0a0a0b] border border-dashed border-[#333] rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-courier text-[#888] text-sm">
                    No shots created for this scene.
                  </p>
                  <p className="font-courier text-[#666] text-xs mt-1">
                    AI will divide the scene into shots (max 8s each).
                  </p>
                </div>
                <Button
                  onClick={handleCreateShots}
                  disabled={isPending || isCreatingShots}
                  className="bg-[#f5c518] hover:bg-[#d4a616] text-black font-courier text-xs"
                >
                  {isCreatingShots ? (
                    <>
                      <Loader2 size={14} className="mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Wand2 size={14} className="mr-2" />
                      Create Shots
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Has shots - show list with optional generate all */}
          {hasShots && (
            <>
              {/* Action bar with Generate All buttons */}
              <div className="flex items-center gap-2 p-2 bg-[#0a0a0b] border border-[#333] rounded flex-wrap">
                {/* Generate All Images button */}
                {shots.some((s) => !s.start_frame_image_url) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateAllImages}
                    disabled={isPending || generatingAllImages || imageStats.generating > 0}
                    className="border-[#333] text-[#888] hover:text-white font-courier text-xs h-7"
                  >
                    {generatingAllImages || imageStats.generating > 0 ? (
                      <>
                        <Loader2 size={12} className="mr-1 animate-spin" />
                        Generating Images...
                      </>
                    ) : (
                      <>
                        <Image size={12} className="mr-1" />
                        Generate All Images
                      </>
                    )}
                  </Button>
                )}

                {/* Generate All Videos button when there are pending shots */}
                {videoStats.pending > 0 && (
                  <Button
                    size="sm"
                    onClick={handleGenerateAllVideos}
                    disabled={isPending || generatingShots.size > 0}
                    className="bg-[#f5c518] hover:bg-[#d4a616] text-black font-courier text-xs h-7"
                  >
                    {generatingShots.size > 0 ? (
                      <>
                        <Loader2 size={12} className="mr-1 animate-spin" />
                        Generating Videos...
                      </>
                    ) : (
                      <>
                        <Play size={12} className="mr-1" />
                        Generate All Videos
                      </>
                    )}
                  </Button>
                )}

                {/* Status text */}
                <span className="font-courier text-xs text-[#666] ml-auto">
                  {imageStats.withImage}/{videoStats.total} images
                  {' • '}
                  {videoStats.ready}/{videoStats.total} videos
                </span>
              </div>

              {/* Shot cards */}
              <div className="space-y-2">
                {shots.map((shot) => (
                  <ShotCard
                    key={shot.id}
                    shot={shot}
                    sceneApprovedImageUrl={sceneApprovedImageUrl}
                    imageVariants={shotImageVariants[shot.id] || []}
                    isGenerating={
                      generatingShots.has(shot.id) ||
                      shot.video_status === 'generating'
                    }
                    onGenerateVideo={() => handleGenerateVideo(shot.id)}
                    onRefresh={onRefresh}
                    disabled={isPending}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
