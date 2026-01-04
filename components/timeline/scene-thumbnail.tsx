'use client';

/**
 * Scene Thumbnail Component
 *
 * Draggable scene card for the timeline sequencer.
 * Shows scene thumbnail, number, and total duration.
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Film, Clock } from 'lucide-react';
import { cn, optimizeImageUrl, IMAGE_SIZES } from '@/lib/utils';
import type { TimelineScene } from '@/app/actions/timeline.server';

interface SceneThumbnailProps {
  scene: TimelineScene;
  isSelected: boolean;
  onClick: () => void;
}

export function SceneThumbnail({ scene, isSelected, onClick }: SceneThumbnailProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calculate total scene duration from all shots
  const totalDuration = scene.shots.reduce((sum, shot) => sum + shot.shot_duration_seconds, 0);

  // Check if all shots have videos ready
  const allVideosReady = scene.shots.every(
    shot => shot.video_status === 'ready' || shot.video_status === 'approved'
  );

  // Get thumbnail image (use approved_image_url or first shot's start frame)
  const thumbnailUrl = scene.approved_image_url || scene.shots[0]?.start_frame_image_url;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative w-48 h-32 bg-[#1c1c1f] border-2 rounded-lg overflow-hidden transition-all cursor-pointer group',
        isSelected
          ? 'border-[#f5c518] shadow-lg shadow-[#f5c518]/20'
          : 'border-[#333] hover:border-[#f5c518]/60',
        isDragging && 'opacity-50 cursor-grabbing',
        !isDragging && 'cursor-move'
      )}
      onClick={onClick}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 z-10 p-1 bg-black/50 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-4 h-4 text-white/60" />
      </div>

      {/* Thumbnail Image */}
      {thumbnailUrl ? (
        <img
          src={optimizeImageUrl(thumbnailUrl, IMAGE_SIZES.previewSmall)}
          alt={scene.slugline}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black/20">
          <Film className="w-8 h-8 text-white/20" />
        </div>
      )}

      {/* Status Indicator Overlay */}
      {!allVideosReady && (
        <div className="absolute top-2 right-2">
          <div className={cn(
            'px-2 py-1 rounded text-xs font-courier font-bold uppercase',
            scene.shots.some(s => s.video_status === 'generating')
              ? 'bg-[#00f2ea]/80 text-black'
              : 'bg-black/60 text-white/80'
          )}>
            {scene.shots.some(s => s.video_status === 'generating') ? 'Generating' : 'Pending'}
          </div>
        </div>
      )}

      {/* Scene Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[#f5c518] font-oswald text-sm font-bold uppercase tracking-wider">
              Scene {scene.scene_number}
            </span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-white/60" />
              <span className="text-white/80 font-courier text-xs">
                {totalDuration}s
              </span>
            </div>
          </div>
          <p className="text-white/90 font-courier text-xs truncate">
            {scene.slugline}
          </p>
        </div>
      </div>

      {/* Shot Count Badge */}
      {scene.shots.length > 1 && (
        <div className="absolute top-2 left-2">
          <div className="px-2 py-1 bg-black/60 rounded text-xs font-courier text-white/80">
            {scene.shots.length} shots
          </div>
        </div>
      )}
    </div>
  );
}
