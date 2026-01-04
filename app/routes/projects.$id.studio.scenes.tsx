/**
 * Studio Scenes Route
 *
 * Scene validation page (HITL Checkpoint #1) - Review each scene parsed by n8n.
 * Verify accuracy and approve scenes to proceed to image generation.
 *
 * Route: /projects/:id/studio/scenes
 */

import { Link } from "react-router";
import { db } from "@/lib/drizzle/db.server";
import {
  projects,
  scenes as scenesTable,
  projectCharacters,
  projectLocations,
  projectProps,
} from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { Film, CheckCircle, Clock, Clapperboard } from "lucide-react";
import { EditableSceneCard } from "@/components/scenes/editable-scene-card";
import { ScenesLoader } from "@/components/scenes/scenes-loader";
import { ApproveAllButton } from "@/components/scenes/approve-all-button";
import { AutoGenerateButton } from "@/components/scenes/auto-generate-button";
import { RegenerateScenesButton } from "@/components/scenes/regenerate-scenes-button";
import { cn } from "@/lib/utils";
import type { Route } from "./+types/projects.$id.studio.scenes";

// =============================================================================
// Server Loader
// =============================================================================

export async function loader({ params }: Route.LoaderArgs) {
  const startTime = performance.now();
  const projectId = params.id;

  // Parallel fetch - project first (needed for 404 check), then all other data in parallel
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const t1 = performance.now();
  // Fetch all data in parallel for better performance
  const [scenes, characters, locations, props] = await Promise.all([
    db.select()
      .from(scenesTable)
      .where(eq(scenesTable.project_id, projectId))
      .orderBy(scenesTable.scene_number),
    db.select()
      .from(projectCharacters)
      .where(eq(projectCharacters.project_id, projectId))
      .orderBy(projectCharacters.name),
    db.select()
      .from(projectLocations)
      .where(eq(projectLocations.project_id, projectId))
      .orderBy(projectLocations.name),
    db.select()
      .from(projectProps)
      .where(eq(projectProps.project_id, projectId))
      .orderBy(projectProps.name),
  ]);

  console.log(`⏱️ [Scenes] Data fetch: ${(performance.now() - t1).toFixed(0)}ms`);
  console.log(`⏱️ [Scenes] TOTAL: ${(performance.now() - startTime).toFixed(0)}ms | scenes=${scenes.length}`);

  // Calculate stats
  const totalScenes = scenes.length;
  const approvedScenes = scenes.filter(
    (s) => s.validation_status === "approved"
  ).length;
  const pendingScenes = totalScenes - approvedScenes;
  const allScenesApproved = totalScenes > 0 && approvedScenes === totalScenes;
  const totalDuration = scenes.reduce((sum, scene) => {
    return sum + (scene.full_data?.duration_estimate || scene.raw_scene_data?.estimated_duration_seconds || 0);
  }, 0);

  return {
    project,
    scenes,
    characters,
    locations,
    props,
    totalScenes,
    approvedScenes,
    pendingScenes,
    allScenesApproved,
    totalDuration,
  };
}

// =============================================================================
// Client Loader - With caching for instant navigation
// =============================================================================

import { getCachedData, setCachedData, getStudioCacheKey } from "@/lib/studio-cache";

export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  const cacheKey = getStudioCacheKey(params.id, "scenes");

  // Check cache first
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
    return [{ title: "Scenes | ripreel.io" }];
  }
  return [
    { title: `Scenes | ${data.project.title} | ripreel.io` },
    {
      name: "description",
      content: "Review and approve parsed screenplay scenes",
    },
  ];
}

// =============================================================================
// Component
// =============================================================================

