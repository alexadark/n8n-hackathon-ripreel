'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRevalidator } from 'react-router';
import { AutoRefresh } from '@/components/studio/auto-refresh';
import {
  Video,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Wand2,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  StopCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShotList } from '@/components/shots/shot-list';
import { shotsAction } from '@/hooks/use-server-action';
import { getApiKeysFromStorage } from '@/hooks/use-api-keys';
import type { Scene, SceneShot, ShotImageVariant } from '@/lib/drizzle/schema';
import { optimizeImageUrl, IMAGE_SIZES } from '@/lib/utils';

interface SceneWithShots {
  scene: Scene;
  shots: SceneShot[];
  shotImageVariants?: Record<string, ShotImageVariant[]>; // shotId -> variants
}

interface VideoGenerationDashboardProps {
  projectId: string;
  scenesWithShots: SceneWithShots[];
}

export function VideoGenerationDashboard({
  projectId,
  scenesWithShots,
}: VideoGenerationDashboardProps) {
  const revalidator = useRevalidator();
  const [isPending, startTransition] = useTransition();
  const [isCreatingAllShots, setIsCreatingAllShots] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isResettingShots, setIsResettingShots] = useState(false);
  const [isRegeneratingWithAI, setIsRegeneratingWithAI] = useState(false);
  const [isCancellingAll, setIsCancellingAll] = useState(false);
  const [regeneratingShots, setRegeneratingShots] = useState<Set<string>>(new Set());

  // Calculate stats across all scenes and shots
  const stats = {
    totalScenes: scenesWithShots.length,
    scenesWithApprovedImage: scenesWithShots.filter(
      (s) => s.scene.approved_image_id
    ).length,
    scenesWithShots: scenesWithShots.filter((s) => s.shots.length > 0).length,
    totalShots: scenesWithShots.reduce((sum, s) => sum + s.shots.length, 0),
    shotsGenerating: scenesWithShots.reduce(
      (sum, s) =>
        sum + s.shots.filter((shot) => shot.video_status === 'generating').length,
      0
    ),
    shotsReady: scenesWithShots.reduce(
      (sum, s) =>
        sum +
        s.shots.filter(
          (shot) => shot.video_status === 'ready' || shot.video_status === 'approved'
        ).length,
      0
    ),
    shotsFailed: scenesWithShots.reduce(
      (sum, s) =>
        sum + s.shots.filter((shot) => shot.video_status === 'failed').length,
      0
    ),
    shotsPending: scenesWithShots.reduce(
      (sum, s) =>
        sum +
        s.shots.filter((shot) => shot.video_status === null).length,
      0
    ),
  };

  // Scenes that need shots created (have approved image but no shots)
  const scenesNeedingShots = scenesWithShots.filter(
    (s) => s.scene.approved_image_id && s.shots.length === 0
  );

  // Check for shots with missing prompts (indicates buggy data)
  // A shot needs prompts if it has neither action_prompt nor video_prompt_veo3
  const shotsWithMissingPrompts = scenesWithShots.reduce(
    (sum, s) =>
      sum + s.shots.filter((shot) => {
        const hasActionPrompt = !!shot.action_prompt;
        const hasVeo3Prompt = shot.video_prompt_veo3 && Object.values(shot.video_prompt_veo3).some(v => v);
        return !hasActionPrompt && !hasVeo3Prompt;
      }).length,
    0
  );

  // Show reset option if shots exist but have issues
  const hasExistingShots = stats.totalShots > 0;
  const hasProblematicShots = shotsWithMissingPrompts > 0;

  // Count generating shots for centralized auto-refresh
  const generatingCount = stats.shotsGenerating;

  const handleRefresh = useCallback(() => {
    console.log('🔄 [VideoGenerationDashboard] Triggering revalidation...');
    revalidator.revalidate();
  }, [revalidator]);

  const handleCreateAllShots = async () => {
    setIsCreatingAllShots(true);
    startTransition(async () => {
      // Use createShotsForProject which copies shots from parsed raw_scene_data.shots
      const result = await shotsAction('createShotsForProject', projectId);
      if (result.success) {
        revalidator.revalidate();
      } else {
        console.error('Failed to create shots:', result.error);
      }
      setIsCreatingAllShots(false);
    });
  };

  const handleGenerateAllVideos = async () => {
    setIsGeneratingAll(true);
    startTransition(async () => {
      const apiKeys = getApiKeysFromStorage();
      const result = await shotsAction('generateAllShotVideosMVP', projectId, apiKeys);
      if (!result.success) {
        console.error('Failed to generate videos:', result.error);
      }
      setIsGeneratingAll(false);
      revalidator.revalidate();
    });
  };

  const handleResetShots = async () => {
    setIsResettingShots(true);
    startTransition(async () => {
      const result = await shotsAction('resetShotsForProject', projectId);
      if (result.success) {
        console.log('Shots reset successfully, created:', result.shotIds?.length);
        revalidator.revalidate();
      } else {
        console.error('Failed to reset shots:', result.error);
      }
      setIsResettingShots(false);
    });
  };

  const handleRegenerateShots = async () => {
    setIsRegeneratingWithAI(true);
    startTransition(async () => {
      console.log('🔄 Regenerating shots for project:', projectId);
      const result = await shotsAction('regenerateAllShots', projectId);
      if (result.success) {
        console.log('✅ Regenerated shots:', result.shotIds?.length);
        revalidator.revalidate();
      } else {
        console.error('❌ Failed to regenerate shots:', result.error);
      }
      setIsRegeneratingWithAI(false);
    });
  };

  const handleCancelAll = async () => {
    setIsCancellingAll(true);
    startTransition(async () => {
      const result = await shotsAction('cancelAllProjectVideoGeneration', projectId);
      if (result.success) {
        console.log('Cancelled generation for', result.shotIds?.length, 'shots');
        revalidator.revalidate();
      } else {
        console.error('Failed to cancel generation:', result.error);
      }
      setIsCancellingAll(false);
    });
  };

  const handleRegenerateVideo = async (shotId: string) => {
    setRegeneratingShots((prev) => new Set(prev).add(shotId));
    startTransition(async () => {
      const apiKeys = getApiKeysFromStorage();
      const result = await shotsAction('generateShotVideoMVP', shotId, apiKeys);
      if (!result.success) {
        console.error('Failed to regenerate video:', result.error);
      }
      // Keep in regenerating set briefly for UI feedback, then refresh
      setTimeout(() => {
        setRegeneratingShots((prev) => {
          const next = new Set(prev);
          next.delete(shotId);
          return next;
        });
        revalidator.revalidate();
      }, 1000);
    });
  };

  const getSceneStatusBadge = (sceneWithShots: SceneWithShots) => {
    const { scene, shots } = sceneWithShots;

    if (!scene.approved_image_id) {
      return (
        <Badge className="bg-[#333] text-[#666] border-none">
          <Clock size={10} className="mr-1" />
          No Image
        </Badge>
      );
    }

    if (shots.length === 0) {
      return (
        <Badge className="bg-[#f5c518]/20 text-[#f5c518] border-none">
          <Clock size={10} className="mr-1" />
          Need Shots
        </Badge>
      );
    }

    const generating = shots.filter((s) => s.video_status === 'generating').length;
    const ready = shots.filter(
      (s) => s.video_status === 'ready' || s.video_status === 'approved'
    ).length;
    const failed = shots.filter((s) => s.video_status === 'failed').length;

    if (generating > 0) {
      return (
        <Badge className="bg-[#00f2ea]/20 text-[#00f2ea] border-none">
          <Loader2 size={10} className="mr-1 animate-spin" />
          {generating}/{shots.length}
        </Badge>
      );
    }

    if (ready === shots.length) {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-none">
          <CheckCircle size={10} className="mr-1" />
          Complete
        </Badge>
      );
    }

    if (failed > 0) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-none">
          <XCircle size={10} className="mr-1" />
          {failed} failed
        </Badge>
      );
    }

    return (
      <Badge className="bg-[#f5c518]/20 text-[#f5c518] border-none">
        <Clock size={10} className="mr-1" />
        {ready}/{shots.length}
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-[#1c1c1f] border border-[#333] rounded-lg">
          <div className="font-courier text-[#666] text-xs mb-1">Scenes</div>
          <div className="font-oswald text-xl text-white">{stats.totalScenes}</div>
        </div>
        <div className="p-3 bg-[#1c1c1f] border border-[#333] rounded-lg">
          <div className="font-courier text-[#666] text-xs mb-1">With Image</div>
          <div className="font-oswald text-xl text-[#f5c518]">
            {stats.scenesWithApprovedImage}
          </div>
        </div>
        <div className="p-3 bg-[#1c1c1f] border border-[#333] rounded-lg">
          <div className="font-courier text-[#666] text-xs mb-1">Total Shots</div>
          <div className="font-oswald text-xl text-white">{stats.totalShots}</div>
        </div>
        <div className="p-3 bg-[#1c1c1f] border border-[#333] rounded-lg">
          <div className="font-courier text-[#666] text-xs mb-1">Generating</div>
          <div className="font-oswald text-xl text-[#00f2ea]">
            {stats.shotsGenerating}
          </div>
        </div>
        <div className="p-3 bg-[#1c1c1f] border border-[#333] rounded-lg">
          <div className="font-courier text-[#666] text-xs mb-1">Ready</div>
          <div className="font-oswald text-xl text-green-400">{stats.shotsReady}</div>
        </div>
        <div className="p-3 bg-[#1c1c1f] border border-[#333] rounded-lg">
          <div className="font-courier text-[#666] text-xs mb-1">Failed</div>
          <div className="font-oswald text-xl text-red-400">{stats.shotsFailed}</div>
        </div>
      </div>

      {/* Reset Banner - Show when shots have missing prompts */}
      {hasProblematicShots && (
        <div className="p-4 bg-[#1c1c1f] border border-amber-500/50 rounded-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-oswald text-sm text-white mb-1">
                  Shots Need Reset
                </h3>
                <p className="font-courier text-[#888] text-xs">
                  {shotsWithMissingPrompts} shot{shotsWithMissingPrompts > 1 ? 's are' : ' is'} missing video prompts.
                  Click Reset to rebuild shots from scene data with correct prompts.
                </p>
              </div>
            </div>
            <Button
              onClick={handleResetShots}
              disabled={isPending || isResettingShots}
              variant="outline"
              className="border-amber-500 text-amber-500 hover:bg-amber-500/10 font-oswald uppercase text-xs"
            >
              {isResettingShots ? (
                <Loader2 size={14} className="mr-2 animate-spin" />
              ) : (
                <RotateCcw size={14} className="mr-2" />
              )}
              Reset All Shots
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        {/* Regenerate Shots Button - Always visible when shots exist */}
        {hasExistingShots && (
          <div className="flex-1 min-w-[280px] p-4 bg-[#1c1c1f] border border-[#f5c518] rounded-lg">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-oswald text-sm text-white mb-1">
                  Regenerate Shots
                </h3>
                <p className="font-courier text-[#888] text-xs">
                  Recreate shots from scene data (after regenerating scenes)
                </p>
              </div>
              <Button
                onClick={handleRegenerateShots}
                disabled={isPending || isRegeneratingWithAI || isResettingShots}
                className="bg-[#f5c518] hover:bg-[#d4a616] text-black font-oswald uppercase text-xs"
              >
                {isRegeneratingWithAI ? (
                  <Loader2 size={14} className="mr-2 animate-spin" />
                ) : (
                  <RefreshCw size={14} className="mr-2" />
                )}
                Regenerate
              </Button>
            </div>
          </div>
        )}

        {/* Reset Shots Button - Secondary option */}
        {hasExistingShots && (
          <div className="flex-1 min-w-[280px] p-4 bg-[#1c1c1f] border border-[#333] rounded-lg">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-oswald text-sm text-[#888] mb-1">
                  Reset from Scene Data
                </h3>
                <p className="font-courier text-[#666] text-xs">
                  Recreate from existing scene data (no AI)
                </p>
              </div>
              <Button
                onClick={handleResetShots}
                disabled={isPending || isResettingShots || isRegeneratingWithAI}
                variant="outline"
                className="border-[#444] text-[#666] hover:text-white hover:border-[#666] font-oswald uppercase text-xs"
              >
                {isResettingShots ? (
                  <Loader2 size={14} className="mr-2 animate-spin" />
                ) : (
                  <RotateCcw size={14} className="mr-2" />
                )}
                Reset
              </Button>
            </div>
          </div>
        )}

        {/* Create All Shots Button */}
        {scenesNeedingShots.length > 0 && (
          <div className="flex-1 min-w-[280px] p-4 bg-[#1c1c1f] border border-[#f5c518] rounded-lg">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-oswald text-sm text-white mb-1">
                  {scenesNeedingShots.length} Scene
                  {scenesNeedingShots.length > 1 ? 's' : ''} Need Shots
                </h3>
                <p className="font-courier text-[#888] text-xs">
                  AI will divide each scene into shots (max 8s each)
                </p>
              </div>
              <Button
                onClick={handleCreateAllShots}
                disabled={isPending || isCreatingAllShots}
                className="bg-[#f5c518] hover:bg-[#d4a616] text-black font-oswald uppercase text-xs"
              >
                {isCreatingAllShots ? (
                  <Loader2 size={14} className="mr-2 animate-spin" />
                ) : (
                  <Wand2 size={14} className="mr-2" />
                )}
                Create All Shots
              </Button>
            </div>
          </div>
        )}

        {/* Generate All Videos Button */}
        {stats.shotsPending > 0 && (
          <div className="flex-1 min-w-[280px] p-4 bg-[#1c1c1f] border border-green-500/50 rounded-lg">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-oswald text-sm text-white mb-1">
                  {stats.shotsPending} Shot
                  {stats.shotsPending > 1 ? 's' : ''} Ready for Video
                </h3>
                <p className="font-courier text-[#888] text-xs">
                  Generate videos using VEO 3.1 (includes audio)
                </p>
              </div>
              <Button
                onClick={handleGenerateAllVideos}
                disabled={isPending || isGeneratingAll || stats.shotsGenerating > 0}
                className="bg-green-600 hover:bg-green-700 text-white font-oswald uppercase text-xs"
              >
                {isGeneratingAll || stats.shotsGenerating > 0 ? (
                  <Loader2 size={14} className="mr-2 animate-spin" />
                ) : (
                  <Play size={14} className="mr-2" />
                )}
                Generate All Videos
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Generating indicator with Cancel button */}
      {generatingCount > 0 && (
        <div className="p-4 bg-[#1c1c1f] border border-[#00f2ea]/50 rounded-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <RefreshCw size={16} className="text-[#00f2ea] animate-spin" />
              <div>
                <h3 className="font-oswald text-sm text-white mb-1">
                  {stats.shotsGenerating} Shot{stats.shotsGenerating > 1 ? 's' : ''} Generating
                </h3>
                <p className="font-courier text-[#888] text-xs">
                  Auto-refreshing every 5 seconds...
                </p>
              </div>
            </div>
            <Button
              onClick={handleCancelAll}
              disabled={isPending || isCancellingAll}
              variant="outline"
              className="border-red-500/50 text-red-400 hover:text-red-300 hover:bg-red-500/10 font-oswald uppercase text-xs"
            >
              {isCancellingAll ? (
                <Loader2 size={14} className="mr-2 animate-spin" />
              ) : (
                <StopCircle size={14} className="mr-2" />
              )}
              Cancel All
            </Button>
          </div>
        </div>
      )}

      {/* Scene List with Shots */}
      <div className="space-y-4">
        <h2 className="font-oswald text-xl text-white uppercase">
          Scenes & Shots
        </h2>

        {scenesWithShots.map(({ scene, shots, shotImageVariants }) => {
          // Get shots with ready videos
          const readyShots = shots.filter(
            (s) => s.video_url && (s.video_status === 'ready' || s.video_status === 'approved')
          );

          return (
            <div
              key={scene.id}
              className="p-4 bg-[#1c1c1f] border border-[#333] rounded-lg"
            >
              {/* Scene Header */}
              <div className="flex items-start gap-4 mb-4">
                {/* Scene Number */}
                <div className="w-12 h-12 bg-[#0a0a0b] border border-[#333] rounded flex items-center justify-center flex-shrink-0">
                  <span className="font-oswald text-xl text-[#f5c518]">
                    {scene.scene_number}
                  </span>
                </div>

                {/* Approved Image Thumbnail */}
                <div className="w-20 h-12 bg-[#0a0a0b] border border-[#333] rounded overflow-hidden flex-shrink-0">
                  {scene.approved_image_url ? (
                    <img
                      src={optimizeImageUrl(scene.approved_image_url, IMAGE_SIZES.videoThumb)}
                      alt={`Scene ${scene.scene_number}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video size={16} className="text-[#666]" />
                    </div>
                  )}
                </div>

                {/* Scene Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-courier text-white text-sm truncate">
                      {scene.slugline}
                    </span>
                    {getSceneStatusBadge({ scene, shots })}
                  </div>
                </div>
              </div>

              {/* Full-Size Video Preview Section */}
              {readyShots.length > 0 && (
                <div className="mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {readyShots.map((shot) => {
                      const isRegenerating = regeneratingShots.has(shot.id) || shot.video_status === 'generating';

                      return (
                        <div
                          key={shot.id}
                          className="relative bg-black rounded-lg overflow-hidden border border-[#333]"
                        >
                          {/* Shot Label */}
                          <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-[#f5c518] text-black text-xs font-oswald rounded">
                              Shot {shot.shot_number}
                            </span>
                            <span className="px-2 py-0.5 bg-black/70 text-white text-xs font-courier rounded">
                              {shot.shot_duration_seconds}s
                            </span>
                          </div>

                          {/* Regenerate Button */}
                          <div className="absolute top-2 right-2 z-10">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRegenerateVideo(shot.id)}
                              disabled={isPending || isRegenerating}
                              className="h-7 px-2 bg-black/70 border-[#444] text-[#888] hover:text-white hover:bg-black/90 font-courier text-xs"
                            >
                              {isRegenerating ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <>
                                  <RefreshCw size={12} className="mr-1" />
                                  Regenerate
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Video Player */}
                          <video
                            src={shot.video_url!}
                            className="w-full aspect-video object-contain"
                            controls
                            preload="metadata"
                            poster={scene.approved_image_url || undefined}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Shots List (collapsible for details) */}
              <div className="border-t border-[#333] pt-3">
                <ShotList
                  sceneId={scene.id}
                  sceneApprovedImageUrl={scene.approved_image_url}
                  shots={shots}
                  shotImageVariants={shotImageVariants || {}}
                  onRefresh={handleRefresh}
                />
              </div>
            </div>
          );
        })}

        {scenesWithShots.length === 0 && (
          <div className="p-8 bg-[#1c1c1f] border border-dashed border-[#333] rounded-lg text-center">
            <Video size={48} className="mx-auto text-[#666] mb-4" />
            <h3 className="font-oswald text-lg text-white mb-2">No Scenes Yet</h3>
            <p className="font-courier text-[#888] text-sm">
              Create and approve scene images first, then return here to generate
              videos.
            </p>
          </div>
        )}
      </div>

      {/* Centralized auto-refresh - only polls when videos are generating */}
      <AutoRefresh generatingCount={generatingCount} itemLabel="video" />
    </div>
  );
}
