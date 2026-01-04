"use server";

/**
 * Final Reel Assembly Server Actions
 *
 * Server actions for triggering final reel assembly via FFmpeg API.
 * Gathers approved scene videos, orders them by scene_order, and
 * sends to n8n workflow for crossfade assembly.
 * After assembly, downloads the video and uploads to Supabase for permanent storage.
 */

import { db } from '@/lib/drizzle/db.server';
import {
  final_reels,
  scene_shots,
  scenes,
  projects,
} from '@/lib/drizzle/schema';
import { eq, and, inArray, isNotNull } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
// Use process.env directly in server actions (env.server.ts causes bundling issues)

// ============================================================================
// Types
// ============================================================================

export type AssemblyActionResult =
  | { success: true; reelId?: string; videoUrl?: string; youtubeUrl?: string; youtubeId?: string }
  | { success: false; error: string };

interface VideoForAssembly {
  url: string;
  duration: number;
}

interface AssemblyWebhookPayload {
  projectId: string;
  title: string;
  description: string;
  videos: VideoForAssembly[];
}

interface AssemblyWebhookResponse {
  success: boolean;
  videoUrl?: string; // Temporary MP4 download URL from FFmpeg API (expires in 2 hours)
  youtubeUrl?: string; // YouTube unlisted video URL
  youtubeId?: string; // YouTube video ID
  projectId?: string;
  error?: string;
}

// ============================================================================
// Supabase Storage Helper
// ============================================================================

/**
 * Download video from temporary URL and upload to Supabase Storage
 * @param tempUrl - Temporary URL from FFmpeg API
 * @param projectId - Project ID for file naming
 * @returns Permanent Supabase public URL
 */
async function uploadVideoToSupabase(tempUrl: string, projectId: string): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('📥 Downloading video from temporary URL...');

  // Download the video from FFmpeg API
  const response = await fetch(tempUrl);

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
  }

  const videoBuffer = await response.arrayBuffer();
  const videoSize = videoBuffer.byteLength;
  console.log(`📦 Downloaded ${(videoSize / 1024 / 1024).toFixed(2)}MB`);

  // Generate unique filename
  const timestamp = Date.now();
  const filename = `${projectId}/final-reel-${timestamp}.mp4`;

  console.log('📤 Uploading to Supabase Storage...');

  // Upload to Supabase Storage (reels bucket)
  const { data, error } = await supabase.storage
    .from('reels')
    .upload(filename, videoBuffer, {
      contentType: 'video/mp4',
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('reels')
    .getPublicUrl(filename);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL');
  }

  console.log('✅ Uploaded to Supabase:', urlData.publicUrl);

  return urlData.publicUrl;
}

// ============================================================================
// Temporary Shot Video Helpers
// ============================================================================

const TEMP_VIDEO_HOSTS = ['apps-ffmpeg-api', 'tempfile.aiquickdraw.com'];

function isTemporaryVideoUrl(url: string): boolean {
  return TEMP_VIDEO_HOSTS.some((host) => url.includes(host));
}

/**
 * Check if a URL is from Supabase storage (needs signed URL for private buckets)
 */
function isSupabaseStorageUrl(url: string): boolean {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) return false;
  // Supabase storage URLs look like: https://xxx.supabase.co/storage/v1/object/public/bucket/path
  return url.includes(supabaseUrl) && url.includes('/storage/v1/');
}

/**
 * Extract bucket and path from a Supabase storage URL
 * URL format: https://xxx.supabase.co/storage/v1/object/public/bucket/path/to/file
 */
function parseSupabaseStorageUrl(url: string): { bucket: string; path: string } | null {
  try {
    const urlObj = new URL(url);
    // Path format: /storage/v1/object/public/bucket/path/to/file
    // or: /storage/v1/object/sign/bucket/path/to/file (signed URLs)
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
    if (!pathMatch) return null;
    return {
      bucket: pathMatch[1],
      path: pathMatch[2],
    };
  } catch {
    return null;
  }
}

