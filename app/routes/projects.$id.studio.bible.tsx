/**
 * Studio Bible Route
 *
 * Bible review page (HITL Checkpoint #0.5) - Review and approve character
 * portraits and location images before scene generation.
 *
 * Route: /projects/:id/studio/bible
 */

import { Link } from "react-router";
import { db } from "@/lib/drizzle/db.server";
import {
  projects,
  projectCharacters,
  projectLocations,
  bibleImageVariants,
} from "@/lib/drizzle/schema";
import { eq, inArray, and } from "drizzle-orm";
import { Users, MapPin, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CharacterCard } from "@/components/bible/character-card";
import { LocationCard } from "@/components/bible/location-card";
import { BibleProgress } from "@/components/bible/bible-progress";
import { SkipBibleButton } from "@/components/bible/skip-bible-button";
import { BulkApproveBibleButton } from "@/components/bible/bulk-approve-bible-button";
import { BibleAutoRefresh } from "@/components/bible/bible-auto-refresh";
import { cn } from "@/lib/utils";
import { BIBLE_STORAGE_BUCKETS, resolveBibleImageUrl } from "@/lib/supabase/storage-bible";
import type { Route } from "./+types/projects.$id.studio.bible";

// =============================================================================
// Server Loader
// =============================================================================

export async function loader({ params }: Route.LoaderArgs) {
  const startTime = performance.now();
  const projectId = params.id;

  // Fetch project first (needed for 404 check)
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  console.log(`⏱️ [Bible] Project fetch: ${(performance.now() - startTime).toFixed(0)}ms`);

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const t1 = performance.now();
  // Fetch characters and locations in parallel
  const [characters, locations] = await Promise.all([
    db.select()
      .from(projectCharacters)
      .where(eq(projectCharacters.project_id, projectId))
      .orderBy(projectCharacters.created_at),
    db.select()
      .from(projectLocations)
      .where(eq(projectLocations.project_id, projectId))
      .orderBy(projectLocations.created_at),
  ]);

  console.log(`⏱️ [Bible] Characters/Locations fetch: ${(performance.now() - t1).toFixed(0)}ms`);

  // Fetch variants for both characters and locations in parallel
  const characterIds = characters.map((c) => c.id);
  const locationIds = locations.map((l) => l.id);

  const t2 = performance.now();
  const [allCharacterVariants, allLocationVariants] = await Promise.all([
    characterIds.length > 0
      ? db.select()
          .from(bibleImageVariants)
          .where(
            and(
              eq(bibleImageVariants.asset_type, "character"),
              inArray(bibleImageVariants.asset_id, characterIds)
            )
          )
      : Promise.resolve([]),
    locationIds.length > 0
      ? db.select()
          .from(bibleImageVariants)
          .where(
            and(
              eq(bibleImageVariants.asset_type, "location"),
              inArray(bibleImageVariants.asset_id, locationIds)
            )
          )
      : Promise.resolve([]),
  ]);

  const resolvedCharacters = characters.map((character) => ({
    ...character,
    portrait_image_url: resolveBibleImageUrl(
      character.portrait_image_url || character.approved_image_url,
      BIBLE_STORAGE_BUCKETS.characters,
      character.portrait_storage_path || character.approved_image_storage_path
    ),
    approved_image_url: resolveBibleImageUrl(
      character.approved_image_url,
      BIBLE_STORAGE_BUCKETS.characters,
      character.approved_image_storage_path
    ),
    portrait_status:
      character.portrait_status !== 'pending'
        ? character.portrait_status
        : character.image_status,
  }));

  const resolvedLocations = locations.map((location) => ({
    ...location,
    approved_image_url: resolveBibleImageUrl(
      location.approved_image_url,
      BIBLE_STORAGE_BUCKETS.locations,
      location.approved_image_storage_path
    ),
  }));

  const resolvedCharacterVariants = allCharacterVariants.map((variant) => ({
    ...variant,
    image_url: resolveBibleImageUrl(
      variant.image_url,
      BIBLE_STORAGE_BUCKETS.characters,
      variant.storage_path
    ),
  }));

  const resolvedLocationVariants = allLocationVariants.map((variant) => ({
    ...variant,
    image_url: resolveBibleImageUrl(
      variant.image_url,
      BIBLE_STORAGE_BUCKETS.locations,
      variant.storage_path
    ),
  }));

  console.log(`⏱️ [Bible] Variants fetch: ${(performance.now() - t2).toFixed(0)}ms`);
  console.log(`⏱️ [Bible] TOTAL: ${(performance.now() - startTime).toFixed(0)}ms | chars=${characters.length}, locs=${locations.length}, variants=${allCharacterVariants.length + allLocationVariants.length}`);

  // Group variants by character ID and shot type
  const variantsByCharacter: Record<string, Record<string, typeof resolvedCharacterVariants>> = {};
  for (const variant of resolvedCharacterVariants) {
    if (!variantsByCharacter[variant.asset_id]) {
      variantsByCharacter[variant.asset_id] = {};
    }
    const shotType = variant.shot_type || "unknown";
    if (!variantsByCharacter[variant.asset_id][shotType]) {
      variantsByCharacter[variant.asset_id][shotType] = [];
    }
    variantsByCharacter[variant.asset_id][shotType].push(variant);
  }

  // Group variants by location ID
  const variantsByLocation: Record<string, typeof resolvedLocationVariants> = {};
  for (const variant of resolvedLocationVariants) {
    if (!variantsByLocation[variant.asset_id]) {
      variantsByLocation[variant.asset_id] = [];
    }
    variantsByLocation[variant.asset_id].push(variant);
  }

  // Calculate approval stats (MVP: portrait only for characters)
  const charApproved = resolvedCharacters.filter(
    (c) => c.portrait_status === "approved"
  ).length;
  const locApproved = resolvedLocations.filter(
    (l) => l.image_status === "approved"
  ).length;

  // Check if all required assets are approved (characters + locations required)
  const allApproved =
    resolvedCharacters.length > 0 &&
    charApproved === resolvedCharacters.length &&
    resolvedLocations.length > 0 &&
    locApproved === resolvedLocations.length;

  // Count items ready to approve (MVP: portrait only for characters)
  let readyToApproveCount = 0;

  for (const character of resolvedCharacters) {
    // MVP: Only count portrait shot
    if (character.portrait_status === "approved") continue;

    // Check if there are ready variants for portrait
    const characterVariants = variantsByCharacter[character.id];
    if (characterVariants) {
      const portraitVariants = characterVariants["portrait"] || [];
      const hasReadyVariant = portraitVariants.some(
        (v) => (v.status === "ready" || v.status === "selected") && v.image_url
      );
      if (hasReadyVariant) readyToApproveCount++;
    }
  }

  for (const location of resolvedLocations) {
    if (location.image_status === "approved") continue;
    const locationVariants = variantsByLocation[location.id] || [];
    const hasReadyVariant = locationVariants.some(
      (v) => (v.status === "ready" || v.status === "selected") && v.image_url
    );
    if (hasReadyVariant) readyToApproveCount++;
  }

  // Count variants currently generating (for auto-refresh)
  const generatingCount =
    resolvedCharacterVariants.filter((v) => v.status === "generating").length +
    resolvedLocationVariants.filter((v) => v.status === "generating").length;

  return {
    project,
    characters: resolvedCharacters,
    locations: resolvedLocations,
    variantsByCharacter,
    variantsByLocation,
    charApproved,
    locApproved,
    allApproved,
    readyToApproveCount,
    generatingCount,
  };
}

