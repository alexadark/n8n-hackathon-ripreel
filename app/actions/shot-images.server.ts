"use server";

import { db } from '@/lib/drizzle/db.server';
import {
  scene_shots,
  shotImageVariants,
  scenes,
  projects,
  type SceneShot,
  type ShotImageVariant,
} from '@/lib/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { generateImage } from '@/lib/n8n/mcp-client';
import type { ApiKeys } from '@/lib/n8n/types';
import { mapModelToN8NName } from '@/lib/bible/models';
import type { AIModel } from '@/lib/bible/models';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  resolveBibleElements,
  type BibleInjectionData,
} from './scene-images.server';

// ============================================================================
// Constants
// ============================================================================

const SHOT_IMAGES_BUCKET = 'scene-images';

// ============================================================================
// Zod Validation Schemas
// ============================================================================

const uuidSchema = z.string().uuid('Invalid UUID format');

const shotModelSelectionSchema = z.enum(['seedream', 'nano-banana', 'both']);

const generateShotVariantsSchema = z.object({
  shotId: uuidSchema,
  modelSelection: shotModelSelectionSchema.optional().default('both'),
});

const selectShotVariantSchema = z.object({
  variantId: uuidSchema,
});

const shotIdSchema = z.object({
  shotId: uuidSchema,
});

const sceneIdSchema = z.object({
  sceneId: uuidSchema,
});

const variantIdSchema = z.object({
  variantId: uuidSchema,
});

// ============================================================================
// Types
// ============================================================================

export type ShotImageActionResult =
  | { success: true; data?: unknown }
  | { success: false; error: string };

/**
 * Model selection options for shot image generation
 */
export type ShotModelSelection = 'seedream' | 'nano-banana' | 'both';

/**
 * Shot variants data for UI
 */
export interface ShotVariantsData {
  shotId: string;
  variants: ShotImageVariant[];
  selectedVariant: ShotImageVariant | null;
  hasApprovedImage: boolean;
}

// ============================================================================
// Supabase Storage Helpers
// ============================================================================

/**
 * Initialize Supabase client with service role for bucket management
 */
function getAdminClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * FAST version: Download from temporary CDN URL and upload to Supabase.
 * No delays, no retries - for use in server actions where speed matters.
 * If this fails, the webhook will handle it as a backup.
 */
