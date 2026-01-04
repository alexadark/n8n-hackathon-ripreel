"use server";

import { db } from '@/lib/drizzle/db.server';
import { projectCharacters, projectLocations, bibleImageVariants } from '@/lib/drizzle/schema';
import { eq, inArray } from 'drizzle-orm';
import { generateBibleImage } from '@/lib/n8n';
import { mapModelToN8NName } from '@/lib/bible/models';
import type { ApiKeys } from '@/lib/n8n/types';

type AIModel = 'seedream-4.5-text-to-image' | 'nano-banana-pro-text-to-image';

/**
 * Non-character keywords to filter out from Bible image generation
 * These are entities that appear in screenplays but aren't real characters:
 * - Silhouettes, shadows, figures (obscured/unidentified people)
 * - Bodies, corpses (dead characters don't need portraits)
 * - Crowd, group, extras (background elements)
 * - Voice, narrator (audio-only)
 */
const NON_CHARACTER_KEYWORDS = [
  'silhouette',
  'shadow',
  'figure',
  'body',
  'corpse',
  'dead',
  'crowd',
  'group',
  'extras',
  'voice',
  'narrator',
  'unknown',
  'mystery',
  'masked',
  'hooded',
];

/**
 * Check if a character name suggests it's not a real character to generate images for
 * Returns true if the character should be SKIPPED
 */
function isNonCharacterEntity(name: string): boolean {
  const nameLower = name.toLowerCase();
  return NON_CHARACTER_KEYWORDS.some(keyword => nameLower.includes(keyword));
}

// Sequential processing: generate ONE image at a time
// This ensures each image appears immediately after completion
// and one failure doesn't block others from displaying
const MAX_CONCURRENT_WORKFLOWS = 1;

// Timeout for individual image generation (2 minutes)
const IMAGE_GENERATION_TIMEOUT_MS = 2 * 60 * 1000;

/**
 * Wrap a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    ),
  ]);
}

/**
 * Process promises in batches to avoid overwhelming n8n
 * Now with timeout per task and revalidation callback after each batch
 */
