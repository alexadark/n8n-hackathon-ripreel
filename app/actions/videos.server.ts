"use server";

/**
 * Video Generation Server Actions
 *
 * Server actions for triggering and managing video generation.
 * Videos are generated from approved scene images using Google VEO 3.1.
 */

import { db } from '@/lib/drizzle/db.server';
import {
  scene_videos,
  scenes,
  sceneImageVariants,
} from '@/lib/drizzle/schema';
import { eq } from 'drizzle-orm';
import { generateVideoSimple, type SimpleVideoResult } from '@/lib/n8n/mcp-client';
import type { ApiKeys } from '@/lib/n8n';
import {
  canStartVideoGeneration,
  composeVideoPrompt,
  MAX_CONCURRENT_VIDEO_JOBS,
} from '@/lib/videos';

// ============================================================================
// Types
// ============================================================================

export type VideoActionResult =
  | { success: true; videoId?: string; queued?: boolean; data?: unknown }
  | { success: false; error: string };

// ============================================================================
// Video Generation Actions
// ============================================================================

/**
 * Trigger video generation for a scene
 *
 * Called automatically when an image is approved (if under batch limit).
 * Creates a scene_video record and invokes the n8n workflow.
 *
 * @param sceneId - The scene to generate video for
 * @param variantId - The approved variant to use as source image
 * @param apiKeys - User-provided API keys from localStorage
 * @returns Result with videoId if started, or queued=true if waiting
 */
export async function triggerVideoGeneration(
  sceneId: string,
  variantId: string,
  apiKeys?: ApiKeys
): Promise<VideoActionResult> {
  try {
    console.log('🎬 Triggering video generation for scene:', sceneId);

    // Get the scene
    const [scene] = await db
      .select()
      .from(scenes)
      .where(eq(scenes.id, sceneId))
      .limit(1);

    if (!scene) {
      return { success: false, error: 'Scene not found' };
    }

    // Get the approved variant
    const [variant] = await db
      .select()
      .from(sceneImageVariants)
      .where(eq(sceneImageVariants.id, variantId))
      .limit(1);

    if (!variant) {
      return { success: false, error: 'Variant not found' };
    }

    if (!variant.image_url) {
      return { success: false, error: 'Variant has no image URL' };
    }

    // Check if video already exists for this scene
    const [existingVideo] = await db
      .select()
      .from(scene_videos)
      .where(eq(scene_videos.scene_id, sceneId))
      .limit(1);

    if (existingVideo) {
      console.log('⚠️ Video already exists for scene:', sceneId);
      // If already generating, just return success
      if (existingVideo.status === 'generating') {
        return { success: true, videoId: existingVideo.id, queued: false };
      }
      // If ready/approved, don't regenerate automatically
      if (existingVideo.status === 'ready' || existingVideo.status === 'approved') {
        return { success: true, videoId: existingVideo.id };
      }
      // If failed, we could regenerate - but for now just return the existing
      return { success: true, videoId: existingVideo.id };
    }

    // Check batch limit
    const canStart = await canStartVideoGeneration();
    if (!canStart) {
      console.log('⏳ Batch limit reached, scene queued for later');
      // Don't create a record yet - it will be picked up by queue processor
      return { success: true, queued: true };
    }

    // Create video record
    const [video] = await db
      .insert(scene_videos)
      .values({
        scene_id: sceneId,
        source_variant_id: variantId,
        status: 'generating',
      })
      .returning();

    console.log('📹 Created video record:', video.id);

    // Compose video prompt for simple workflow
    const prompt = composeVideoPrompt(scene);
    console.log('📝 Video prompt:', prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''));

    // Invoke n8n simple video workflow (synchronous - returns when video is ready)
    const result = await generateVideoSimple({
      shotId: video.id,
      imageUrl: variant.image_url,
      prompt,
      duration: 8,
      model: 'veo3_fast',
      aspectRatio: '16:9',
    }, apiKeys);

    if (!result.success) {
      console.error('❌ Failed to generate video:', result.error);
      // Update video status to failed
      await db
        .update(scene_videos)
        .set({
          status: 'failed',
          error_message: result.error || 'Failed to generate video',
        })
        .where(eq(scene_videos.id, video.id));

      return { success: false, error: result.error || 'Failed to generate video' };
    }

    // Extract video URL from simple workflow response
    const simpleResponse = result.data as SimpleVideoResult;
    const videoUrl = simpleResponse?.videoUrl;
    const taskId = simpleResponse?.taskId;

    if (videoUrl) {
      // Update video record with the URL (video is ready!)
      await db
        .update(scene_videos)
        .set({
          status: 'ready',
          video_url: videoUrl,
          n8n_job_id: taskId || null,
        })
        .where(eq(scene_videos.id, video.id));

      console.log('✅ Video generation complete:', video.id, videoUrl);
    } else {
      console.log('✅ Video generation started (no URL in response yet):', video.id);
    }

    return { success: true, videoId: video.id };
  } catch (error) {
    console.error('❌ Error triggering video generation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to trigger video generation',
    };
  }
}

