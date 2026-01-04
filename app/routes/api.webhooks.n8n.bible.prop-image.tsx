import type { Route } from "./+types/api.webhooks.n8n.bible.prop-image";
import { db } from "@/lib/drizzle/db.server";
import { projectProps } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import {
  uploadBibleFile,
  getPropImagePath,
  BIBLE_STORAGE_BUCKETS,
} from "@/lib/supabase/storage-bible";

/**
 * Webhook endpoint to receive prop image generation results from n8n
 *
 * Expected payload (supports both camelCase and snake_case):
 * {
 *   prop_id: string (or propId);
 *   image_url?: string (or imageUrl - N8N sends imageUrl);
 *   storage_path?: string (or storagePath);
 *   status: "ready" | "failed";
 *   error_message?: string (or errorMessage);
 * }
 */
export async function action({ request }: Route.ActionArgs) {
  try {
    const body = await request.json();

    // Log full payload for debugging
    console.log(
      "Received full webhook payload:",
      JSON.stringify(body, null, 2)
    );

    // Handle both camelCase (from N8N) and snake_case formats
    const prop_id = body.prop_id || body.propId;
    const image_url = body.image_url || body.imageUrl; // N8N sends imageUrl
    const storage_path = body.storage_path || body.storagePath;
    const status = body.status;
    const error_message = body.error_message || body.errorMessage;

    console.log("Parsed prop image result:", {
      prop_id,
      status,
      has_image: !!image_url,
      image_url_preview: image_url
        ? `${image_url.substring(0, 50)}...`
        : "none",
    });

    // Validate required fields
    if (!prop_id) {
      return Response.json(
        { success: false, error: "prop_id is required" },
        { status: 400 }
      );
    }

    // If status is failed, just update the status
    if (status === "failed") {
      await db
        .update(projectProps)
        .set({
          image_status: "failed",
          n8n_job_id: null,
          error_message: error_message || null,
        })
        .where(eq(projectProps.id, prop_id));

      console.log(`Prop image marked as failed`);
      return Response.json({
        success: true,
        message: "Prop image marked as failed",
      });
    }

    // Download image from temporary URL and upload to Supabase
    let permanentUrl = image_url;
    let permanentPath = storage_path;

    if (image_url) {
      try {
        console.log(
          `Downloading image from temporary URL: ${image_url.substring(0, 50)}...`
        );

        const imageResponse = await fetch(image_url);
        if (!imageResponse.ok) {
          throw new Error(
            `Failed to download image: ${imageResponse.statusText}`
          );
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        console.log(`Downloaded ${imageBuffer.length} bytes`);

        // Generate storage path
        const filename = `${prop_id}_${Date.now()}.png`;
        const storagePath = getPropImagePath(prop_id, filename);

        // Upload to Supabase
        console.log(`Uploading to Supabase: ${storagePath}`);
        const { url, path } = await uploadBibleFile(
          BIBLE_STORAGE_BUCKETS.props,
          storagePath,
          imageBuffer,
          "image/png"
        );

        permanentUrl = url;
        permanentPath = path;
        console.log(`Permanently stored at: ${url.substring(0, 50)}...`);
      } catch (error) {
        console.error(`Failed to store image permanently:`, error);
        // Continue with temporary URL if upload fails
      }
    }

    // Update prop with generated image
    await db
      .update(projectProps)
      .set({
        approved_image_url: permanentUrl || null,
        approved_image_storage_path: permanentPath || null,
        image_status: "ready",
        n8n_job_id: null, // Clear job ID when complete
        error_message: error_message || null,
      })
      .where(eq(projectProps.id, prop_id));

    console.log("Prop image updated in database with permanent URL");

    return Response.json({
      success: true,
      message: "Prop image updated successfully",
    });
  } catch (error) {
    console.error("Prop image webhook error:", error);
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
