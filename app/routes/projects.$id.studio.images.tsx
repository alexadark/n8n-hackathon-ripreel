/**
 * Studio Images Route
 *
 * Scene image generation page (HITL Checkpoint #2) - Generate and select
 * images for each scene using dual-model generation with Bible integration.
 *
 * Route: /projects/:id/studio/images
 */

import { db } from "@/lib/drizzle/db.server";
import {
  projects,
  scenes as scenesTable,
  scene_shots,
  shotImageVariants as shotImageVariantsTable,
} from "@/lib/drizzle/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { Image as ImageIcon, Sparkles, Wand2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShotImageCard } from "@/components/studio/shot-image-card";
import { CreateShotsButton } from "@/components/studio/create-shots-button";
import { resolveBibleElements } from "@/app/actions/scene-images.server";
import type { Route } from "./+types/projects.$id.studio.images";
import type { ShotImageVariant } from "@/lib/drizzle/schema";

// =============================================================================
// Server Loader
// =============================================================================

export async function loader({ params }: Route.LoaderArgs) {
  const projectId = params.id;

  // Fetch project first (needed for 404 check)
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

  // Fetch shots and variants in parallel
  const sceneIds = scenes.map((s) => s.id);
  const allShots = sceneIds.length > 0
    ? await db
        .select()
        .from(scene_shots)
        .where(inArray(scene_shots.scene_id, sceneIds))
        .orderBy(asc(scene_shots.shot_number))
    : [];

  // Fetch all shot image variants
  const shotIds = allShots.map((s) => s.id);
  const allShotVariants: ShotImageVariant[] = shotIds.length > 0
    ? await db
        .select()
        .from(shotImageVariantsTable)
        .where(inArray(shotImageVariantsTable.shot_id, shotIds))
    : [];

  // Group shots by scene_id
  const shotsByScene: Record<string, typeof allShots> = {};
  for (const shot of allShots) {
    if (!shotsByScene[shot.scene_id]) {
      shotsByScene[shot.scene_id] = [];
    }
    shotsByScene[shot.scene_id].push(shot);
  }

  // Group variants by shot_id
  const variantsByShot: Record<string, ShotImageVariant[]> = {};
  for (const variant of allShotVariants) {
    if (!variantsByShot[variant.shot_id]) {
      variantsByShot[variant.shot_id] = [];
    }
    variantsByShot[variant.shot_id].push(variant);
  }

  // Build scenes with shots and Bible data
  const scenesWithShots = await Promise.all(
    scenes.map(async (scene) => {
      const shots = shotsByScene[scene.id] || [];

      // Resolve Bible elements for this scene
      const bibleData = await resolveBibleElements(projectId, scene);

      // Check if scene has shots data in raw_scene_data (for diagnostic)
      const rawData = scene.full_data || scene.raw_scene_data;
      const hasShotsInData = !!(rawData?.shots && rawData.shots.length > 0);
      const shotsInDataCount = rawData?.shots?.length || 0;

      // Debug: Log scene shot data for each scene
      console.log(`📹 [Images Loader] Scene ${scene.scene_number} shot data:`, {
        sceneId: scene.id,
        slugline: scene.slugline,
        shotsInDb: shots.length,
        hasShotsInData,
        shotsInDataCount,
        has_full_data: !!scene.full_data,
        has_raw_scene_data: !!scene.raw_scene_data,
      });

      // Add variants to each shot
      const shotsWithVariants = shots.map((shot) => ({
        shot,
        variants: variantsByShot[shot.id] || [],
      }));

      return {
        scene,
        shots: shotsWithVariants,
        bibleData,
        hasShotsInData,
        shotsInDataCount,
      };
    })
  );

  // Count shots with approved images
  const totalShots = allShots.length;
  const approvedShots = allShots.filter((s) => s.start_frame_image_url).length;

  // Count shots that have ready variants but no approved image
  const readyToApproveCount = allShots.filter((shot) => {
    const hasApproved = !!shot.start_frame_image_url;
    const variants = variantsByShot[shot.id] || [];
    const hasReady = variants.some((v) => v.status === "ready" && v.image_url);
    return !hasApproved && hasReady;
  }).length;

  // Count shots generating
  const generatingCount = allShotVariants.filter((v) => v.status === "generating").length;

  return {
    project,
    scenesWithShots,
    approvedShots,
    readyToApproveCount,
    generatingCount,
    totalScenes: scenes.length,
    totalShots,
  };
}

// =============================================================================
// Client Loader - With caching for instant navigation
// =============================================================================

import { getCachedData, setCachedData, getStudioCacheKey } from "@/lib/studio-cache";

export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  const cacheKey = getStudioCacheKey(params.id, "images");

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

export function meta({ data }: Route.MetaArgs) {
  if (!data?.project) {
    return [{ title: "Images | ripreel.io" }];
  }
  return [
    { title: `Images | ${data.project.title} | ripreel.io` },
    {
      name: "description",
      content: "Generate and select images for each scene",
    },
  ];
}

// =============================================================================
// Component
// =============================================================================