/**
 * Regenerate video for a scene (user-triggered)
 *
 * Resets the video status and re-invokes the n8n workflow.
 * Used when video quality is unsatisfactory.
 *
 * @param sceneVideoId - The video to regenerate
 * @param apiKeys - User-provided API keys from localStorage
 */
export async function regenerateVideo(
  sceneVideoId: string,
  apiKeys?: ApiKeys
): Promise<VideoActionResult> {
  try {
    console.log('🔄 Regenerating video:', sceneVideoId);

    // Get the video record
    const [video] = await db
      .select()
      .from(scene_videos)
      .where(eq(scene_videos.id, sceneVideoId))
      .limit(1);

    if (!video) {
      return { success: false, error: 'Video not found' };
    }

    // Get the scene
    const [scene] = await db
      .select()
      .from(scenes)
      .where(eq(scenes.id, video.scene_id))
      .limit(1);

    if (!scene) {
      return { success: false, error: 'Scene not found' };
    }

    // Get the source variant
    const [variant] = await db
      .select()
      .from(sceneImageVariants)
      .where(eq(sceneImageVariants.id, video.source_variant_id))
      .limit(1);

    if (!variant?.image_url) {
      return { success: false, error: 'Source image not found' };
    }

    // Check batch limit
    const canStart = await canStartVideoGeneration();
    if (!canStart) {
      return { success: false, error: `Batch limit reached (${MAX_CONCURRENT_VIDEO_JOBS} concurrent jobs). Please wait.` };
    }

    // Reset video status
    await db
      .update(scene_videos)
      .set({
        status: 'generating',
        video_url: null,
        video_storage_path: null,
        duration_seconds: null,
        error_message: null,
        n8n_job_id: null,
      })
      .where(eq(scene_videos.id, sceneVideoId));

    // Compose prompt for simple workflow
    const prompt = composeVideoPrompt(scene);
    console.log('🔄 Regenerating video with simple workflow');

    // Invoke n8n simple video workflow
    const result = await generateVideoSimple({
      shotId: sceneVideoId,
      imageUrl: variant.image_url,
      prompt,
      duration: 8,
      model: 'veo3_fast',
      aspectRatio: '16:9',
    }, apiKeys);

    if (!result.success) {
      await db
        .update(scene_videos)
        .set({
          status: 'failed',
          error_message: result.error || 'Failed to regenerate video',
        })
        .where(eq(scene_videos.id, sceneVideoId));

      return { success: false, error: result.error || 'Failed to regenerate video' };
    }

    // Extract video URL from simple workflow response
    const simpleResponse = result.data as SimpleVideoResult;
    const videoUrl = simpleResponse?.videoUrl;
    const taskId = simpleResponse?.taskId;

    if (videoUrl) {
      // Update video record with the URL (video is ready!)
      await db
        .update(scene_videos)
        .set({
          status: 'ready',
          video_url: videoUrl,
          n8n_job_id: taskId || null,
        })
        .where(eq(scene_videos.id, sceneVideoId));

      console.log('✅ Video regeneration complete:', sceneVideoId, videoUrl);
    } else {
      console.log('✅ Video regeneration started (no URL in response yet):', sceneVideoId);
    }

    return { success: true, videoId: sceneVideoId };
  } catch (error) {
    console.error('❌ Error regenerating video:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to regenerate video',
    };
  }
}

