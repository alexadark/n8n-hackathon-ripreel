'use client';

/**
 * Timeline Sequencer Component
 *
 * Horizontal drag-and-drop scene track for the timeline.
 * Uses @dnd-kit for sortable functionality with optimistic updates.
 */

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SceneThumbnail } from './scene-thumbnail';
import { timelineAction } from '@/hooks/use-server-action';
import type { TimelineScene } from '@/app/actions/timeline.server';
import { Flag } from 'lucide-react';

interface TimelineSequencerProps {
  scenes: TimelineScene[];
  projectId: string;
  selectedSceneId: string | null;
  onSceneSelect: (scene: TimelineScene) => void;
}

export function TimelineSequencer({
  scenes,
  projectId,
  selectedSceneId,
  onSceneSelect,
}: TimelineSequencerProps) {
  const [orderedScenes, setOrderedScenes] = useState<TimelineScene[]>(scenes);

  // Update local state when scenes prop changes
  useEffect(() => {
    setOrderedScenes(scenes);
  }, [scenes]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts (prevents accidental drags)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // Calculate indices and new order from current state (before optimistic update)
    const oldIndex = orderedScenes.findIndex((s) => s.id === active.id);
    const newIndex = orderedScenes.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const previousOrder = orderedScenes; // Save current state for rollback
    const newOrder = arrayMove(orderedScenes, oldIndex, newIndex);
    const newSceneIds = newOrder.map((s) => s.id);

    // Optimistic update
    setOrderedScenes(newOrder);

    // Persist to database via RPC
    void timelineAction('updateSceneOrder', projectId, newSceneIds).then((result) => {
      if (!result.success) {
        // Rollback to previous UI state on error
        setOrderedScenes(previousOrder);
        console.error('Failed to update scene order:', result.error);
      }
    });
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-[#f5c518] font-oswald text-xl uppercase tracking-wider">
          Sequencer
        </h2>
      </div>

      {/* Scrollable Timeline Track */}
      <div className="relative">
        <div className="overflow-x-auto pb-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedScenes.map((s) => s.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex gap-4 min-w-min">
                {orderedScenes.map((scene) => (
                  <SceneThumbnail
                    key={scene.id}
                    scene={scene}
                    isSelected={scene.id === selectedSceneId}
                    onClick={() => onSceneSelect(scene)}
                  />
                ))}

                {/* End of Reel Marker */}
                <div className="w-48 h-32 border-2 border-dashed border-[#333] rounded-lg flex items-center justify-center bg-black/20">
                  <div className="text-center space-y-2">
                    <Flag className="w-8 h-8 text-white/20 mx-auto" />
                    <p className="text-white/40 font-courier text-sm">End of Reel</p>
                  </div>
                </div>
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