export default function StudioScenesPage({ loaderData }: Route.ComponentProps) {
  const {
    project,
    scenes,
    characters,
    locations,
    props,
    totalScenes,
    approvedScenes,
    pendingScenes,
    allScenesApproved,
    totalDuration,
  } = loaderData;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Instructions */}
      <div className="mb-8 p-6 bg-[#1c1c1f] border-l-4 border-[#f5c518]">
        <h2 className="font-oswald uppercase text-lg text-[#f5c518] mb-2 tracking-wider">
          Scene Validation (HITL Checkpoint #1)
        </h2>
        <p className="font-courier text-[#888] text-sm leading-relaxed">
          Review each scene parsed by n8n. The AI has extracted scene details
          including characters, props, visual mood, and audio requirements.
          Verify accuracy and approve scenes to proceed to image generation.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-[#1c1c1f] border border-[#333] rounded mb-6">
        <div className="flex items-center gap-2 text-[#888]">
          <Film size={16} />
          <span className="font-courier text-sm">
            {totalScenes} {totalScenes === 1 ? "Scene" : "Scenes"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[#888]">
          <Clock size={16} />
          <span className="font-courier text-sm">
            ~{Math.ceil(totalDuration / 60)}min total
          </span>
        </div>
        <div className="flex items-center gap-2 text-[#888]">
          <CheckCircle size={16} />
          <span className="font-courier text-sm">
            {approvedScenes}/{totalScenes} approved
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <RegenerateScenesButton projectId={project.id} />
          <AutoGenerateButton projectId={project.id} sceneCount={totalScenes} />
        </div>
      </div>

      {/* Scenes List with Loading State */}
      <ScenesLoader initialProject={project} initialScenes={scenes} />

      {/* Empty State - No scenes yet */}
      {scenes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6 bg-[#1c1c1f] border border-[#333] rounded">
          <Clapperboard size={48} className="text-[#444] mb-4" />
          <h3 className="font-oswald uppercase text-xl text-[#888] mb-2 tracking-wider">
            No Scenes Yet
          </h3>
          <p className="font-courier text-[#666] text-sm text-center max-w-md mb-6">
            Scenes will be generated automatically from your screenplay after the Bible is approved.
            If scene generation failed, you can retry manually.
          </p>
          <RegenerateScenesButton projectId={project.id} />
        </div>
      )}

      {scenes.length > 0 && (
        <div className="space-y-4">
          {scenes.map((scene) => (
            <EditableSceneCard
              key={scene.id}
              scene={scene}
              characters={characters}
              locations={locations}
              props={props}
            />
          ))}
        </div>
      )}

      {/* Action Buttons */}
      {scenes.length > 0 && (
        <div className="mt-8 flex justify-center items-center gap-4 flex-wrap">
          <ApproveAllButton
            projectId={project.id}
            pendingCount={pendingScenes}
            disabled={pendingScenes === 0}
          />
          <Link
            to={allScenesApproved ? `/projects/${project.id}/studio/images` : "#"}
            className={cn(
              "inline-flex items-center gap-3 font-oswald text-lg uppercase tracking-widest px-8 py-4 transition-all",
              allScenesApproved
                ? "bg-[#f5c518] hover:bg-white text-black hover:scale-105"
                : "bg-[#333] text-[#666] cursor-not-allowed pointer-events-none"
            )}
            aria-disabled={!allScenesApproved}
          >
            Continue to Images
          </Link>
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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="p-6 bg-[#1c1c1f] border-l-4 border-red-500">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-red-500" size={24} />
          <h2 className="font-oswald uppercase text-lg text-red-500 tracking-wider">
            Error Loading Scenes
          </h2>
        </div>
        <p className="font-courier text-[#888] text-sm leading-relaxed">
          {isRouteErrorResponse(error)
            ? `${error.status}: ${error.statusText}`
            : error instanceof Error
              ? error.message
              : "An unexpected error occurred while loading the scenes."}
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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Skeleton for instructions */}
      <div className="mb-8 p-6 bg-[#1c1c1f] border-l-4 border-[#f5c518] animate-pulse">
        <div className="h-6 w-64 bg-[#333] rounded mb-2" />
        <div className="h-4 w-full bg-[#333] rounded" />
      </div>

      {/* Skeleton for stats bar */}
      <div className="flex items-center gap-4 p-4 bg-[#1c1c1f] border border-[#333] rounded mb-6">
        <div className="h-4 w-24 bg-[#333] rounded" />
        <div className="h-4 w-24 bg-[#333] rounded" />
        <div className="h-4 w-32 bg-[#333] rounded" />
      </div>

      {/* Skeleton for scene cards */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-48 bg-[#1c1c1f] border border-[#333] rounded animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