async function processBatched<T>(
  tasks: (() => Promise<T>)[],
  batchSize: number = MAX_CONCURRENT_WORKFLOWS,
  onBatchComplete?: () => void
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tasks.length / batchSize)} (${batch.length} items)`);

    // Wrap each task with timeout to prevent hanging
    const batchResults = await Promise.allSettled(
      batch.map(task =>
        withTimeout(task(), IMAGE_GENERATION_TIMEOUT_MS, 'Image generation timed out after 2 minutes')
      )
    );
    results.push(...batchResults);

    // Call revalidation callback after each batch so UI updates progressively
    if (onBatchComplete) {
      onBatchComplete();
    }

    // Small delay between batches to let n8n recover
    if (i + batchSize < tasks.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Get quality setting for a model
 * - Seedream: 'basic' (2K images)
 * - Nano Banana: 'low' (n8n maps to '1K' resolution)
 */
function getQualityForModel(model: string): string {
  const modelLower = model.toLowerCase();
  if (modelLower.includes('seedream')) {
    return 'basic';
  }
  if (modelLower.includes('nano-banana')) {
    return 'low'; // n8n workflow maps this to resolution: '1K'
  }
  return 'basic';
}

/**
 * Auto-generate all Bible assets (portraits + locations) in parallel
 * Called after parsing if auto_mode = true
 *
 * MVP Simplification:
 * - Characters: Portrait only (no 3/4, no full body)
 * - Locations: Single image per location
 * - Both models: Seedream 4.5 + Nano Banana Pro
 */
export async function autoGenerateBibleAssets(projectId: string): Promise<{
  success: boolean;
  stats?: { characters: number; locations: number; variants: number; skipped?: number };
  error?: string;
}> {
  try {
    console.log(`🚀 Auto-generating Bible assets for project: ${projectId}`);

    // 1. Get all characters and locations
    const characters = await db
      .select()
      .from(projectCharacters)
      .where(eq(projectCharacters.project_id, projectId));

    const locations = await db
      .select()
      .from(projectLocations)
      .where(eq(projectLocations.project_id, projectId));

    console.log(`📊 Found ${characters.length} characters, ${locations.length} locations`);

    // 2. Filter out non-character entities (silhouettes, corpses, etc.)
    const realCharacters = characters.filter((char) => {
      if (isNonCharacterEntity(char.name)) {
        console.log(`⏭️ Skipping non-character entity: "${char.name}"`);
        return false;
      }
      return true;
    });

    const skippedCount = characters.length - realCharacters.length;
    if (skippedCount > 0) {
      console.log(`📋 Filtered out ${skippedCount} non-character entities, ${realCharacters.length} real characters remaining`);
    }

    // 3. Models to use (always both for MVP)
    const models: AIModel[] = ['seedream-4.5-text-to-image', 'nano-banana-pro-text-to-image'];

    // 4. Create task functions (not promises yet) for batched processing
    const characterTasks = realCharacters.flatMap((char) =>
      models.map((model) => () => generateCharacterPortraitVariant(char, model))
    );

    const locationTasks = locations.flatMap((loc) =>
      models.map((model) => () => generateLocationVariant(loc, model))
    );

    const allTasks = [...characterTasks, ...locationTasks];
    console.log(`📋 Total tasks: ${allTasks.length} (${realCharacters.length} chars × 2 models + ${locations.length} locs × 2 models, batches of ${MAX_CONCURRENT_WORKFLOWS})`);

    // 5. Process in batches to avoid overwhelming n8n
    // Client-side BibleAutoRefresh component handles polling for progressive updates
    const results = await processBatched(
      allTasks,
      MAX_CONCURRENT_WORKFLOWS
      // NOTE: No revalidatePath callback - client polling handles refresh
    );

    // Count successes
    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failCount = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

    console.log(`✅ Auto-generation complete: ${successCount} succeeded, ${failCount} failed`);
    // NOTE: No revalidatePath here - runs in background context, client polling handles refresh

    return {
      success: true,
      stats: {
        characters: realCharacters.length,
        locations: locations.length,
        variants: successCount,
        skipped: skippedCount, // Non-character entities filtered out
      },
    };
  } catch (error) {
    console.error('❌ Error in autoGenerateBibleAssets:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Generate a single portrait variant for a character
 */
async function generateCharacterPortraitVariant(
  character: {
    id: string;
    project_id: string;
    name: string;
    visual_dna: string;
    portrait_prompt: string | null;
  },
  model: AIModel
): Promise<{ success: boolean; variantId?: string; error?: string }> {
  try {
    const prompt = character.portrait_prompt || character.visual_dna;
    if (!prompt) {
      return { success: false, error: 'No prompt available for portrait' };
    }

    // Create variant record
    const [variant] = await db
      .insert(bibleImageVariants)
      .values({
        asset_type: 'character',
        asset_id: character.id,
        shot_type: 'portrait',
        image_url: '',
        storage_path: '',
        model,
        prompt,
        status: 'generating',
        is_selected: false,
        generation_order: model === 'seedream-4.5-text-to-image' ? 0 : 1,
      })
      .returning();

    console.log(`📸 Created variant for ${character.name} (${model}): ${variant.id}`);

    // Update character status to generating
    await db
      .update(projectCharacters)
      .set({
        portrait_status: 'generating',
        updated_at: new Date(),
      })
      .where(eq(projectCharacters.id, character.id));

    // Invoke n8n workflow
    const mappedModel = mapModelToN8NName(model);
    const result = await generateBibleImage({
      asset_type: 'character',
      asset_id: character.id,
      prompt: `${character.visual_dna}, ${prompt}. Close-up portrait, detailed facial features, professional cinematography.`,
      model: mappedModel,
      aspect_ratio: '1:1',
      quality: getQualityForModel(mappedModel),
      shot_type: 'portrait',
      variant_id: variant.id,
    });

    if (!result.success) {
      await db
        .update(bibleImageVariants)
        .set({ status: 'failed', error_message: result.error, updated_at: new Date() })
        .where(eq(bibleImageVariants.id, variant.id));
      return { success: false, error: result.error };
    }

    // Check if n8n returned imageUrl directly (Respond to Webhook)
    console.log(`📥 n8n response for ${character.name}:`, JSON.stringify(result.data, null, 2));
    // Handle array response (n8n returns array) or object response
    const responseData = result.data;
    const firstResult = Array.isArray(responseData) ? responseData[0] : responseData;
    const imageUrl = firstResult?.imageUrl || firstResult?.image_url;

    if (imageUrl) {
      // Image URL returned directly - update variant immediately
      console.log(`✅ Character image URL received for ${character.name}: ${imageUrl.substring(0, 50)}...`);
      await db
        .update(bibleImageVariants)
        .set({
          image_url: imageUrl,
          status: 'ready',
          updated_at: new Date(),
        })
        .where(eq(bibleImageVariants.id, variant.id));
      return { success: true, variantId: variant.id };
    }

    // Fallback: Store task ID for async polling (legacy)
    const taskId = firstResult?.taskId;
    if (taskId) {
      await db
        .update(bibleImageVariants)
        .set({ n8n_job_id: taskId, updated_at: new Date() })
        .where(eq(bibleImageVariants.id, variant.id));
    }

    return { success: true, variantId: variant.id };
  } catch (error) {
    console.error(`❌ Error generating portrait for ${character.name}:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Generate a single image variant for a location
 */
