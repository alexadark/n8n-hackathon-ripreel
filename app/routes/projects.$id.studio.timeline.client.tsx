"use client";

/**
 * Timeline Client Component
 *
 * Client-side component that handles timeline interactivity:
 * - Scene selection for preview
 * - Shot selection within scenes
 * - Drag-and-drop scene reordering
 */

import { useEffect, useState } from "react";
import { useRevalidator } from "react-router";
import { PreviewMonitor } from "@/components/timeline/preview-monitor";
import { TimelineSequencer } from "@/components/timeline/timeline-sequencer";
import { TimelineControls } from "@/components/timeline/timeline-controls";
import type {
  TimelineData,
  TimelineScene,
  TimelineShot,
} from "@/app/actions/timeline.server";

interface TimelineClientProps {
  timelineData: TimelineData;
  projectId: string;
}

export function TimelineClient({
  timelineData,
  projectId,
}: TimelineClientProps) {
  const revalidator = useRevalidator();
  const [scenes, setScenes] = useState<TimelineScene[]>(
    timelineData.scenes
  );
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(
    timelineData.scenes[0]?.id || null
  );
  const [selectedShotId, setSelectedShotId] = useState<string | null>(
    timelineData.scenes[0]?.shots[0]?.id || null
  );

  useEffect(() => {
    setScenes(timelineData.scenes);
    setSelectedSceneId((prevSceneId) => {
      const nextScene =
        timelineData.scenes.find((scene) => scene.id === prevSceneId) ||
        timelineData.scenes[0] ||
        null;

      setSelectedShotId((prevShotId) => {
        const nextShot = nextScene
          ? nextScene.shots.find((shot) => shot.id === prevShotId) ||
            nextScene.shots.find((shot) => shot.video_url) ||
            nextScene.shots[0] ||
            null
          : null;
        return nextShot?.id || null;
      });

      return nextScene?.id || null;
    });
  }, [timelineData.scenes]);

  const selectedScene =
    scenes.find((scene) => scene.id === selectedSceneId) || null;
  const selectedShot =
    selectedScene?.shots.find((shot) => shot.id === selectedShotId) || null;

  const handleShotDelete = (): void => {
    // Revalidate to get updated timeline data
    revalidator.revalidate();
    // Clear selection (shot no longer exists)
    setSelectedShotId(null);
  };

  const handleSceneSelect = (scene: TimelineScene): void => {
    setSelectedSceneId(scene.id);
    // Auto-select first shot of the scene with video
    const firstShotWithVideo =
      scene.shots.find((s) => s.video_url) || scene.shots[0];
    setSelectedShotId(firstShotWithVideo?.id || null);
  };

  const handleShotChange = (scene: TimelineScene, shot: TimelineShot): void => {
    setSelectedSceneId(scene.id);
    setSelectedShotId(shot.id);
  };

  const handleShotUpdate = (scene: TimelineScene, updatedShot: TimelineShot): void => {
    setScenes((prevScenes) =>
      prevScenes.map((prevScene) =>
        prevScene.id === scene.id
          ? {
              ...prevScene,
              shots: prevScene.shots.map((shot) =>
                shot.id === updatedShot.id ? updatedShot : shot
              ),
            }
          : prevScene
      )
    );
    setSelectedSceneId(scene.id);
    setSelectedShotId(updatedShot.id);
  };

  return (
    <div className="space-y-8">
      {/* Preview Monitor */}
      <PreviewMonitor
        selectedScene={selectedScene}
        selectedShot={selectedShot}
        allScenes={scenes}
        onShotChange={handleShotChange}
        onShotUpdate={handleShotUpdate}
        onShotDelete={handleShotDelete}
        onTimelineRefresh={revalidator.revalidate}
        className="aspect-video"
      />

      {/* Timeline Sequencer */}
      <TimelineSequencer
        scenes={scenes}
        projectId={projectId}
        selectedSceneId={selectedScene?.id || null}
        onSceneSelect={handleSceneSelect}
      />

      {/* Timeline Controls */}
      <TimelineControls
        scenes={scenes}
        totalDurationSeconds={timelineData.total_duration_seconds}
        allVideosReady={timelineData.all_videos_ready}
        projectId={projectId}
      />
    </div>
  );
}
