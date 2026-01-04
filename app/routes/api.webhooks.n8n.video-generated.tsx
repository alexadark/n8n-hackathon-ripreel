import type { Route } from "./+types/api.webhooks.n8n.video-generated";
import { db } from "@/lib/drizzle/db.server";
import { scene_videos, scenes } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { processVideoQueue } from "@/app/actions/videos.server";

/**
 * Webhook endpoint to receive video generation results from n8n
 *
 * Expected payload (supports both camelCase and snake_case):
 * {
 *   scene_video_id: string;
 *   video_url?: string;
 *   duration_seconds?: number;
 *   status: "ready" | "failed";
 *   error_message?: string;
 * }
 */
export async function action({ request }: Route.ActionArgs) {
  try {
    const body = await request.json();

    // Log full payload for debugging
    console.log(
      "Video generation webhook received:",
      JSON.stringify(body, null, 2)
    );

    // Handle both camelCase and snake_case formats
    const scene_video_id = body.scene_video_id || body.sceneVideoId;
    const video_url = body.video_url || body.videoUrl;
    const duration_seconds = body.duration_seconds || body.durationSeconds;
    const status = body.status;
    const error_message = body.error_message || body.errorMessage;

    console.log("Parsed video result:", {
      scene_video_id,
      status,
      has_video: !!video_url,
      duration_seconds,
      video_url_preview: video_url
        ? `${video_url.substring(0, 50)}...`
        : "none",
    });

    // Validate required fields
    if (!scene_video_id) {
      return Response.json(
        { success: false, error: "scene_video_id is required" },
        { status: 400 }
      );
    }

    // Get video record
    const [video] = await db
      .select()
      .from(scene_videos)
      .where(eq(scene_videos.id, scene_video_id))
      .limit(1);

    if (!video) {
      return Response.json(
        { success: false, error: "Video record not found" },
        { status: 404 }
      );
    }

    // Get scene to find project_id
    const [scene] = await db
      .select()
      .from(scenes)
      .where(eq(scenes.id, video.scene_id))
      .limit(1);

    // Handle failed status
    if (status === "failed") {
      await db
        .update(scene_videos)
        .set({
          status: "failed",
          error_message: error_message || "Video generation failed",
          n8n_job_id: null,
        })
        .where(eq(scene_videos.id, scene_video_id));

      console.log(`Video ${scene_video_id} marked as failed`);

      // Still process queue to start next video
      if (scene) {
        await processVideoQueue(scene.project_id);
      }

      return Response.json({
        success: true,
        message: `Video ${scene_video_id} marked as failed`,
      });
    }

    // Update video record with successful result
    await db
      .update(scene_videos)
      .set({
        video_url: video_url || null,
        duration_seconds: duration_seconds || null,
        status: "ready",
        error_message: null,
        n8n_job_id: null,
      })
      .where(eq(scene_videos.id, scene_video_id));

    console.log(`Video ${scene_video_id} updated successfully`);

    // Process queue to start next video if slots available
    if (scene) {
      console.log("Processing video queue after completion...");
      const queueResult = await processVideoQueue(scene.project_id);
      console.log(`Queue processing: ${queueResult.triggered} videos started`);
    }

    return Response.json({
      success: true,
      message: `Video ${scene_video_id} updated successfully`,
    });
  } catch (error) {
    console.error("Video webhook error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