async function generateLocationVariant(
  location: {
    id: string;
    project_id: string;
    name: string;
    visual_description: string | null;
  },
  model: AIModel
): Promise<{ success: boolean; variantId?: string; error?: string }> {
  try {
    const prompt = location.visual_description;
    if (!prompt) {
      return { success: false, error: 'No visual description available for location' };
    }

    // Create variant record
    const [variant] = await db
      .insert(bibleImageVariants)
      .values({
        asset_type: 'location',
        asset_id: location.id,
        shot_type: null, // Locations don't have shot types
        image_url: '',
        storage_path: '',
        model,
        prompt,
        status: 'generating',
        is_selected: false,
        generation_order: model === 'seedream-4.5-text-to-image' ? 0 : 1,
      })
      .returning();

    console.log(`🏠 Created variant for ${location.name} (${model}): ${variant.id}`);

    // Update location status to generating
    await db
      .update(projectLocations)
      .set({
        image_status: 'generating',
        updated_at: new Date(),
      })
      .where(eq(projectLocations.id, location.id));

    // Invoke n8n workflow
    const mappedModel = mapModelToN8NName(model);
    const result = await generateBibleImage({
      asset_type: 'location',
      asset_id: location.id,
      prompt: `${prompt}. Wide establishing shot, cinematic composition, professional cinematography.`,
      model: mappedModel,
      aspect_ratio: '16:9',
      quality: getQualityForModel(mappedModel),
      variant_id: variant.id,
    });

    if (!result.success) {
      await db
        .update(bibleImageVariants)
        .set({ status: 'failed', error_message: result.error, updated_at: new Date() })
        .where(eq(bibleImageVariants.id, variant.id));
      return { success: false, error: result.error };
    }

    // Check if n8n returned imageUrl directly (Respond to Webhook)
    console.log(`📥 n8n response for ${location.name}:`, JSON.stringify(result.data, null, 2));
    // Handle array response (n8n returns array) or object response
    const responseData = result.data;
    const firstResult = Array.isArray(responseData) ? responseData[0] : responseData;
    const imageUrl = firstResult?.imageUrl || firstResult?.image_url;

    if (imageUrl) {
      // Image URL returned directly - update variant immediately
      console.log(`✅ Location image URL received for ${location.name}: ${imageUrl.substring(0, 50)}...`);
      await db
        .update(bibleImageVariants)
        .set({
          image_url: imageUrl,
          status: 'ready',
          updated_at: new Date(),
        })
        .where(eq(bibleImageVariants.id, variant.id));
      return { success: true, variantId: variant.id };
    }

    // Fallback: Store task ID for async polling (legacy)
    const taskId = firstResult?.taskId;
    if (taskId) {
      await db
        .update(bibleImageVariants)
        .set({ n8n_job_id: taskId, updated_at: new Date() })
        .where(eq(bibleImageVariants.id, variant.id));
    }

    return { success: true, variantId: variant.id };
  } catch (error) {
    console.error(`❌ Error generating image for ${location.name}:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Reset and regenerate stuck Bible variants (status = 'generating')
 * Call this to fix a project where image generation got stuck
 */
export async function resetStuckBibleVariants(projectId: string): Promise<{
  success: boolean;
  stats?: { reset: number; regenerating: number };
  error?: string;
}> {
  try {
    console.log(`🔧 Resetting stuck Bible variants for project: ${projectId}`);

    // 1. Find all stuck variants (generating) for this project
    const stuckVariants = await db
      .select({
        variant: bibleImageVariants,
        character: projectCharacters,
        location: projectLocations,
      })
      .from(bibleImageVariants)
      .leftJoin(projectCharacters, eq(bibleImageVariants.asset_id, projectCharacters.id))
      .leftJoin(projectLocations, eq(bibleImageVariants.asset_id, projectLocations.id))
      .where(eq(bibleImageVariants.status, 'generating'));

    // Filter to only variants belonging to this project
    const projectVariants = stuckVariants.filter(
      (v) => v.character?.project_id === projectId || v.location?.project_id === projectId
    );

    console.log(`📊 Found ${projectVariants.length} stuck variants to reset`);

    if (projectVariants.length === 0) {
      return { success: true, stats: { reset: 0, regenerating: 0 } };
    }

    // 2. Delete all stuck variants
    const variantIds = projectVariants.map((v) => v.variant.id);
    await db.delete(bibleImageVariants).where(inArray(bibleImageVariants.id, variantIds));
    console.log(`🗑️ Deleted ${variantIds.length} stuck variants`);

    // 3. Regenerate all Bible assets
    const result = await autoGenerateBibleAssets(projectId);

    return {
      success: true,
      stats: {
        reset: variantIds.length,
        regenerating: result.stats?.variants || 0,
      },
    };
  } catch (error) {
    console.error('❌ Error resetting stuck variants:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Auto-generate all scene images in parallel
 * Triggered by "Auto" button on scenes page
 *
 * Uses the existing generateSceneVariants from scene-images.ts
 * which handles all the variant creation and n8n workflow invocation
 */
export async function autoGenerateAllSceneImages(
  projectId: string,
  apiKeys?: ApiKeys
): Promise<{
  success: boolean;
  stats?: { scenes: number; variants: number };
  error?: string;
}> {
  try {
    console.log(`🎬 Auto-generating all scene images for project: ${projectId}`);

    // Import scenes schema and the existing scene image generation function
    const { scenes } = await import('@/lib/drizzle/schema');
    const { generateSceneVariants } = await import('./scene-images.server');

    const projectScenes = await db
      .select()
      .from(scenes)
      .where(eq(scenes.project_id, projectId));

    console.log(`📊 Found ${projectScenes.length} scenes to process`);

    // Create task functions for batched processing
    // 'both' means both Seedream and Nano Banana models (2 variants per scene)
    const sceneTasks = projectScenes.map((scene) =>
      () => generateSceneVariants(scene.id, 'both', apiKeys)
    );

    console.log(`📋 Total scene tasks: ${sceneTasks.length} (will process in batches of ${MAX_CONCURRENT_WORKFLOWS})`);

    // Process in batches to avoid overwhelming n8n
    // Client-side polling handles refresh for progressive updates
    const results = await processBatched(
      sceneTasks,
      MAX_CONCURRENT_WORKFLOWS
      // NOTE: No revalidatePath callback - client polling handles refresh
    );
    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;

    console.log(`✅ Scene image generation complete: ${successCount}/${results.length} scenes`);
    // NOTE: No revalidatePath here - runs in background context, client polling handles refresh

    return {
      success: true,
      stats: {
        scenes: projectScenes.length,
        variants: successCount * 2, // 2 variants per scene (both models)
      },
    };
  } catch (error) {
    console.error('❌ Error in autoGenerateAllSceneImages:', error);
    return { success: false, error: String(error) };
  }
}