/**
 * Create a signed URL for a Supabase storage file
 * Used for private buckets (like 'videos') that don't allow public access
 */
async function createSignedUrl(url: string, expiresInSeconds: number = 3600): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured');
  }

  const parsed = parseSupabaseStorageUrl(url);
  if (!parsed) {
    throw new Error(`Could not parse Supabase storage URL: ${url}`);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message || 'Unknown error'}`);
  }

  console.log(`🔐 Created signed URL for ${parsed.bucket}/${parsed.path.substring(0, 30)}...`);
  return data.signedUrl;
}

async function isTemporaryVideoUrlAccessible(url: string): Promise<boolean> {
  try {
    const headResponse = await fetch(url, { method: 'HEAD' });
    if (headResponse.ok) return true;

    // Some temp hosts may not support HEAD, try a tiny ranged GET as fallback.
    if (headResponse.status === 405 || headResponse.status === 400) {
      const rangeResponse = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
      });
      return rangeResponse.ok;
    }

    return false;
  } catch {
    return false;
  }
}

async function uploadShotVideoToSupabase(
  tempUrl: string,
  projectId: string,
  shotId: string
): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase service credentials not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('📥 Downloading temporary shot video...');

  const response = await fetch(tempUrl);
  if (!response.ok) {
    throw new Error(`Failed to download temporary shot video: ${response.status} ${response.statusText}`);
  }

  const videoBuffer = await response.arrayBuffer();
  const videoSize = videoBuffer.byteLength;
  console.log(`📦 Downloaded ${(videoSize / 1024 / 1024).toFixed(2)}MB`);

  const timestamp = Date.now();
  const filename = `${projectId}/shots/${shotId}-trimmed-${timestamp}.mp4`;

  console.log('📤 Uploading shot video to Supabase Storage...');

  const { error } = await supabase.storage
    .from('videos')
    .upload(filename, videoBuffer, {
      contentType: 'video/mp4',
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('videos')
    .getPublicUrl(filename);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL for shot video');
  }

  console.log('✅ Shot video uploaded to Supabase:', urlData.publicUrl);

  return urlData.publicUrl;
}

// ============================================================================
// Assembly Actions
// ============================================================================

/**
 * Trigger final reel assembly for a project
 *
 * Gathers all ready scene videos, orders them by scene_order,
 * and sends to n8n workflow for FFmpeg assembly with crossfades.
 *
 * @param projectId - The project to assemble
 * @returns Result with reelId and videoUrl on success
 */
export async function triggerFinalAssembly(
  projectId: string
): Promise<AssemblyActionResult> {
  try {
    console.log('🎬 Triggering final assembly for project:', projectId);

    // Get the project with scene_order
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    // Get all scenes for this project
    const projectScenes = await db
      .select()
      .from(scenes)
      .where(eq(scenes.project_id, projectId));

    if (projectScenes.length === 0) {
      return { success: false, error: 'No scenes found for project' };
    }

    // Get all ready video shots from scene_shots table, ordered by shot_number
    const sceneIds = projectScenes.map((s) => s.id);
    const readyShots = await db
      .select({
        id: scene_shots.id,
        scene_id: scene_shots.scene_id,
        shot_number: scene_shots.shot_number,
        video_url: scene_shots.video_url,
        shot_duration_seconds: scene_shots.shot_duration_seconds,
      })
      .from(scene_shots)
      .where(
        and(
          inArray(scene_shots.scene_id, sceneIds),
          eq(scene_shots.video_status, 'ready'),
          isNotNull(scene_shots.video_url)
        )
      )
      .orderBy(scene_shots.scene_id, scene_shots.shot_number);

    if (readyShots.length < 2) {
      return {
        success: false,
        error: `Need at least 2 ready video shots for assembly. Found: ${readyShots.length}`,
      };
    }

    // Check for expired temporary URLs before proceeding
    // Temporary URLs (trim outputs) can expire quickly and break assembly.
    const expiredUrls: { shotId: string; shotNumber: number; url: string }[] = [];
    for (const shot of readyShots) {
      if (!shot.video_url || !isTemporaryVideoUrl(shot.video_url)) continue;

      const isAccessible = await isTemporaryVideoUrlAccessible(shot.video_url);
      if (!isAccessible) {
        expiredUrls.push({
          shotId: shot.id,
          shotNumber: shot.shot_number,
          url: shot.video_url,
        });
        continue;
      }

      try {
        const permanentUrl = await uploadShotVideoToSupabase(shot.video_url, projectId, shot.id);
        await db
          .update(scene_shots)
          .set({
            video_url: permanentUrl,
            updated_at: new Date(),
          })
          .where(eq(scene_shots.id, shot.id));
        shot.video_url = permanentUrl;
      } catch (uploadError) {
        console.warn('⚠️ Unable to persist temporary shot video, using temp URL:', uploadError);
      }
    }

    if (expiredUrls.length > 0) {
      // Mark expired shots as needing regeneration
      for (const expired of expiredUrls) {
        await db
          .update(scene_shots)
          .set({
            video_url: null,
            video_status: null, // null means "pending" (not yet triggered)
            updated_at: new Date(),
          })
          .where(eq(scene_shots.id, expired.shotId));
      }

      const shotNumbers = expiredUrls.map(e => `Shot #${e.shotNumber}`).join(', ');
      return {
        success: false,
        error: `${expiredUrls.length} video(s) have expired URLs and need to be regenerated: ${shotNumbers}. Go to Timeline and regenerate these shots.`,
      };
    }

    // Group shots by scene_id (already ordered by shot_number from query)
    // NOTE: We don't send durations - let FFmpeg probe actual video durations for accuracy
    const videoMap = new Map<string, VideoForAssembly[]>();
    for (const shot of readyShots) {
      if (shot.video_url) {
        const existing = videoMap.get(shot.scene_id) || [];
        existing.push({
          url: shot.video_url,
          duration: 0, // Let FFmpeg probe actual duration
        });
        videoMap.set(shot.scene_id, existing);
      }
    }

    // Order videos according to scene_order (or scene_number fallback)
    // Each scene may have multiple shots that need to be flattened in order
    const rawSceneOrder = (project.scene_order as (string | number)[]) || [];
    const orderedVideos: VideoForAssembly[] = [];

    // Create maps for both UUID and scene_number lookups
    const sceneNumberToId = new Map(projectScenes.map((s) => [s.scene_number, s.id]));
    const sceneIdToNumber = new Map(projectScenes.map((s) => [s.id, s.scene_number]));

    // Detect if scene_order contains UUIDs or scene numbers
    const hasUuidOrder = rawSceneOrder.length > 0 && typeof rawSceneOrder[0] === 'string' && rawSceneOrder[0].includes('-');

    if (hasUuidOrder) {
      // scene_order contains UUIDs - use directly
      for (const sceneId of rawSceneOrder as string[]) {
        const sceneShots = videoMap.get(sceneId);
        if (sceneShots) {
          orderedVideos.push(...sceneShots);
        }
      }
    } else if (rawSceneOrder.length > 0) {
      // scene_order contains scene numbers - convert to UUIDs
      for (const sceneNum of rawSceneOrder as number[]) {
        const sceneId = sceneNumberToId.get(sceneNum);
        if (sceneId) {
          const sceneShots = videoMap.get(sceneId);
          if (sceneShots) {
            orderedVideos.push(...sceneShots);
          }
        }
      }
    } else {
      // No scene_order - fallback: order by scene_number
      const sortedSceneIds = [...videoMap.keys()].sort((a, b) => {
        const numA = sceneIdToNumber.get(a) || 0;
        const numB = sceneIdToNumber.get(b) || 0;
        return numA - numB;
      });

      for (const sceneId of sortedSceneIds) {
        const sceneShots = videoMap.get(sceneId);
        if (sceneShots) {
          orderedVideos.push(...sceneShots);
        }
      }
    }

    if (orderedVideos.length < 2) {
      return {
        success: false,
        error: `Need at least 2 video shots with URLs. Found: ${orderedVideos.length}`,
      };
    }

    console.log(`📹 Assembling ${orderedVideos.length} video shots from ${videoMap.size} scenes`);

    // Convert Supabase storage URLs to signed URLs for private buckets
    // The 'videos' bucket is private and requires signed URLs for external access
    console.log('🔐 Converting Supabase URLs to signed URLs for FFmpeg API access...');
    for (const video of orderedVideos) {
      if (isSupabaseStorageUrl(video.url)) {
        try {
          // Create signed URL valid for 1 hour (should be enough for assembly)
          video.url = await createSignedUrl(video.url, 3600);
        } catch (signError) {
          console.error('❌ Failed to create signed URL:', signError);
          return {
            success: false,
            error: `Failed to create signed URL for video: ${signError instanceof Error ? signError.message : 'Unknown error'}`,
          };
        }
      }
    }

    // Check for existing final_reel record
    const [existingReel] = await db
      .select()
      .from(final_reels)
      .where(eq(final_reels.project_id, projectId))
      .limit(1);

    let reelId: string;

    if (existingReel) {
      // Update existing record
      await db
        .update(final_reels)
        .set({
          status: 'assembling',
          video_url: null,
          error_message: null,
          assembly_progress: { started_at: new Date().toISOString(), video_count: orderedVideos.length },
        })
        .where(eq(final_reels.id, existingReel.id));
      reelId = existingReel.id;
      console.log('📝 Updated existing reel record:', reelId);
    } else {
      // Create new record
      const [newReel] = await db
        .insert(final_reels)
        .values({
          project_id: projectId,
          status: 'assembling',
          assembly_progress: { started_at: new Date().toISOString(), video_count: orderedVideos.length },
        })
        .returning();
      reelId = newReel.id;
      console.log('📝 Created new reel record:', reelId);
    }

    // Get webhook URL from environment
    const webhookUrl = process.env.N8N_ASSEMBLY_WEBHOOK;
    if (!webhookUrl) {
      // Update status to failed
      await db
        .update(final_reels)
        .set({
          status: 'failed',
          error_message: 'Assembly webhook URL not configured',
        })
        .where(eq(final_reels.id, reelId));

      return { success: false, error: 'Assembly webhook URL not configured' };
    }

    // Prepare payload with title and description for YouTube
    const payload: AssemblyWebhookPayload = {
      projectId,
      title: `${project.title} - Film Reel`,
      description: `Film reel for "${project.title}"\n\nCreated with RipReel.io - AI-powered film production tool`,
      videos: orderedVideos,
    };

    console.log('🚀 Calling assembly webhook:', webhookUrl);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    // Call n8n webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Parse response body safely
    const responseText = await response.text();
    console.log('📥 Webhook response status:', response.status);
    console.log('📥 Webhook response body:', responseText.substring(0, 500));

    if (!response.ok) {
      console.error('❌ Webhook error:', response.status, responseText);

      await db
        .update(final_reels)
        .set({
          status: 'failed',
          error_message: `Webhook failed: ${response.status} ${responseText.substring(0, 200)}`,
        })
        .where(eq(final_reels.id, reelId));

      return { success: false, error: `Assembly webhook failed: ${response.status}` };
    }

    // Safely parse JSON response
    let result: AssemblyWebhookResponse;
    try {
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from webhook');
      }
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse webhook response as JSON:', parseError);
      console.error('   Response body:', responseText);

      await db
        .update(final_reels)
        .set({
          status: 'failed',
          error_message: `Invalid JSON response from webhook: ${parseError instanceof Error ? parseError.message : 'Parse error'}`,
        })
        .where(eq(final_reels.id, reelId));

      return {
        success: false,
        error: `Invalid JSON response from assembly webhook: ${parseError instanceof Error ? parseError.message : 'Parse error'}`,
      };
    }

    if (!result.success) {
      console.error('❌ Assembly failed:', result.error);

      await db
        .update(final_reels)
        .set({
          status: 'failed',
          error_message: result.error || 'Assembly failed',
        })
        .where(eq(final_reels.id, reelId));

      return { success: false, error: result.error || 'Assembly failed' };
    }

    // FFmpeg assembly successful! Now upload to Supabase for permanent storage
    let permanentVideoUrl = result.videoUrl;

    if (result.videoUrl) {
      try {
        console.log('📦 Uploading assembled video to Supabase...');

        await db
          .update(final_reels)
          .set({
            status: 'uploading',
            assembly_progress: {
              step: 'uploading_to_supabase',
              video_count: orderedVideos.length,
            },
          })
          .where(eq(final_reels.id, reelId));

        permanentVideoUrl = await uploadVideoToSupabase(result.videoUrl, projectId);
        console.log('✅ Video uploaded to Supabase:', permanentVideoUrl);
      } catch (uploadError) {
        console.error('⚠️ Supabase upload failed, using temporary URL:', uploadError);
        // Continue with temporary URL if upload fails
        // The video will still be available for 2 hours
      }
    }

    // Success! Update final_reels with permanent Supabase URL and YouTube URL
    await db
      .update(final_reels)
      .set({
        status: 'ready',
        video_url: permanentVideoUrl, // Permanent Supabase URL (or temp if upload failed)
        youtube_url: result.youtubeUrl, // YouTube unlisted URL
        youtube_id: result.youtubeId, // YouTube video ID for embedding
        assembly_progress: {
          completed_at: new Date().toISOString(),
          video_count: orderedVideos.length,
          uploaded_to_supabase: permanentVideoUrl !== result.videoUrl,
        },
      })
      .where(eq(final_reels.id, reelId));

    console.log('✅ Assembly complete');
    console.log('   - Video URL:', permanentVideoUrl);
    console.log('   - YouTube URL:', result.youtubeUrl);

    return {
      success: true,
      reelId,
      videoUrl: permanentVideoUrl,
      youtubeUrl: result.youtubeUrl,
      youtubeId: result.youtubeId
    };
  } catch (error) {
    console.error('❌ Error triggering assembly:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to trigger assembly',
    };
  }
}

