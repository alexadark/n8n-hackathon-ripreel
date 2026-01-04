import type { Route } from "./+types/api.webhooks.n8n.bible.character-image";
import { db } from "@/lib/drizzle/db.server";
import { projectCharacters, bibleImageVariants } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import {
  uploadBibleFile,
  getCharacterShotPath,
  BIBLE_STORAGE_BUCKETS,
} from "@/lib/supabase/storage-bible";

/**
 * Webhook endpoint to receive character image generation results from n8n
 *
 * Expected payload (supports both camelCase and snake_case):
 * {
 *   character_id: string (or characterId);
 *   shot_type: "portrait" | "three_quarter" | "full_body" (or shotType);
 *   image_url?: string (or imageUrl - N8N sends imageUrl);
 *   storage_path?: string (or storagePath);
 *   status: "ready" | "failed";
 *   error_message?: string (or errorMessage);
 *   variant_id?: string (or variantId); // If present, update variant instead of main record
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
    const character_id = body.character_id || body.characterId;
    const shot_type = body.shot_type || body.shotType;
    const image_url = body.image_url || body.imageUrl; // N8N sends imageUrl
    const storage_path = body.storage_path || body.storagePath;
    const status = body.status;
    const error_message = body.error_message || body.errorMessage;
    const variant_id = body.variant_id || body.variantId;

    console.log("Parsed character image result:", {
      character_id,
      shot_type,
      status,
      has_image: !!image_url,
      image_url_preview: image_url
        ? `${image_url.substring(0, 50)}...`
        : "none",
      is_variant: !!variant_id,
    });

    // Validate required fields
    if (!character_id) {
      return Response.json(
        { success: false, error: "character_id is required" },
        { status: 400 }
      );
    }

    if (
      !shot_type ||
      !["portrait", "three_quarter", "full_body"].includes(shot_type)
    ) {
      return Response.json(
        {
          success: false,
          error: "shot_type must be portrait, three_quarter, or full_body",
        },
        { status: 400 }
      );
    }

    // Handle variant update (multi-model generation)
    if (variant_id) {
      console.log(`Updating variant ${variant_id}...`);

      // If status is failed, just update the status
      if (status === "failed") {
        await db
          .update(bibleImageVariants)
          .set({
            status: "failed",
            error_message: error_message || null,
            n8n_job_id: null,
            updated_at: new Date(),
          })
          .where(eq(bibleImageVariants.id, variant_id));

        console.log(`Variant ${variant_id} marked as failed`);
        return Response.json({
          success: true,
          message: `Variant ${variant_id} marked as failed`,
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
          const filename = `${variant_id}_${Date.now()}.png`;
          const storagePath = getCharacterShotPath(
            character_id,
            shot_type,
            filename
          );

          // Upload to Supabase
          console.log(`Uploading to Supabase: ${storagePath}`);
          const { url, path } = await uploadBibleFile(
            BIBLE_STORAGE_BUCKETS.characters,
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

      await db
        .update(bibleImageVariants)
        .set({
          image_url: permanentUrl || "",
          storage_path: permanentPath || "",
          status: "ready",
          error_message: error_message || null,
          n8n_job_id: null, // Clear job ID when complete
          updated_at: new Date(),
        })
        .where(eq(bibleImageVariants.id, variant_id));

      console.log(`Variant ${variant_id} updated successfully with permanent URL`);

      return Response.json({
        success: true,
        message: `Variant ${variant_id} updated successfully`,
      });
    }

    // Build dynamic update object based on shot type (legacy/single image behavior)
    const updateFields: Record<string, string | null> = {};

    // If status is failed, just update the status
    if (status === "failed") {
      switch (shot_type) {
        case "portrait":
          updateFields.portrait_status = "failed";
          updateFields.portrait_n8n_job_id = null;
          break;
        case "three_quarter":
          updateFields.three_quarter_status = "failed";
          updateFields.three_quarter_n8n_job_id = null;
          break;
        case "full_body":
          updateFields.full_body_status = "failed";
          updateFields.full_body_n8n_job_id = null;
          break;
      }

      if (error_message) {
        updateFields.error_message = error_message;
      }

      await db
        .update(projectCharacters)
        .set(updateFields)
        .where(eq(projectCharacters.id, character_id));

      console.log(`Character ${shot_type} image marked as failed`);
      return Response.json({
        success: true,
        message: `Character ${shot_type} image marked as failed`,
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
        const filename = `${character_id}_${shot_type}_${Date.now()}.png`;
        const storagePath = getCharacterShotPath(
          character_id,
          shot_type,
          filename
        );

        // Upload to Supabase
        console.log(`Uploading to Supabase: ${storagePath}`);
        const { url, path } = await uploadBibleFile(
          BIBLE_STORAGE_BUCKETS.characters,
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

    switch (shot_type) {
      case "portrait":
        updateFields.portrait_image_url = permanentUrl || null;
        updateFields.portrait_storage_path = permanentPath || null;
        updateFields.portrait_status = "ready";
        updateFields.portrait_n8n_job_id = null; // Clear job ID when complete
        break;
      case "three_quarter":
        updateFields.three_quarter_image_url = permanentUrl || null;
        updateFields.three_quarter_storage_path = permanentPath || null;
        updateFields.three_quarter_status = "ready";
        updateFields.three_quarter_n8n_job_id = null;
        break;
      case "full_body":
        updateFields.full_body_image_url = permanentUrl || null;
        updateFields.full_body_storage_path = permanentPath || null;
        updateFields.full_body_status = "ready";
        updateFields.full_body_n8n_job_id = null;
        break;
    }

    if (error_message) {
      updateFields.error_message = error_message;
    }

    // Update character with generated image
    await db
      .update(projectCharacters)
      .set(updateFields)
      .where(eq(projectCharacters.id, character_id));

    console.log(`Character ${shot_type} image updated in database`);

    return Response.json({
      success: true,
      message: `Character ${shot_type} image updated successfully`,
    });
  } catch (error) {
    console.error("Character image webhook error:", error);
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