async function downloadAndUploadToSupabaseFast(
  tempImageUrl: string,
  shotId: string,
  variantId: string
): Promise<{ url: string; path: string } | null> {
  try {
    console.log(`⬇️ [FAST] Downloading from temp URL: ${tempImageUrl.substring(0, 50)}...`);

    const response = await fetch(tempImageUrl, {
      signal: AbortSignal.timeout(60000) // 60 second timeout - temp URLs can be slow
    });

    if (!response.ok) {
      console.error(`❌ [FAST] Failed to download: ${response.status} - will rely on webhook`);
      return null;
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`📦 [FAST] Downloaded ${imageBuffer.length} bytes`);

    // Validate image size (should be at least 1KB)
    if (imageBuffer.length < 1000) {
      console.error(`❌ [FAST] Image too small (${imageBuffer.length} bytes) - will rely on webhook`);
      return null;
    }

    // Generate storage path
    const timestamp = Date.now();
    const storagePath = `shots/${shotId}/${variantId}_${timestamp}.png`;

    console.log(`⬆️ [FAST] Uploading to Supabase: ${storagePath}`);

    const supabase = getAdminClient();
    const { data, error } = await supabase.storage
      .from(SHOT_IMAGES_BUCKET)
      .upload(storagePath, imageBuffer, {
        upsert: true,
        contentType: 'image/png',
      });

    if (error) {
      console.error(`❌ [FAST] Upload failed:`, error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(SHOT_IMAGES_BUCKET)
      .getPublicUrl(data.path);

    console.log(`✅ [FAST] Uploaded successfully: ${publicUrl.substring(0, 50)}...`);

    return { url: publicUrl, path: data.path };
  } catch (error) {
    console.error(`❌ [FAST] Error in downloadAndUploadToSupabaseFast:`, error);
    return null;
  }
}

// ============================================================================
// Prompt Composition
// ============================================================================

/**
 * Collect all Bible reference image URLs for injection
 * Returns an array of image URLs to use as reference for image-to-image generation
 */
function collectBibleReferenceImages(bibleData: BibleInjectionData): string[] {
  const images: string[] = [];

  // Debug: Log what we're working with
  console.log('🔍 [collectBibleReferenceImages] Input:', {
    hasLocation: !!bibleData.location,
    locationName: bibleData.location?.name,
    locationHasImage: !!bibleData.location?.image_url,
    locationImageUrl: bibleData.location?.image_url?.substring(0, 80),
    characterCount: bibleData.characters.length,
    charactersWithPortrait: bibleData.characters.filter(c => c.portrait_url).length,
    propCount: bibleData.props.length,
    propsWithImage: bibleData.props.filter(p => p.image_url).length,
  });

  // Add location image first (establishes the setting)
  if (bibleData.location?.image_url) {
    images.push(bibleData.location.image_url);
    console.log('✅ Added location image:', bibleData.location.name);
  } else if (bibleData.location) {
    console.log('⚠️ Location exists but has no image:', bibleData.location.name);
  }

  // Add character portrait images
  for (const character of bibleData.characters) {
    if (character.portrait_url) {
      images.push(character.portrait_url);
      console.log('✅ Added character portrait:', character.name);
    } else {
      console.log('⚠️ Character has no portrait:', character.name);
    }
  }

  // Add prop images
  for (const prop of bibleData.props) {
    if (prop.image_url) {
      images.push(prop.image_url);
      console.log('✅ Added prop image:', prop.name);
    }
  }

  console.log('📸 Total reference images collected:', images.length);

  return images;
}

/**
 * Compose shot image prompt for image-to-image generation
 *
 * Uses shot-specific composition instructions with Bible reference images
 * for visual consistency across the project.
 *
 * @param shot - Shot data with composition instructions
 * @param projectVisualStyle - Visual style (e.g., "classic-noir")
 * @param modelType - Model type to use model-specific composition prompts
 */
function composeShotImagePrompt(
  shot: SceneShot,
  projectVisualStyle: string,
  modelType: 'seedream' | 'nano-banana'
): string {
  const parts: string[] = [];

  // 1. Project visual style (brief)
  if (projectVisualStyle) {
    parts.push(projectVisualStyle);
  }

  // 2. Composition instruction - use model-specific prompt if available
  let compositionInstruction: string | undefined;

  if (modelType === 'seedream' && shot.composition_instruction_seedream) {
    compositionInstruction = shot.composition_instruction_seedream;
  } else if (modelType === 'nano-banana' && shot.composition_instruction_nano_banana) {
    compositionInstruction = shot.composition_instruction_nano_banana;
  } else {
    // Fallback to generic composition instruction
    compositionInstruction = shot.composition_instruction || undefined;
  }

  if (compositionInstruction) {
    parts.push(compositionInstruction);
  }

  // 3. Shot type (e.g., "Wide Establishing Shot", "Close-up")
  if (shot.shot_type) {
    parts.push(shot.shot_type);
  }

  // 4. Anti-collage instruction - prevent multi-panel/storyboard outputs
  parts.push('Single cohesive cinematic frame, no collage, no multiple panels, no split screen, no storyboard');

  return parts.join('. ');
}

/**
 * Get quality setting based on model type
 */
function getQualityForModel(model: string): string {
  const modelLower = model.toLowerCase();
  if (modelLower.includes('seedream')) {
    return 'basic';
  }
  if (modelLower.includes('nano-banana')) {
    return 'low';
  }
  return 'medium';
}

/**
 * Get models based on selection
 */
function getModelsForSelection(selection: ShotModelSelection): AIModel[] {
  switch (selection) {
    case 'seedream':
      return ['seedream-4.5-image-to-image'];
    case 'nano-banana':
      return ['nano-banana-pro-image-to-image'];
    case 'both':
    default:
      return ['seedream-4.5-image-to-image', 'nano-banana-pro-image-to-image'];
  }
}

/**
 * Helper to determine model type for model-specific prompts
 */
function getModelType(model: AIModel): 'seedream' | 'nano-banana' | undefined {
  if (model.includes('seedream')) return 'seedream';
  if (model.includes('nano-banana')) return 'nano-banana';
  return undefined;
}

// ============================================================================
// Variant Generation
// ============================================================================

/**
 * Generate shot image variants with Bible reference injection
 *
 * Creates multiple AI-generated start frame images for a single shot.
 * Uses the shot's composition_instruction_* prompts and injects Bible
 * reference images (characters, locations, props) for visual consistency.
 *
 * @param shotId - Shot to generate images for
 * @param modelSelection - Which model(s) to use: 'seedream', 'nano-banana', or 'both'
 * @param apiKeys - Optional user-provided API keys from localStorage
 */
export async function generateShotImageVariants(
  shotId: string,
  modelSelection: ShotModelSelection = 'both',
  apiKeys?: ApiKeys
): Promise<ShotImageActionResult> {
  try {
    // Validate input
    const validation = generateShotVariantsSchema.safeParse({ shotId, modelSelection });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    console.log('🎬 Generating shot image variants for:', shotId, 'with model:', modelSelection);

    // Get shot
    const [shot] = await db
      .select()
      .from(scene_shots)
      .where(eq(scene_shots.id, shotId))
      .limit(1);

    if (!shot) {
      return { success: false, error: 'Shot not found' };
    }

    // Get parent scene for Bible data
    const [scene] = await db
      .select()
      .from(scenes)
      .where(eq(scenes.id, shot.scene_id))
      .limit(1);

    if (!scene) {
      return { success: false, error: 'Parent scene not found' };
    }

    // Get project for visual style
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, scene.project_id))
      .limit(1);

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    // Resolve Bible elements from parent scene
    const bibleData = await resolveBibleElements(scene.project_id, scene);

    console.log('📚 Bible elements resolved:', {
      characters: bibleData.characters.length,
      location: bibleData.location?.name || 'none',
      props: bibleData.props.length,
    });

    // Collect Bible reference images for injection
    const referenceImages = collectBibleReferenceImages(bibleData);

    console.log('🖼️ Reference images collected:', {
      count: referenceImages.length,
      urls: referenceImages.slice(0, 3), // Log first 3 URLs
    });

    // Get models based on selection
    const models = getModelsForSelection(modelSelection);

    console.log('🎯 Models selected:', models);

    // Extract Bible element IDs for tracking
    const injectedCharacterIds = bibleData.characters.map((c) => c.id);
    const injectedLocationIds = bibleData.location
      ? [bibleData.location.id]
      : [];
    const injectedPropIds = bibleData.props.map((p) => p.id);

    // Create variant records with MODEL-SPECIFIC prompts
    console.log(`📸 Creating ${models.length} variant records with model-specific prompts...`);
    const createdVariants = await Promise.all(
      models.map(async (model, i) => {
        // Generate model-specific prompt
        const modelType = getModelType(model);
        const prompt = modelType
          ? composeShotImagePrompt(shot, project.visual_style || '', modelType)
          : shot.composition_instruction || '';

        console.log(`📝 [${model}] Prompt preview:`, prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''));

        const [variant] = await db
          .insert(shotImageVariants)
          .values({
            shot_id: shotId,
            model,
            prompt,
            status: 'generating',
            is_selected: false,
            generation_order: i,
            injected_characters: injectedCharacterIds,
            injected_locations: injectedLocationIds,
            injected_props: injectedPropIds,
          })
          .returning();

        console.log(
          `📸 Created variant ${i + 1}/${models.length}: ${variant.id} (${model})`
        );
        return { variant, prompt };
      })
    );

    // Trigger parallel generation
    console.log(`🚀 Starting PARALLEL generation for ${models.length} variants...`);

    const generationPromises = createdVariants.map(async ({ variant, prompt }, i) => {
      const model = models[i];
      const mappedModel = mapModelToN8NName(model);

      console.log(`🚀 [${model}] Invoking n8n workflow...`);

      // Build generation payload with model-specific prompt
      const generationPayload: Parameters<typeof generateImage>[0] = {
        prompt,
        model: mappedModel,
        aspect_ratio: '16:9', // Shot images are widescreen
        quality: getQualityForModel(mappedModel),
        variant_id: variant.id,
        next_js_callback_url: `${process.env.APP_URL || 'http://localhost:5173'}/api/webhooks/n8n/shot-image-variant`,
      };

      // Add reference images for I2I
      if (referenceImages.length > 0) {
        generationPayload.reference_images = referenceImages;
        console.log(`🖼️ [${model}] Injecting ${referenceImages.length} reference images`);
      }

      const result = await generateImage(generationPayload, apiKeys);

      console.log(`📦 [${model}] n8n response:`, JSON.stringify(result, null, 2));

      if (result.success && result.data) {
        const responseData = Array.isArray(result.data)
          ? result.data[0]
          : result.data;

        console.log(`📋 [${model}] Response data:`, responseData);
        console.log(`📋 [${model}] taskId:`, responseData.taskId || 'MISSING');
        console.log(`📋 [${model}] imageUrl:`, responseData.imageUrl ? `${responseData.imageUrl.substring(0, 50)}...` : 'MISSING');

        // Store taskId
        if (responseData.taskId) {
          await db
            .update(shotImageVariants)
            .set({ n8n_job_id: responseData.taskId })
            .where(eq(shotImageVariants.id, variant.id));
          console.log(`✅ [${model}] Stored taskId: ${responseData.taskId}`);
        }

        // If we got imageUrl directly (synchronous response), upload to Supabase immediately
        if (responseData.imageUrl) {
          console.log(`📸 [${model}] Got temp URL, uploading to Supabase (FAST mode)...`);

          const uploaded = await downloadAndUploadToSupabaseFast(
            responseData.imageUrl,
            shotId,
            variant.id
          );

          if (uploaded) {
            // Save permanent Supabase URL and mark as ready
            await db
              .update(shotImageVariants)
              .set({
                image_url: uploaded.url,
                storage_path: uploaded.path,
                status: 'ready',
                n8n_job_id: responseData.taskId,
                updated_at: new Date(),
              })
              .where(eq(shotImageVariants.id, variant.id));
            console.log(`✅ [${model}] Variant saved with permanent Supabase URL`);
          } else {
            // Upload failed - mark as failed (webhook won't help since n8n doesn't call it)
            console.log(`⚠️ [${model}] Fast upload failed, marking as failed`);
            await db
              .update(shotImageVariants)
              .set({
                status: 'failed',
                error_message: 'Failed to upload image to storage',
                updated_at: new Date(),
              })
              .where(eq(shotImageVariants.id, variant.id));
          }
        } else {
          console.log(`⚠️ [${model}] No imageUrl in response - image may have failed`);
        }
      } else {
        console.log(`❌ [${model}] Generation failed:`, result.error);
        // Mark as failed
        await db
          .update(shotImageVariants)
          .set({
            status: 'failed',
            error_message: result.error || 'Generation failed',
            updated_at: new Date(),
          })
          .where(eq(shotImageVariants.id, variant.id));
      }

      return variant.id;
    });

    const variantIds = await Promise.all(generationPromises);
    console.log(`✅ All ${models.length} generation requests sent!`, variantIds);

    return { success: true, data: { variantIds } };
  } catch (error) {
    console.error('❌ Error generating shot image variants:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to generate variants',
    };
  }
}