/**
 * Cancel a stuck video generation
 *
 * Marks the video as failed and frees up the generation slot.
 * Used when a video is stuck in "generating" state.
 */
export async function cancelVideoGeneration(
  sceneVideoId: string
): Promise<VideoActionResult> {
  try {
    console.log('🛑 Cancelling video generation:', sceneVideoId);

    // Get the video record
    const [video] = await db
      .select()
      .from(scene_videos)
      .where(eq(scene_videos.id, sceneVideoId))
      .limit(1);

    if (!video) {
      return { success: false, error: 'Video not found' };
    }

    // Get the scene for revalidation
    const [scene] = await db
      .select()
      .from(scenes)
      .where(eq(scenes.id, video.scene_id))
      .limit(1);

    // Delete the video record so user can try again
    await db
      .delete(scene_videos)
      .where(eq(scene_videos.id, sceneVideoId));

    console.log('✅ Video generation cancelled:', sceneVideoId);

    return { success: true };
  } catch (error) {
    console.error('❌ Error cancelling video generation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel video generation',
    };
  }
}

/**
 * Process video generation queue
 *
 * Checks for scenes waiting for video generation and starts them
 * if slots are available. Called by webhook when a video completes.
 */
export async function processVideoQueue(
  projectId: string
): Promise<{ triggered: number }> {
  try {
    console.log('🔄 Processing video queue for project:', projectId);

    let triggered = 0;

    // Get scenes with approved images but no video
    const projectScenes = await db
      .select()
      .from(scenes)
      .where(eq(scenes.project_id, projectId))
      .orderBy(scenes.scene_number);

    for (const scene of projectScenes) {
      // Check if we can start more jobs
      const canStart = await canStartVideoGeneration();
      if (!canStart) {
        console.log('⏳ Batch limit reached, stopping queue processing');
        break;
      }

      // Skip scenes without approved images
      if (!scene.approved_image_id) continue;

      // Check if video already exists
      const [existingVideo] = await db
        .select()
        .from(scene_videos)
        .where(eq(scene_videos.scene_id, scene.id))
        .limit(1);

      if (existingVideo) continue;

      // Trigger video generation
      console.log(`📹 Queue: Starting video for scene ${scene.scene_number}`);
      const result = await triggerVideoGeneration(scene.id, scene.approved_image_id);

      if (result.success && !result.queued) {
        triggered++;
      }
    }

    console.log(`✅ Queue processing complete: ${triggered} videos triggered`);
    return { triggered };
  } catch (error) {
    console.error('❌ Error processing video queue:', error);
    return { triggered: 0 };
  }
}

/**
 * Get video generation stats for a project
 */
export async function getVideoStats(projectId: string): Promise<{
  total: number;
  generating: number;
  ready: number;
  failed: number;
  pending: number;
}> {
  const projectScenes = await db
    .select()
    .from(scenes)
    .where(eq(scenes.project_id, projectId));

  let generating = 0;
  let ready = 0;
  let failed = 0;
  let pending = 0;

  for (const scene of projectScenes) {
    if (!scene.approved_image_id) {
      // No approved image = not ready for video
      continue;
    }

    const [video] = await db
      .select()
      .from(scene_videos)
      .where(eq(scene_videos.scene_id, scene.id))
      .limit(1);

    if (!video) {
      pending++;
    } else if (video.status === 'generating') {
      generating++;
    } else if (video.status === 'ready' || video.status === 'approved') {
      ready++;
    } else if (video.status === 'failed') {
      failed++;
    }
  }

  return {
    total: projectScenes.length,
    generating,
    ready,
    failed,
    pending,
  };
}
