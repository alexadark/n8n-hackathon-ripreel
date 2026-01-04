/**
 * Studio Video Route
 *
 * Video generation page - Generate videos for each shot using the scene's
 * approved image as the starting frame with Google VEO 3.1.
 *
 * Route: /projects/:id/studio/video
 */

import { db } from "@/lib/drizzle/db.server";
import { scenes as scenesTable, scene_shots, shotImageVariants as shotImageVariantsTable } from "@/lib/drizzle/schema";
import { eq, inArray, asc } from "drizzle-orm";
import type { ShotImageVariant } from "@/lib/drizzle/schema";
import { Video } from "lucide-react";
import { VideoGenerationDashboard } from "@/components/studio/video-generation-dashboard";
import type { Route } from "./+types/projects.$id.studio.video";

// =============================================================================
// Server Loader
// =============================================================================

export async function loader({ params }: Route.LoaderArgs) {
  const projectId = params.id;

  // Fetch scenes
  const scenes = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.project_id, projectId))
    .orderBy(asc(scenesTable.scene_number));

  // Fetch shots for all scenes
  const sceneIds = scenes.map((s) => s.id);
  const shots =
    sceneIds.length > 0
      ? await db
          .select()
          .from(scene_shots)
          .where(inArray(scene_shots.scene_id, sceneIds))
          .orderBy(asc(scene_shots.shot_number))
      : [];

  // Debug: Log first shot's video_prompt_veo3
  if (shots.length > 0) {
    console.log('📊 [Video Loader] First shot video_prompt_veo3:', JSON.stringify(shots[0].video_prompt_veo3, null, 2));
  }

  // Fetch shot image variants for all shots
  const shotIds = shots.map((s) => s.id);
  const imageVariants: ShotImageVariant[] =
    shotIds.length > 0
      ? await db
          .select()
          .from(shotImageVariantsTable)
          .where(inArray(shotImageVariantsTable.shot_id, shotIds))
      : [];

  // Create shots map grouped by scene_id
  const shotsMap: Record<string, typeof shots> = {};
  for (const shot of shots) {
    if (!shotsMap[shot.scene_id]) {
      shotsMap[shot.scene_id] = [];
    }
    shotsMap[shot.scene_id].push(shot);
  }

  // Create image variants map grouped by shot_id
  const imageVariantsMap: Record<string, ShotImageVariant[]> = {};
  for (const variant of imageVariants) {
    if (!imageVariantsMap[variant.shot_id]) {
      imageVariantsMap[variant.shot_id] = [];
    }
    imageVariantsMap[variant.shot_id].push(variant);
  }

  // Combine scenes with their shots and shot image variants
  const scenesWithShots = scenes.map((scene) => {
    const sceneShots = shotsMap[scene.id] ?? [];
    // Build shot image variants map for this scene
    const sceneImageVariants: Record<string, ShotImageVariant[]> = {};
    for (const shot of sceneShots) {
      sceneImageVariants[shot.id] = imageVariantsMap[shot.id] ?? [];
    }
    return {
      scene,
      shots: sceneShots,
      shotImageVariants: sceneImageVariants,
    };
  });

  return {
    projectId,
    scenesWithShots,
    totalScenes: scenes.length,
    totalShots: shots.length,
  };
}

// =============================================================================
// Client Loader - With caching for instant navigation
// =============================================================================

import { getCachedData, setCachedData, getStudioCacheKey } from "@/lib/studio-cache";

export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  const cacheKey = getStudioCacheKey(params.id, "video");

  const cached = getCachedData<Awaited<ReturnType<typeof loader>>>(cacheKey);
  if (cached) {
    serverLoader().then((fresh) => setCachedData(cacheKey, fresh));
    return cached;
  }

  const data = await serverLoader();
  setCachedData(cacheKey, data);
  return data;
}

clientLoader.hydrate = true as const;

// =============================================================================
// Meta
// =============================================================================

export function meta() {
  return [
    { title: "Video Generation | ripreel.io" },
    {
      name: "description",
      content: "Generate videos for each shot with Google VEO 3.1",
    },
  ];
}

// =============================================================================
// Component
// =============================================================================

export default function StudioVideoPage({ loaderData }: Route.ComponentProps) {
  const { projectId, scenesWithShots } = loaderData;

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Video className="text-[#f5c518]" size={32} />
          <h1 className="font-oswald text-4xl md:text-5xl uppercase font-bold tracking-tight text-white">
            Video Generation
          </h1>
        </div>

        {/* Instructions */}
        <div className="p-6 bg-[#1c1c1f] border-l-4 border-[#f5c518]">
          <h2 className="font-oswald uppercase text-lg text-[#f5c518] mb-2 tracking-wider">
            Shot-Based Video Generation
          </h2>
          <p className="font-courier text-[#888] text-sm leading-relaxed">
            Each scene is divided into shots (max 8 seconds each). Generate
            videos for each shot using the scene&apos;s approved image as the
            starting frame. Videos are created with Google VEO 3.1 including
            audio from the prompt.
          </p>
        </div>
      </div>

      {/* Video Generation Dashboard */}
      <VideoGenerationDashboard
        projectId={projectId}
        scenesWithShots={scenesWithShots}
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
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="p-6 bg-[#1c1c1f] border-l-4 border-red-500">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-red-500" size={24} />
          <h2 className="font-oswald uppercase text-lg text-red-500 tracking-wider">
            Error Loading Video Generation
          </h2>
        </div>
        <p className="font-courier text-[#888] text-sm leading-relaxed">
          {isRouteErrorResponse(error)
            ? `${error.status}: ${error.statusText}`
            : error instanceof Error
              ? error.message
              : "An unexpected error occurred while loading the video page."}
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

        <div className="p-6 bg-[#1c1c1f] border-l-4 border-[#f5c518] animate-pulse">
          <div className="h-6 w-64 bg-[#333] rounded mb-2" />
          <div className="h-4 w-full bg-[#333] rounded" />
        </div>
      </div>

      {/* Video cards skeleton */}
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-64 bg-[#1c1c1f] border border-[#333] rounded animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
