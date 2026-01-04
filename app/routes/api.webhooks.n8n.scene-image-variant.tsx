import type { Route } from "./+types/api.webhooks.n8n.scene-image-variant";
import { db } from "@/lib/drizzle/db.server";
import { sceneImageVariants } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env.server";

/**
 * Scene Images Storage Bucket
 */
const SCENE_IMAGES_BUCKET = "scene-images";

/**
 * Initialize Supabase client with service role for bucket management
 */
function getAdminClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Upload file to Supabase storage
 */
async function uploadToStorage(
  path: string,
  file: Buffer,
  contentType: string
): Promise<{ url: string; path: string }> {
  const supabase = getAdminClient();

  const { data, error } = await supabase.storage
    .from(SCENE_IMAGES_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType,
    });

  if (error) {
    console.error("Storage upload error:", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(SCENE_IMAGES_BUCKET).getPublicUrl(data.path);

  return { url: publicUrl, path: data.path };
}

/**
 * Generate storage path for scene image
 */
function getSceneImagePath(sceneId: string, variantId: string): string {
  return `scenes/${sceneId}/${variantId}_${Date.now()}.png`;
}

/**
 * Webhook endpoint to receive scene image variant generation results from n8n
 *
 * Expected payload (supports both camelCase and snake_case):
 * {
 *   variant_id: string (or variantId);
 *   image_url?: string (or imageUrl);
 *   status: "ready" | "failed";
 *   error_message?: string (or errorMessage);
 * }
 */
export async function action({ request }: Route.ActionArgs) {
  try {
    const body = await request.json();

    // Log full payload for debugging
    console.log(
      "Scene variant webhook received:",
      JSON.stringify(body, null, 2)
    );

    // Handle both camelCase (from N8N) and snake_case formats
    const variant_id = body.variant_id || body.variantId;
    const image_url = body.image_url || body.imageUrl;
    const status = body.status;
    const error_message = body.error_message || body.errorMessage;

    console.log("Parsed scene variant result:", {
      variant_id,
      status,
      has_image: !!image_url,
      image_url_preview: image_url
        ? `${image_url.substring(0, 50)}...`
        : "none",
    });

    // Validate required fields
    if (!variant_id) {
      return Response.json(
        { success: false, error: "variant_id is required" },
        { status: 400 }
      );
    }

    // Get variant to find scene_id
    const [variant] = await db
      .select()
      .from(sceneImageVariants)
      .where(eq(sceneImageVariants.id, variant_id))
      .limit(1);

    if (!variant) {
      return Response.json(
        { success: false, error: "Variant not found" },
        { status: 404 }
      );
    }

    // Handle failed status
    if (status === "failed") {
      await db
        .update(sceneImageVariants)
        .set({
          status: "failed",
          error_message: error_message || "Generation failed",
          n8n_job_id: null,
          updated_at: new Date(),
        })
        .where(eq(sceneImageVariants.id, variant_id));

      console.log(`Scene variant ${variant_id} marked as failed`);
      return Response.json({
        success: true,
        message: `Scene variant ${variant_id} marked as failed`,
      });
    }

    // Download image from temporary URL and upload to Supabase
    let permanentUrl = image_url;
    let permanentPath = "";

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

        // Validate we got actual image data
        if (imageBuffer.length < 1000) {
          console.error(`Downloaded data too small (${imageBuffer.length} bytes)`);
          throw new Error("Downloaded image data too small");
        }

        // Generate storage path
        const storagePath = getSceneImagePath(variant.scene_id, variant_id);

        // Upload to Supabase
        console.log(`Uploading to Supabase: ${storagePath}`);
        const result = await uploadToStorage(
          storagePath,
          imageBuffer,
          "image/png"
        );

        permanentUrl = result.url;
        permanentPath = result.path;
        console.log(
          `Permanently stored at: ${permanentUrl.substring(0, 50)}...`
        );
      } catch (error) {
        console.error(`Failed to store image permanently:`, error);
        // Continue with temporary URL if upload fails
        // The image may still work for a while
      }
    }

    // Update variant record
    await db
      .update(sceneImageVariants)
      .set({
        image_url: permanentUrl || "",
        storage_path: permanentPath || "",
        status: "ready",
        error_message: null,
        n8n_job_id: null, // Clear job ID when complete
        updated_at: new Date(),
      })
      .where(eq(sceneImageVariants.id, variant_id));

    console.log(`Scene variant ${variant_id} updated successfully`);

    return Response.json({
      success: true,
      message: `Scene variant ${variant_id} updated successfully`,
    });
  } catch (error) {
    console.error("Scene variant webhook error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
