/**
 * Studio Export Route
 *
 * Export and download page - Assemble scene videos into a final reel
 * with crossfade transitions. Upload to YouTube and download MP4.
 *
 * Route: /projects/:id/studio/export
 */

import { db } from "@/lib/drizzle/db.server";
import {
  scenes as scenesTable,
  scene_shots,
  final_reels,
  projects,
  type SceneShot,
} from "@/lib/drizzle/schema";
import { eq, and, inArray, isNotNull, or, asc } from "drizzle-orm";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ExportPanel } from "@/components/export/export-panel";
import type { Route } from "./+types/projects.$id.studio.export";
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

  // Fetch project
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  // Fetch scenes
  const scenes = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.project_id, projectId))
    .orderBy(scenesTable.scene_number);

  // Fetch shots for assembly (ready + failed) from scene_shots table
  const sceneIds = scenes.map((s) => s.id);
  let readyVideoCount = 0;
  let assemblyShots: (SceneShot & { scene_number: number })[] = [];

  if (sceneIds.length > 0) {
    // Get all ready and failed shots
    const shots = await db
      .select()
      .from(scene_shots)
      .where(
        and(
          inArray(scene_shots.scene_id, sceneIds),
          or(
            eq(scene_shots.video_status, "ready"),
            eq(scene_shots.video_status, "approved"),
            eq(scene_shots.video_status, "failed")
          )
        )
      )
      .orderBy(asc(scene_shots.shot_number));

    // Create a map of scene_id to scene_number
    const sceneNumberMap = new Map(scenes.map((s) => [s.id, s.scene_number]));

    // Add scene_number to each shot
    assemblyShots = shots.map((shot) => ({
      ...shot,
      scene_number: sceneNumberMap.get(shot.scene_id) || 0,
    }));

    // Count ready shots (those with video_url)
    readyVideoCount = shots.filter(
      (s) => (s.video_status === "ready" || s.video_status === "approved") && s.video_url
    ).length;
  }

  // Fetch final reel status
  const [finalReel] = await db
    .select()
    .from(final_reels)
    .where(eq(final_reels.project_id, projectId))
    .limit(1);

  return {
    project,
    scenes,
    readyVideoCount,
    assemblyShots,
    finalReel,
  };
}

// =============================================================================
// Meta
// =============================================================================

export function meta({ data }: Route.MetaArgs) {
  if (!data?.project) {
    return [{ title: "Export | ripreel.io" }];
  }
  return [
    { title: `Export | ${data.project.title} | ripreel.io` },
    {
      name: "description",
      content: "Assemble and download your final reel",
    },
  ];
}

// =============================================================================
// Component
// =============================================================================

export default function StudioExportPage({ loaderData }: Route.ComponentProps) {
  const { project, scenes, readyVideoCount, assemblyShots, finalReel } = loaderData;

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Download className="text-[#f5c518]" size={32} />
          <h1 className="font-oswald text-4xl md:text-5xl uppercase font-bold tracking-tight text-white">
            Export & Download
          </h1>
        </div>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Badge className="bg-[#1c1c1f] text-[#888] border border-[#333] font-courier text-sm">
            {scenes.length} Scenes
          </Badge>
          <Badge className="bg-[#1c1c1f] text-[#00f2ea] border border-[#00f2ea]/30 font-courier text-sm">
            {readyVideoCount} Ready Shots
          </Badge>
        </div>

        {/* Instructions */}
        <div className="p-6 bg-[#1c1c1f] border-l-4 border-[#f5c518]">
          <h2 className="font-oswald uppercase text-lg text-[#f5c518] mb-2 tracking-wider">
            Final Assembly
          </h2>
          <p className="font-courier text-[#888] text-sm leading-relaxed">
            Assemble your scene videos into a final reel with crossfade
            transitions. The video will be uploaded to YouTube as an unlisted
            video for easy sharing, and you can also download the MP4 file
            directly.
          </p>
        </div>
      </div>

      {/* Export Panel */}
      <ExportPanel
        projectId={project.id}
        projectTitle={project.title}
        readyVideoCount={readyVideoCount}
        totalSceneCount={scenes.length}
        assemblyShots={assemblyShots}
        finalReel={
          finalReel
            ? {
                id: finalReel.id,
                status: finalReel.status,
                video_url: finalReel.video_url,
                youtube_url: finalReel.youtube_url,
                youtube_id: finalReel.youtube_id,
                error_message: finalReel.error_message,
                created_at: finalReel.created_at,
              }
            : null
        }
      />
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
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="p-6 bg-[#1c1c1f] border-l-4 border-red-500">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-red-500" size={24} />
          <h2 className="font-oswald uppercase text-lg text-red-500 tracking-wider">
            Error Loading Export
          </h2>
        </div>
        <p className="font-courier text-[#888] text-sm leading-relaxed">
          {isRouteErrorResponse(error)
            ? `${error.status}: ${error.statusText}`
            : error instanceof Error
              ? error.message
              : "An unexpected error occurred while loading the export page."}
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
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 bg-[#333] rounded animate-pulse" />
          <div className="h-12 w-64 bg-[#333] rounded animate-pulse" />
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-6 w-24 bg-[#333] rounded animate-pulse" />
          <div className="h-6 w-32 bg-[#333] rounded animate-pulse" />
        </div>

        <div className="p-6 bg-[#1c1c1f] border-l-4 border-[#f5c518] animate-pulse">
          <div className="h-6 w-48 bg-[#333] rounded mb-2" />
          <div className="h-4 w-full bg-[#333] rounded" />
        </div>
      </div>

      {/* Export panel skeleton */}
      <div className="h-96 bg-[#1c1c1f] border border-[#333] rounded animate-pulse" />
    </div>
  );
}