// ============================================================================
// Variant Selection
// ============================================================================

/**
 * Select a variant as the approved shot start frame image
 *
 * Marks the variant as selected, updates the shot with the approved image,
 * and sets the start frame status to 'ready'.
 */
export async function selectShotImageVariant(
  variantId: string
): Promise<ShotImageActionResult> {
  try {
    // Validate input
    const validation = selectShotVariantSchema.safeParse({ variantId });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    console.log('✅ Selecting shot image variant:', variantId);

    // Get variant
    const [variant] = await db
      .select()
      .from(shotImageVariants)
      .where(eq(shotImageVariants.id, variantId))
      .limit(1);

    if (!variant) {
      return { success: false, error: 'Variant not found' };
    }

    if (variant.status !== 'ready') {
      return {
        success: false,
        error: `Variant is ${variant.status}, not ready to select`,
      };
    }

    // Unselect other variants for same shot
    await db
      .update(shotImageVariants)
      .set({ is_selected: false, updated_at: new Date() })
      .where(eq(shotImageVariants.shot_id, variant.shot_id));

    // Mark this variant as selected
    await db
      .update(shotImageVariants)
      .set({ is_selected: true, status: 'selected', updated_at: new Date() })
      .where(eq(shotImageVariants.id, variantId));

    // Update shot with approved image
    await db
      .update(scene_shots)
      .set({
        start_frame_image_url: variant.image_url,
        start_frame_storage_path: variant.storage_path,
        start_frame_status: 'ready',
        updated_at: new Date(),
      })
      .where(eq(scene_shots.id, variant.shot_id));

    console.log('✅ Variant selected and shot updated');

    return { success: true };
  } catch (error) {
    console.error('❌ Error selecting variant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to select variant',
    };
  }
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Generate images for all shots in a scene
 *
 * Creates start frame image variants for each shot in a scene,
 * using the shot-specific composition instructions.
 *
 * @param sceneId - Scene ID to generate shot images for
 * @param modelSelection - Which model(s) to use: 'seedream', 'nano-banana', or 'both'
 * @param apiKeys - Optional user-provided API keys from localStorage
 */
export async function generateAllShotImagesForScene(
  sceneId: string,
  modelSelection: ShotModelSelection = 'both',
  apiKeys?: ApiKeys
): Promise<ShotImageActionResult> {
  try {
    // Validate input
    const validation = sceneIdSchema.safeParse({ sceneId });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    console.log('🎬 Generating images for all shots in scene:', sceneId);

    // Get all shots for scene ordered by shot_number
    const shots = await db
      .select()
      .from(scene_shots)
      .where(eq(scene_shots.scene_id, sceneId))
      .orderBy(scene_shots.shot_number);

    if (shots.length === 0) {
      return { success: false, error: 'No shots found for scene' };
    }

    console.log(`📸 Found ${shots.length} shots, generating images...`);

    // Generate variants for each shot
    const allVariantIds: string[] = [];

    for (const shot of shots) {
      const result = await generateShotImageVariants(shot.id, modelSelection, apiKeys);

      if (result.success && result.data) {
        const variantIds = (result.data as { variantIds: string[] }).variantIds;
        allVariantIds.push(...variantIds);
        console.log(`✅ Shot ${shot.shot_number}: Created ${variantIds.length} variants`);
      } else if (!result.success) {
        console.error(`❌ Shot ${shot.shot_number}: Failed -`, result.error);
        // Continue with other shots even if one fails
      }
    }

    console.log(`✅ Generated ${allVariantIds.length} total variants for ${shots.length} shots`);

    return { success: true, data: { variantIds: allVariantIds, shotCount: shots.length } };
  } catch (error) {
    console.error('❌ Error generating all shot images:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to generate shot images',
    };
  }
}

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Get variants for a shot
 */
export async function getShotImageVariants(
  shotId: string
): Promise<ShotVariantsData> {
  const variants = await db
    .select()
    .from(shotImageVariants)
    .where(eq(shotImageVariants.shot_id, shotId))
    .orderBy(shotImageVariants.generation_order);

  const selectedVariant = variants.find((v) => v.is_selected) || null;
  const hasApprovedImage = selectedVariant !== null;

  return {
    shotId,
    variants,
    selectedVariant,
    hasApprovedImage,
  };
}

// ============================================================================
// Variant Management
// ============================================================================

/**
 * Delete a specific shot image variant
 */
export async function deleteShotImageVariant(
  variantId: string
): Promise<ShotImageActionResult> {
  try {
    // Validate input
    const validation = variantIdSchema.safeParse({ variantId });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    console.log('🗑️ Deleting shot image variant:', variantId);

    // Get variant
    const [variant] = await db
      .select()
      .from(shotImageVariants)
      .where(eq(shotImageVariants.id, variantId))
      .limit(1);

    if (!variant) {
      return { success: false, error: 'Variant not found' };
    }

    // Don't allow deleting selected variants
    if (variant.is_selected) {
      return { success: false, error: 'Cannot delete selected variant' };
    }

    // Delete the variant
    await db
      .delete(shotImageVariants)
      .where(eq(shotImageVariants.id, variantId));

    console.log(`✅ Deleted variant ${variantId}`);

    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting variant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete variant',
    };
  }
}