// =============================================================================
// Client Loader - With caching for instant navigation
// =============================================================================

import { getCachedData, setCachedData, getStudioCacheKey } from "@/lib/studio-cache";

export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  const cacheKey = getStudioCacheKey(params.id, "bible");

  // Check cache first
  const cached = getCachedData<Awaited<ReturnType<typeof loader>>>(cacheKey);
  if (cached) {
    // Return cached data immediately, but refresh in background
    serverLoader().then((fresh) => setCachedData(cacheKey, fresh));
    return cached;
  }

  // No cache, fetch from server
  const data = await serverLoader();
  setCachedData(cacheKey, data);
  return data;
}

// Enable hydration so clientLoader runs on initial SSR
clientLoader.hydrate = true as const;

// =============================================================================
// Meta
// =============================================================================

export function meta({ data }: Route.MetaArgs) {
  if (!data?.project) {
    return [{ title: "Bible | ripreel.io" }];
  }
  return [
    { title: `Bible | ${data.project.title} | ripreel.io` },
    {
      name: "description",
      content: "Review and approve character and location reference images",
    },
  ];
}

// =============================================================================
// Component
// =============================================================================

export default function StudioBiblePage({ loaderData }: Route.ComponentProps) {
  const {
    project,
    characters,
    locations,
    variantsByCharacter,
    variantsByLocation,
    charApproved,
    locApproved,
    allApproved,
    readyToApproveCount,
    generatingCount,
  } = loaderData;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Instructions */}
      <div className="mb-8 p-6 bg-[#1c1c1f] border-l-4 border-[#f5c518]">
        <h2 className="font-oswald uppercase text-lg text-[#f5c518] mb-2 tracking-wider">
          Bible Review (HITL Checkpoint #0.5)
        </h2>
        <p className="font-courier text-[#888] text-sm leading-relaxed">
          Review and approve character portraits and location images before
          scene generation. These reference images will be used to maintain
          visual consistency across all scenes.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-[#1c1c1f] border border-[#333] rounded mb-6">
        <div className="flex items-center gap-2 text-[#888]">
          <Users size={16} />
          <span className="font-courier text-sm">
            {charApproved}/{characters.length} Characters
          </span>
        </div>
        <div className="flex items-center gap-2 text-[#888]">
          <MapPin size={16} />
          <span className="font-courier text-sm">
            {locApproved}/{locations.length} Locations
          </span>
        </div>
        {readyToApproveCount > 0 && (
          <Badge className="bg-[#f5c518]/20 text-[#f5c518] border border-[#f5c518] font-courier text-sm">
            {readyToApproveCount} Ready
          </Badge>
        )}
        <div className="ml-auto">
          <BulkApproveBibleButton
            projectId={project.id}
            readyCount={readyToApproveCount}
          />
        </div>
      </div>

      {/* Progress Bar */}
      <BibleProgress
        characters={{ total: characters.length, approved: charApproved }}
        locations={{ total: locations.length, approved: locApproved }}
      />

      {/* Tabs */}
      <Tabs defaultValue="characters" className="mt-8">
        <TabsList className="bg-[#1c1c1f] border border-[#333] p-1">
          <TabsTrigger
            value="characters"
            className="font-oswald uppercase tracking-wider data-[state=active]:bg-[#f5c518] data-[state=active]:text-black"
          >
            <Users size={16} className="mr-2" />
            Characters ({characters.length})
          </TabsTrigger>
          <TabsTrigger
            value="locations"
            className="font-oswald uppercase tracking-wider data-[state=active]:bg-[#f5c518] data-[state=active]:text-black"
          >
            <MapPin size={16} className="mr-2" />
            Locations ({locations.length})
          </TabsTrigger>
        </TabsList>

        {/* Characters Tab */}
        <TabsContent value="characters" className="mt-6">
          {characters.length === 0 ? (
            <div className="text-center py-12 text-[#666]">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p className="font-courier">No characters extracted yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {characters.map((character) => {
                // Convert record back to Map for the component
                const variantsRecord = variantsByCharacter[character.id];
                const variantsMap = variantsRecord
                  ? new Map(Object.entries(variantsRecord))
                  : undefined;
                return (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    variantsByShot={variantsMap}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="mt-6">
          {locations.length === 0 ? (
            <div className="text-center py-12 text-[#666]">
              <MapPin size={48} className="mx-auto mb-4 opacity-50" />
              <p className="font-courier">No locations extracted yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((location) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  variants={variantsByLocation[location.id] || []}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="mt-12 flex justify-center items-center gap-4 flex-wrap">
        <SkipBibleButton projectId={project.id} />
        <Link
          to={allApproved ? `/projects/${project.id}/studio/scenes` : "#"}
          className={cn(
            "inline-flex items-center gap-3 font-oswald text-lg uppercase tracking-widest px-8 py-4 transition-all",
            allApproved
              ? "bg-[#f5c518] hover:bg-white text-black hover:scale-105"
              : "bg-[#333] text-[#666] cursor-not-allowed pointer-events-none"
          )}
          aria-disabled={!allApproved}
        >
          <CheckCircle size={20} />
          Continue to Scene Validation
        </Link>
      </div>

      {/* Auto-refresh while generating */}
      <BibleAutoRefresh generatingCount={generatingCount} />
    </div>
  );
}

// =============================================================================
// Error Boundary
// =============================================================================

import { isRouteErrorResponse, useRouteError, Link as RouterLink } from "react-router";
import { AlertTriangle } from "lucide-react";

export function ErrorBoundary() {
  const error = useRouteError();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="p-6 bg-[#1c1c1f] border-l-4 border-red-500">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-red-500" size={24} />
          <h2 className="font-oswald uppercase text-lg text-red-500 tracking-wider">
            Error Loading Bible
          </h2>
        </div>
        <p className="font-courier text-[#888] text-sm leading-relaxed">
          {isRouteErrorResponse(error)
            ? `${error.status}: ${error.statusText}`
            : error instanceof Error
              ? error.message
              : "An unexpected error occurred while loading the Bible page."}
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
        <div className="h-4 w-32 bg-[#333] rounded" />
        <div className="h-4 w-32 bg-[#333] rounded" />
      </div>

      {/* Skeleton for tabs */}
      <div className="mt-8">
        <div className="flex gap-2 mb-6">
          <div className="h-10 w-40 bg-[#333] rounded" />
          <div className="h-10 w-40 bg-[#333] rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-64 bg-[#1c1c1f] border border-[#333] rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
