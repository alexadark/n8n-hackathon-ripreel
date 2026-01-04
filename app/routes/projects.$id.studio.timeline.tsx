/**
 * Studio Timeline Route
 *
 * Timeline editor page - Preview videos and drag-drop scene reordering.
 * Displays all scenes with their shots in a visual timeline.
 *
 * Route: /projects/:id/studio/timeline
 */

import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getTimelineData, type TimelineData } from "@/app/actions/timeline.server";
import type { Route } from "./+types/projects.$id.studio.timeline";
import type { ShouldRevalidateFunctionArgs } from "react-router";

// =============================================================================
// Should Revalidate - Only revalidate on actions, not on navigation
// =============================================================================

export function shouldRevalidate({ formAction, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  if (formAction) {
    return defaultShouldRevalidate;
  }
  return false;
}

// =============================================================================
// Loader
// =============================================================================

export async function loader({ params }: Route.LoaderArgs) {
  const projectId = params.id;

  // Fetch timeline data
  const result = await getTimelineData(projectId);

  if (!result.success) {
    throw new Error(result.error || "Failed to load timeline data");
  }

  const timelineData = result.data as TimelineData;

  return {
    projectId,
    timelineData,
  };
}

// =============================================================================
// Meta
// =============================================================================

export function meta() {
  return [
    { title: "Timeline | ripreel.io" },
    {
      name: "description",
      content: "Preview and reorder scenes in your timeline",
    },
  ];
}

// =============================================================================
// Component
// =============================================================================

// Import the client component for timeline interactivity
import { TimelineClient } from "./projects.$id.studio.timeline.client";

// Format duration (seconds to MM:SS)
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function StudioTimelinePage({ loaderData }: Route.ComponentProps) {
  const { projectId, timelineData } = loaderData;

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="text-[#f5c518]" size={32} />
          <h1 className="font-oswald text-4xl md:text-5xl uppercase font-bold tracking-tight text-white">
            Timeline & Sequencer
          </h1>
        </div>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Badge className="bg-[#1c1c1f] text-[#888] border border-[#333] font-courier text-sm">
            {timelineData.scenes.length} Scenes
          </Badge>
          <Badge className="bg-[#1c1c1f] text-[#888] border border-[#333] font-courier text-sm">
            {formatDuration(timelineData.total_duration_seconds)} Total Duration
          </Badge>
          <Badge
            className={
              timelineData.all_videos_ready
                ? "bg-green-500/20 text-green-400 border-green-500/40 font-courier text-sm"
                : "bg-[#1c1c1f] text-[#888] border border-[#333] font-courier text-sm"
            }
          >
            {timelineData.all_videos_ready
              ? "All Videos Ready"
              : "Videos Generating..."}
          </Badge>
        </div>

        {/* Instructions */}
        <div className="p-6 bg-[#1c1c1f] border-l-4 border-[#f5c518]">
          <h2 className="font-oswald uppercase text-lg text-[#f5c518] mb-2 tracking-wider">
            Timeline Instructions
          </h2>
          <p className="font-courier text-[#888] text-sm leading-relaxed">
            Click any scene to preview its video. Drag and drop scenes to
            reorder your reel. When all videos are ready, proceed to Final
            Review for audio mixing and export.
          </p>
        </div>
      </div>

      {/* Timeline Client Component (handles interactivity) */}
      <TimelineClient timelineData={timelineData} projectId={projectId} />
    </div>
  );
}

// =============================================================================
// Error Boundary
// =============================================================================

import { isRouteErrorResponse, useRouteError } from "react-router";
import { AlertTriangle } from "lucide-react";

export function ErrorBoundary() {
  const error = useRouteError();

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="p-6 bg-[#1c1c1f] border-l-4 border-red-500">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-red-500" size={24} />
          <h2 className="font-oswald uppercase text-lg text-red-500 tracking-wider">
            Error Loading Timeline
          </h2>
        </div>
        <p className="font-courier text-[#888] text-sm leading-relaxed">
          {isRouteErrorResponse(error)
            ? `${error.status}: ${error.statusText}`
            : error instanceof Error
              ? error.message
              : "An unexpected error occurred while loading the timeline."}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Hydrate Fallback
// =============================================================================

export function HydrateFallback() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 bg-[#333] rounded animate-pulse" />
          <div className="h-12 w-64 bg-[#333] rounded animate-pulse" />
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-6 w-24 bg-[#333] rounded animate-pulse" />
          <div className="h-6 w-32 bg-[#333] rounded animate-pulse" />
          <div className="h-6 w-28 bg-[#333] rounded animate-pulse" />
        </div>

        <div className="p-6 bg-[#1c1c1f] border-l-4 border-[#f5c518] animate-pulse">
          <div className="h-6 w-48 bg-[#333] rounded mb-2" />
          <div className="h-4 w-full bg-[#333] rounded" />
        </div>
      </div>

      {/* Timeline skeleton */}
      <div className="space-y-6">
        <div className="h-80 bg-[#1c1c1f] border border-[#333] rounded animate-pulse" />
        <div className="h-32 bg-[#1c1c1f] border border-[#333] rounded animate-pulse" />
      </div>
    </div>
  );
}