/**
 * Delete failed variants for a shot
 */
export async function deleteFailedShotImageVariants(
  shotId: string
): Promise<ShotImageActionResult> {
  try {
    // Validate input
    const validation = shotIdSchema.safeParse({ shotId });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    console.log('🗑️ Deleting failed variants for shot:', shotId);

    // Delete failed variants
    const deleted = await db
      .delete(shotImageVariants)
      .where(
        and(
          eq(shotImageVariants.shot_id, shotId),
          eq(shotImageVariants.status, 'failed')
        )
      )
      .returning();

    console.log(`✅ Deleted ${deleted.length} failed variants`);

    return { success: true, data: { deletedCount: deleted.length } };
  } catch (error) {
    console.error('❌ Error deleting failed variants:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete variants',
    };
  }
}

/**
 * Retry a failed shot image variant
 */
export async function retryShotImageVariant(
  variantId: string,
  apiKeys?: ApiKeys
): Promise<ShotImageActionResult> {
  try {
    // Validate input
    const validation = variantIdSchema.safeParse({ variantId });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    console.log('🔄 Retrying shot image variant:', variantId);

    // Get the failed variant
    const [variant] = await db
      .select()
      .from(shotImageVariants)
      .where(eq(shotImageVariants.id, variantId))
      .limit(1);

    if (!variant) {
      return { success: false, error: 'Variant not found' };
    }

    if (variant.status !== 'failed') {
      return { success: false, error: 'Can only retry failed variants' };
    }

    // Map stored model back to selection
    const modelSelection: ShotModelSelection = variant.model.includes('seedream')
      ? 'seedream'
      : 'nano-banana';

    const shotId = variant.shot_id;

    // Delete the failed variant
    await db
      .delete(shotImageVariants)
      .where(eq(shotImageVariants.id, variantId));

    console.log(`🗑️ Deleted failed variant ${variantId}, regenerating with ${modelSelection}...`);

    // Generate new variant with the same model
    const result = await generateShotImageVariants(shotId, modelSelection, apiKeys);

    return result;
  } catch (error) {
    console.error('❌ Error retrying variant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retry variant',
    };
  }
}