export default function StudioImagesPage({ loaderData }: Route.ComponentProps) {
  const {
    project,
    scenesWithShots,
    approvedShots,
    readyToApproveCount,
    generatingCount,
    totalScenes,
    totalShots,
  } = loaderData;

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <ImageIcon className="text-[#f5c518]" size={32} />
          <h1 className="font-oswald text-4xl md:text-5xl uppercase font-bold tracking-tight text-white">
            Shot Image Generation
          </h1>
        </div>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Badge className="bg-[#1c1c1f] text-[#888] border border-[#333] font-courier text-sm">
            {totalScenes} Scenes
          </Badge>
          <Badge className="bg-[#1c1c1f] text-[#888] border border-[#333] font-courier text-sm">
            {totalShots} Shots
          </Badge>
          <Badge className="bg-green-500/20 text-green-400 border border-green-500/50 font-courier text-sm">
            {approvedShots} Approved
          </Badge>
          {readyToApproveCount > 0 && (
            <Badge className="bg-[#f5c518]/20 text-[#f5c518] border border-[#f5c518] font-courier text-sm">
              {readyToApproveCount} Ready to Approve
            </Badge>
          )}
          {generatingCount > 0 && (
            <Badge className="bg-[#00f2ea]/20 text-[#00f2ea] border border-[#00f2ea]/50 font-courier text-sm">
              {generatingCount} Generating
            </Badge>
          )}
        </div>

        {/* Instructions */}
        <div className="p-6 bg-[#1c1c1f] border-l-4 border-[#f5c518]">
          <h2 className="font-oswald uppercase text-lg text-[#f5c518] mb-2 tracking-wider">
            Shot Image Generation (HITL Checkpoint #2)
          </h2>
          <p className="font-courier text-[#888] text-sm leading-relaxed mb-3">
            <strong className="text-white">Per-Shot Images:</strong> Each shot
            gets its own unique starting image based on camera angle and composition.
            <br />
            <strong className="text-white">Dual-Model Generation:</strong> Generate
            with Seedream 4.5 and/or Nano Banana Pro models.
            <br />
            <strong className="text-white">Bible Integration:</strong> Character,
            location, and prop references are automatically injected.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Sparkles className="text-[#f5c518]" size={16} />
            <span className="font-courier text-[#666] text-xs">
              Select the best image for each shot. Approved images become the starting frame for video generation.
            </span>
          </div>
        </div>
      </div>

      {/* Scenes with Shots */}
      {scenesWithShots.length > 0 && (
        <div className="space-y-8">
          {scenesWithShots.map(({ scene, shots, bibleData, hasShotsInData, shotsInDataCount }) => (
            <div key={scene.id} className="space-y-4">
              {/* Scene Header */}
              <div className="flex items-center gap-3 border-b border-[#333] pb-3">
                <Badge className="bg-[#f5c518] text-black font-oswald text-sm px-3">
                  Scene {scene.scene_number}
                </Badge>
                <span className="font-courier text-[#888] text-sm">
                  {scene.slugline || 'No slugline'}
                </span>
                <span className="font-courier text-[#666] text-xs ml-auto">
                  {shots.length} shot{shots.length !== 1 ? 's' : ''} in DB
                  {hasShotsInData && shots.length === 0 && (
                    <span className="text-cyan-400 ml-2">
                      ({shotsInDataCount} in scene data)
                    </span>
                  )}
                </span>
              </div>

              {/* Shots */}
              {shots.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {shots.map(({ shot, variants }) => (
                    <ShotImageCard
                      key={shot.id}
                      shot={shot}
                      variants={variants}
                      bibleData={bibleData}
                      projectId={project.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-[#0a0a0b] border border-dashed border-[#333] rounded-lg text-center space-y-4">
                  {hasShotsInData ? (
                    <>
                      <p className="font-courier text-cyan-400 text-sm">
                        {shotsInDataCount} shot{shotsInDataCount !== 1 ? 's' : ''} found in scene data.
                      </p>
                      <p className="font-courier text-[#666] text-xs">
                        Click to extract shots and then generate images with your preferred model.
                      </p>
                      <CreateShotsButton sceneId={scene.id} sceneNumber={scene.scene_number} />
                    </>
                  ) : (
                    <>
                      <p className="font-courier text-amber-400 text-sm">
                        No shot data available for this scene.
                      </p>
                      <p className="font-courier text-[#666] text-xs max-w-md mx-auto">
                        This scene was created before shot generation was added.
                        Please regenerate scenes using the Scene Orchestrator workflow.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No Scenes - Show empty state */}
      {totalScenes === 0 && (
        <div className="text-center py-12">
          <p className="font-courier text-[#666]">
            No scenes found. Please complete scene validation first.
          </p>
        </div>
      )}
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
            Error Loading Images
          </h2>
        </div>
        <p className="font-courier text-[#888] text-sm leading-relaxed">
          {isRouteErrorResponse(error)
            ? `${error.status}: ${error.statusText}`
            : error instanceof Error
              ? error.message
              : "An unexpected error occurred while loading the images page."}
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
          <div className="h-6 w-24 bg-[#333] rounded animate-pulse" />
        </div>

        <div className="p-6 bg-[#1c1c1f] border-l-4 border-[#f5c518] animate-pulse">
          <div className="h-6 w-64 bg-[#333] rounded mb-2" />
          <div className="h-4 w-full bg-[#333] rounded" />
        </div>
      </div>

      {/* Scene cards skeleton */}
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-80 bg-[#1c1c1f] border border-[#333] rounded animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
