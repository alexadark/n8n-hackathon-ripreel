import type { Route } from "./+types/api.webhooks.n8n.bible.location-image";
import { db } from "@/lib/drizzle/db.server";
import { projectLocations } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import {
  uploadBibleFile,
  getLocationImagePath,
  BIBLE_STORAGE_BUCKETS,
} from "@/lib/supabase/storage-bible";

/**
 * Webhook endpoint to receive location image generation results from n8n
 *
 * Expected payload (supports both camelCase and snake_case):
 * {
 *   location_id: string (or locationId);
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
    const location_id = body.location_id || body.locationId;
    const image_url = body.image_url || body.imageUrl; // N8N sends imageUrl
    const storage_path = body.storage_path || body.storagePath;
    const status = body.status;
    const error_message = body.error_message || body.errorMessage;

    console.log("Parsed location image result:", {
      location_id,
      status,
      has_image: !!image_url,
      image_url_preview: image_url
        ? `${image_url.substring(0, 50)}...`
        : "none",
    });

    // Validate required fields
    if (!location_id) {
      return Response.json(
        { success: false, error: "location_id is required" },
        { status: 400 }
      );
    }

    // If status is failed, just update the status
    if (status === "failed") {
      await db
        .update(projectLocations)
        .set({
          image_status: "failed",
          n8n_job_id: null,
          error_message: error_message || null,
        })
        .where(eq(projectLocations.id, location_id));

      console.log(`Location image marked as failed`);
      return Response.json({
        success: true,
        message: "Location image marked as failed",
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
        const filename = `${location_id}_${Date.now()}.png`;
        const storagePath = getLocationImagePath(location_id, filename);

        // Upload to Supabase
        console.log(`Uploading to Supabase: ${storagePath}`);
        const { url, path } = await uploadBibleFile(
          BIBLE_STORAGE_BUCKETS.locations,
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

    // Update location with generated image
    await db
      .update(projectLocations)
      .set({
        approved_image_url: permanentUrl || null,
        approved_image_storage_path: permanentPath || null,
        image_status: "ready",
        n8n_job_id: null, // Clear job ID when complete
        error_message: error_message || null,
      })
      .where(eq(projectLocations.id, location_id));

    console.log("Location image updated in database with permanent URL");

    return Response.json({
      success: true,
      message: "Location image updated successfully",
    });
  } catch (error) {
    console.error("Location image webhook error:", error);
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
