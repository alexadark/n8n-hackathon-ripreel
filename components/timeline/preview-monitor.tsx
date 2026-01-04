'use client';

/**
 * Preview Monitor Component
 *
 * Large video player area for previewing selected scene videos.
 * Features:
 * - Shot markers showing all shots in current scene
 * - Sequential auto-play across all shots/scenes
 * - Scene and shot information overlay
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipForward, Trash2, Loader2, Scissors, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn, optimizeImageUrl, IMAGE_SIZES } from '@/lib/utils';
import { shotsAction } from '@/hooks/use-server-action';
import { TrimSlider } from './trim-slider';
import type { TimelineScene, TimelineShot } from '@/app/actions/timeline.server';

interface PreviewMonitorProps {
  selectedScene: TimelineScene | null;
  selectedShot: TimelineShot | null;
  allScenes: TimelineScene[];
  onShotChange: (scene: TimelineScene, shot: TimelineShot) => void;
  onShotUpdate?: (scene: TimelineScene, updatedShot: TimelineShot) => void;
  onShotDelete?: () => void;
  onTimelineRefresh?: () => void;
  className?: string;
}

export function PreviewMonitor({
  selectedScene,
  selectedShot,
  allScenes,
  onShotChange,
  onShotUpdate,
  onShotDelete,
  onTimelineRefresh,
  className
}: PreviewMonitorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Trim mode state
  const [trimMode, setTrimMode] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimError, setTrimError] = useState<string | null>(null);
  const [trimRevision, setTrimRevision] = useState(0);
  const preciseTrim = true;

  // Check if shot can be deleted (not generating)
  const canDeleteShot = selectedShot && selectedShot.video_status !== 'generating';

  const handleDeleteShot = async () => {
    if (!selectedShot) return;

    setIsDeleting(true);
    try {
      const result = await shotsAction('deleteShot', selectedShot.id);
      if (result.success) {
        onShotDelete?.();
      } else {
        console.error('Failed to delete shot:', result.error);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset playing state and trim mode when shot changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    // Reset trim mode
    setTrimMode(false);
    setTrimError(null);
    // Initialize trim points to full video duration
    if (selectedShot) {
      setTrimStart(0);
      setTrimEnd(selectedShot.shot_duration_seconds);
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;

      // Auto-play next shot if auto-play is enabled
      if (autoPlay && selectedShot?.video_url) {
        void videoRef.current.play();
      }
    }
  }, [selectedShot?.id, autoPlay, selectedShot?.shot_duration_seconds]);

  const togglePlayPause = (): void => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      void videoRef.current.play();
    }

    setIsPlaying(!isPlaying);
  };

  const handleVideoEnded = (): void => {
    setIsPlaying(false);

    // Auto-play next shot if enabled
    if (autoPlay) {
      playNextShot();
    }
  };

  const handleVideoPlay = (): void => {
    setIsPlaying(true);
  };

  const handleVideoPause = (): void => {
    setIsPlaying(false);
  };

  const handleTimeUpdate = (): void => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);

      // In trim mode, loop playback between trim points
      if (trimMode && time >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
    }
  };

  // Find next shot in sequence (across all scenes)
  const playNextShot = (): void => {
    if (!selectedScene || !selectedShot) return;

    // Try to find next shot in current scene
    const currentShotIndex = selectedScene.shots.findIndex(s => s.id === selectedShot.id);
    if (currentShotIndex < selectedScene.shots.length - 1) {
      const nextShot = selectedScene.shots[currentShotIndex + 1];
      if (nextShot.video_url) {
        onShotChange(selectedScene, nextShot);
        return;
      }
    }

    // Move to next scene
    const currentSceneIndex = allScenes.findIndex(s => s.id === selectedScene.id);
    if (currentSceneIndex < allScenes.length - 1) {
      const nextScene = allScenes[currentSceneIndex + 1];
      const firstShotWithVideo = nextScene.shots.find(s => s.video_url);
      if (firstShotWithVideo) {
        onShotChange(nextScene, firstShotWithVideo);
        return;
      }
    }

    // No more shots to play
    setAutoPlay(false);
    console.log('Reached end of timeline');
  };

  const skipToNextShot = (): void => {
    playNextShot();
  };

  const isVideoReady =
    !!selectedShot?.video_url &&
    (selectedShot.video_status === 'ready' || selectedShot.video_status === 'approved');
  // Show placeholder if no shot selected or no ready/approved video available
  const showPlaceholder = !selectedShot || !isVideoReady;
  const showVideo = isVideoReady;

  // Calculate shot markers for current scene
  const shotMarkers = selectedScene?.shots.map((shot, index) => {
    const totalDuration = selectedScene.shots.reduce((sum, s) => sum + s.shot_duration_seconds, 0);
    const shotStart = selectedScene.shots
      .slice(0, index)
      .reduce((sum, s) => sum + s.shot_duration_seconds, 0);
    const position = (shotStart / totalDuration) * 100;
    const width = (shot.shot_duration_seconds / totalDuration) * 100;

    return {
      shot,
      position,
      width,
      isActive: shot.id === selectedShot?.id,
      hasVideo: !!shot.video_url,
    };
  }) || [];

  const handlePlayAll = (): void => {
    if (!autoPlay) {
      // Enable auto-play and start playing current video
      setAutoPlay(true);
      if (videoRef.current && selectedShot?.video_url) {
        void videoRef.current.play();
      }
    } else {
      // Stop auto-play and pause current video
      setAutoPlay(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  };

  // Trim mode handlers
  const handleTrimChange = useCallback((start: number, end: number) => {
    setTrimStart(start);
    setTrimEnd(end);
    setTrimError(null);
  }, []);

  const handleTrimSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleEnterTrimMode = (): void => {
    if (!selectedShot) return;
    setTrimMode(true);
    setTrimStart(0);
    setTrimEnd(selectedShot.shot_duration_seconds);
    setTrimError(null);
    setCurrentTime(0);
    setTrimRevision((prev) => prev + 1);
    // Disable auto-play when entering trim mode
    setAutoPlay(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleExitTrimMode = (): void => {
    setTrimMode(false);
    setTrimError(null);
    // Reset trim points
    if (selectedShot) {
      setTrimStart(0);
      setTrimEnd(selectedShot.shot_duration_seconds);
      setCurrentTime(0);
      setTrimRevision((prev) => prev + 1);
    }
  };

  const handleApplyTrim = async (): Promise<void> => {
    if (!selectedShot || !selectedScene) return;

    // Validate that we're actually trimming something
    if (trimStart === 0 && trimEnd === selectedShot.shot_duration_seconds) {
      setTrimError('No changes to apply. Adjust trim points first.');
      return;
    }

    setIsTrimming(true);
    setTrimError(null);

    try {
      // Call trim action via RPC
      const result = await shotsAction(
        'trimShotVideo',
        selectedShot.id,
        trimStart,
        trimEnd,
        preciseTrim ? 'precise' : 'fast'
      ) as {
        success: boolean;
        error?: string;
        videoUrl?: string;
        duration?: number;
      };

      if (result.success && result.videoUrl) {
        // Update local state with new video URL and duration
        const updatedShot: TimelineShot = {
          ...selectedShot,
          video_url: result.videoUrl,
          shot_duration_seconds: result.duration ?? (trimEnd - trimStart),
        };

        // Notify parent component of the update
        onShotUpdate?.(selectedScene, updatedShot);
        onTimelineRefresh?.();

        // Keep trim mode active for iterative adjustments
        setTrimMode(true);
        setTrimStart(0);
        setTrimEnd(updatedShot.shot_duration_seconds);
        setCurrentTime(0);
        setTrimRevision((prev) => prev + 1);
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }

        console.log('✅ Video trimmed successfully');
      } else {
        setTrimError(result.error || 'Failed to trim video');
      }
    } catch (error) {
      console.error('❌ Error trimming video:', error);
      setTrimError(error instanceof Error ? error.message : 'Failed to trim video');
    } finally {
      setIsTrimming(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Play All Button */}
      <div className="flex justify-center">
        <Button
          onClick={handlePlayAll}
          size="default"
          className="bg-[#f5c518] hover:bg-[#f5c518]/90 text-black font-oswald text-sm uppercase tracking-wider"
        >
          {autoPlay ? (
            <>
              <Pause className="w-4 h-4 mr-2" />
              Stop Auto-Play
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Play All Scenes
            </>
          )}
        </Button>
      </div>

      {/* Video Preview */}
      <div className={cn('relative w-full bg-black/40 border border-[#333] rounded-lg overflow-hidden', className)}>
        {/* Video Player */}
        {showVideo && selectedShot.video_url && (
          <video
            ref={videoRef}
            src={selectedShot.video_url}
            className="w-full h-full object-contain"
            onEnded={handleVideoEnded}
            onPlay={handleVideoPlay}
            onPause={handleVideoPause}
            onTimeUpdate={handleTimeUpdate}
            playsInline
          />
        )}

      {/* Placeholder - No Video */}
      {showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center">
          {selectedShot?.video_status === 'generating' ? (
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#f5c518] mx-auto" />
              <p className="text-[#f5c518] font-courier text-lg">Generating Video...</p>
            </div>
          ) : selectedShot?.start_frame_image_url ? (
            <div className="relative w-full h-full">
              <img
                src={optimizeImageUrl(selectedShot.start_frame_image_url, IMAGE_SIZES.previewLarge)}
                alt="Scene preview"
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <p className="text-white/60 font-courier text-lg">Video not ready</p>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <Play className="w-16 h-16 text-white/20 mx-auto" />
              <p className="text-white/60 font-courier text-lg">
                {selectedScene ? 'Select a shot to preview' : 'No scene selected'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Play/Pause Button Overlay */}
      {showVideo && (
        <Button
          onClick={togglePlayPause}
          size="lg"
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white w-20 h-20 rounded-full p-0 transition-opacity hover:opacity-100 opacity-60"
        >
          {isPlaying ? (
            <Pause className="w-10 h-10" />
          ) : (
            <Play className="w-10 h-10 ml-1" />
          )}
        </Button>
      )}

      {/* Top Controls Bar */}
      {selectedShot && (
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {/* Trim Button */}
          {showVideo && !trimMode && (
            <Button
              onClick={handleEnterTrimMode}
              size="sm"
              variant="outline"
              className="bg-black/70 hover:bg-[#f5c518]/80 border-[#f5c518]/50 text-[#f5c518] hover:text-black font-courier text-xs"
            >
              <Scissors className="w-4 h-4 mr-1" />
              Trim
            </Button>
          )}

          {/* Skip to Next Shot */}
          {showVideo && !trimMode && (
            <Button
              onClick={skipToNextShot}
              size="sm"
              variant="outline"
              className="bg-black/70 hover:bg-black/90 border-white/20 font-courier text-xs text-white"
            >
              <SkipForward className="w-4 h-4 mr-1" />
              Next
            </Button>
          )}

          {/* Delete Shot Button (hidden in trim mode) */}
          {canDeleteShot && !trimMode && (
            <ConfirmDialog
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isDeleting}
                  className="bg-black/70 hover:bg-red-500/80 border-red-500/50 text-red-400 hover:text-white font-courier text-xs"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </>
                  )}
                </Button>
              }
              title="Delete Shot"
              description={`Are you sure you want to delete Shot ${selectedShot.shot_number}? This action cannot be undone.`}
              confirmLabel="Delete"
              cancelLabel="Cancel"
              onConfirm={handleDeleteShot}
              isLoading={isDeleting}
              variant="danger"
            />
          )}

          {/* Trim Mode Controls */}
          {trimMode && (
            <>
              <Button
                onClick={handleExitTrimMode}
                size="sm"
                variant="outline"
                disabled={isTrimming}
                className="bg-black/70 hover:bg-black/90 border-white/20 font-courier text-xs text-white"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                onClick={handleApplyTrim}
                size="sm"
                disabled={isTrimming}
                className="bg-[#f5c518] hover:bg-[#f5c518]/90 text-black font-courier text-xs"
              >
                {isTrimming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Trimming...
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4 mr-1" />
                    Apply Trim
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Scene Info and Shot Markers Overlay */}
      {selectedScene && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
          {/* Shot Markers Track */}
          {shotMarkers.length > 1 && (
            <div className="mb-3">
              <div className="relative h-8 bg-black/40 rounded overflow-hidden">
                {shotMarkers.map((marker) => (
                  <div
                    key={marker.shot.id}
                    className={cn(
                      'absolute h-full border-r border-black transition-all cursor-pointer',
                      marker.isActive
                        ? 'bg-[#f5c518] opacity-100'
                        : marker.hasVideo
                        ? 'bg-white/60 hover:bg-white/80 opacity-80'
                        : 'bg-white/20 opacity-40'
                    )}
                    style={{
                      left: `${marker.position}%`,
                      width: `${marker.width}%`,
                    }}
                    onClick={() => marker.hasVideo && onShotChange(selectedScene, marker.shot)}
                  >
                    <div className="flex items-center justify-center h-full">
                      <span className="text-xs font-oswald font-bold text-black">
                        {marker.shot.shot_number}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-white/40 font-courier mt-1">
                <span>Shot Markers</span>
                <span>{selectedScene.shots.length} shots total</span>
              </div>
            </div>
          )}

          {/* Scene and Shot Info */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-[#f5c518] font-oswald text-sm uppercase tracking-wider">
                Scene {selectedScene.scene_number}
              </span>
              {selectedShot && (
                <>
                  <span className="text-white/40">•</span>
                  <span className="text-[#00f2ea] font-courier text-sm">
                    Shot {selectedShot.shot_number}/{selectedScene.shots.length}
                  </span>
                  <span className="text-white/40">•</span>
                  <span className="text-white/60 font-courier text-sm">
                    {selectedShot.shot_duration_seconds}s
                  </span>
                  {autoPlay && (
                    <>
                      <span className="text-white/40">•</span>
                      <span className="text-[#f5c518] font-courier text-xs animate-pulse">
                        AUTO-PLAY ON
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
            <p className="text-white font-courier text-sm">{selectedScene.slugline}</p>
          </div>

          {/* Video Progress Bar (normal mode) */}
          {showVideo && selectedShot && !trimMode && (
            <div className="mt-2">
              <div className="relative h-1 bg-black/40 rounded-full overflow-hidden">
                <div
                  className="absolute h-full bg-[#f5c518] transition-all"
                  style={{
                    width: `${(currentTime / selectedShot.shot_duration_seconds) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Trim Slider (trim mode) */}
          {showVideo && selectedShot && trimMode && (
            <div className="mt-3">
              <TrimSlider
                key={`${selectedShot.id}-${trimRevision}`}
                duration={selectedShot.shot_duration_seconds}
                currentTime={currentTime}
                trimStart={trimStart}
                trimEnd={trimEnd}
                onTrimChange={handleTrimChange}
                onSeek={handleTrimSeek}
                disabled={isTrimming}
              />
              {/* Trim Error Message */}
              {trimError && (
                <div className="mt-2 text-red-400 text-xs font-courier text-center">
                  {trimError}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