/**
 * Get assembly status for a project
 *
 * Returns the current final_reels record if it exists.
 */
export async function getAssemblyStatus(projectId: string) {
  const [reel] = await db
    .select()
    .from(final_reels)
    .where(eq(final_reels.project_id, projectId))
    .limit(1);

  return reel || null;
}

/**
 * Retry failed assembly
 *
 * Resets the reel status and re-triggers assembly.
 */
export async function retryAssembly(
  projectId: string
): Promise<AssemblyActionResult> {
  console.log('🔄 Retrying assembly for project:', projectId);
  return triggerFinalAssembly(projectId);
}

/**
 * Reset assembly status to idle
 *
 * Used when assembly is stuck in 'assembling' state (e.g., after server restart
 * or if the webhook never responded). Deletes the final_reels record so user
 * can start fresh.
 */
export async function resetAssemblyStatus(
  projectId: string
): Promise<AssemblyActionResult> {
  try {
    console.log('🔄 Resetting assembly status for project:', projectId);

    // Delete the final_reels record so it goes back to "idle" state
    await db
      .delete(final_reels)
      .where(eq(final_reels.project_id, projectId));

    console.log('✅ Assembly status reset to idle');
    return { success: true };
  } catch (error) {
    console.error('❌ Error resetting assembly status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset assembly status',
    };
  }
}
