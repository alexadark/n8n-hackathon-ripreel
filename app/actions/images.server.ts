"use server";

import { db } from "@/lib/drizzle/db.server";
import { scene_images } from "@/lib/drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
// Use process.env directly in server actions (env.server.ts causes bundling issues)

export type GenerateImageResult =
  | { success: true; imageId: string }
  | { success: false; error: string };

export type ApproveImageResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Phase 1: Generate image with Nano Banana (structural accuracy)
 */
export async function generateNanoBananaImage(
  sceneId: string,
  prompt: string
): Promise<GenerateImageResult> {
  try {
    console.log("🍌 Generating Nano Banana image for scene:", sceneId);

    // Create scene_images record with nano-banana phase
    const [imageRecord] = await db
      .insert(scene_images)
      .values({
        scene_id: sceneId,
        generation_method: "auto_generate",
        generation_phase: "nano-banana",
        generation_prompt: prompt,
        status: "generating",
        refinement_iteration: 0,
      })
      .returning();

    console.log("✅ Created Nano Banana image record:", imageRecord.id);

    // Trigger n8n workflow for Nano Banana generation
    try {
      if (!process.env.N8N_IMAGE_GENERATION_WEBHOOK) {
        throw new Error('N8N_IMAGE_GENERATION_WEBHOOK not configured');
      }
      const webhookResponse = await fetch(process.env.N8N_IMAGE_GENERATION_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene_image_id: imageRecord.id,
          prompt: prompt,
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n/nano-banana-complete`,
        }),
      });

      if (!webhookResponse.ok) {
        throw new Error(`n8n webhook failed: ${webhookResponse.statusText}`);
      }

      console.log("✅ Nano Banana workflow triggered");
    } catch (error) {
      console.error("❌ Failed to trigger n8n workflow:", error);

      // Mark as failed in database
      await db
        .update(scene_images)
        .set({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Failed to trigger workflow",
        })
        .where(eq(scene_images.id, imageRecord.id));

      return {
        success: false,
        error: "Failed to trigger image generation workflow",
      };
    }

    return {
      success: true,
      imageId: imageRecord.id,
    };
  } catch (error) {
    console.error("❌ Error generating Nano Banana image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate image",
    };
  }
}

/**
 * Regenerate Nano Banana image (user not happy with result)
 */
export async function regenerateNanoBananaImage(
  sceneId: string,
  currentImageId: string,
  prompt: string,
  userFeedback?: string
): Promise<GenerateImageResult> {
  try {
    console.log("🔄 Regenerating Nano Banana image for scene:", sceneId);

    // Get current iteration
    const [currentImage] = await db
      .select()
      .from(scene_images)
      .where(eq(scene_images.id, currentImageId))
      .limit(1);

    if (!currentImage) {
      return { success: false, error: "Current image not found" };
    }

    // Create new image record with incremented iteration
    const [newImageRecord] = await db
      .insert(scene_images)
      .values({
        scene_id: sceneId,
        generation_method: "auto_generate",
        generation_phase: "nano-banana",
        generation_prompt: prompt,
        status: "generating",
        refinement_iteration: currentImage.refinement_iteration + 1,
        parent_image_id: currentImage.parent_image_id || currentImageId, // Link to original
      })
      .returning();

    console.log("✅ Created new Nano Banana image record:", newImageRecord.id);

    // Trigger n8n workflow for Nano Banana regeneration with optional feedback
    try {
      if (!process.env.N8N_IMAGE_GENERATION_WEBHOOK) {
        throw new Error('N8N_IMAGE_GENERATION_WEBHOOK not configured');
      }
      const webhookResponse = await fetch(process.env.N8N_IMAGE_GENERATION_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene_image_id: newImageRecord.id,
          prompt: prompt,
          user_feedback: userFeedback || "Please improve the image",
          iteration: newImageRecord.refinement_iteration,
          previous_image_id: currentImageId,
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n/nano-banana-complete`,
        }),
      });

      if (!webhookResponse.ok) {
        throw new Error(`n8n webhook failed: ${webhookResponse.statusText}`);
      }

      console.log("✅ Nano Banana regeneration workflow triggered");
    } catch (error) {
      console.error("❌ Failed to trigger n8n workflow:", error);

      // Mark as failed in database
      await db
        .update(scene_images)
        .set({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Failed to trigger workflow",
        })
        .where(eq(scene_images.id, newImageRecord.id));

      return {
        success: false,
        error: "Failed to trigger regeneration workflow",
      };
    }

    return {
      success: true,
      imageId: newImageRecord.id,
    };
  } catch (error) {
    console.error("❌ Error regenerating Nano Banana image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to regenerate image",
    };
  }
}

/**
 * Approve Nano Banana image and mark it as ready for Flux enhancement
 */
export async function approveNanoBananaImage(
  imageId: string
): Promise<ApproveImageResult> {
  try {
    console.log("✅ Approving Nano Banana image:", imageId);

    await db
      .update(scene_images)
      .set({
        approved_at: new Date(),
      })
      .where(eq(scene_images.id, imageId));

    console.log("✅ Nano Banana image approved");

    return { success: true };
  } catch (error) {
    console.error("❌ Error approving Nano Banana image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve image",
    };
  }
}

/**
 * Phase 2: Enhance approved Nano Banana image with Flux (cinematic quality)
 */
export async function generateFluxEnhancement(
  sceneId: string,
  nanoBananaImageId: string,
  enhancementPrompt: string
): Promise<GenerateImageResult> {
  try {
    console.log("🎨 Generating Flux enhancement for scene:", sceneId);

    // Verify Nano Banana image is approved
    const [nanoBananaImage] = await db
      .select()
      .from(scene_images)
      .where(
        and(
          eq(scene_images.id, nanoBananaImageId),
          eq(scene_images.generation_phase, "nano-banana")
        )
      )
      .limit(1);

    if (!nanoBananaImage) {
      return { success: false, error: "Nano Banana image not found" };
    }

    if (!nanoBananaImage.approved_at) {
      return { success: false, error: "Nano Banana image not approved yet" };
    }

    if (!nanoBananaImage.image_url) {
      return { success: false, error: "Nano Banana image URL not available" };
    }

    // Create Flux enhancement record
    const [fluxRecord] = await db
      .insert(scene_images)
      .values({
        scene_id: sceneId,
        generation_method: "auto_generate",
        generation_phase: "flux-enhancement",
        generation_prompt: enhancementPrompt,
        parent_image_id: nanoBananaImageId, // Link to Nano Banana source
        status: "generating",
        refinement_iteration: 0,
      })
      .returning();

    console.log("✅ Created Flux enhancement record:", fluxRecord.id);

    // Trigger n8n workflow for Flux image-to-image enhancement
    try {
      if (!process.env.N8N_FLUX_ENHANCEMENT_WEBHOOK) {
        throw new Error("Flux enhancement webhook not configured");
      }
      const webhookResponse = await fetch(process.env.N8N_FLUX_ENHANCEMENT_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene_image_id: fluxRecord.id,
          reference_image_url: nanoBananaImage.image_url,
          enhancement_prompt: enhancementPrompt,
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n/flux-complete`,
        }),
      });

      if (!webhookResponse.ok) {
        throw new Error(`n8n webhook failed: ${webhookResponse.statusText}`);
      }

      console.log("✅ Flux enhancement workflow triggered");
    } catch (error) {
      console.error("❌ Failed to trigger n8n workflow:", error);

      // Mark as failed in database
      await db
        .update(scene_images)
        .set({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Failed to trigger workflow",
        })
        .where(eq(scene_images.id, fluxRecord.id));

      return {
        success: false,
        error: "Failed to trigger Flux enhancement workflow",
      };
    }

    return {
      success: true,
      imageId: fluxRecord.id,
    };
  } catch (error) {
    console.error("❌ Error generating Flux enhancement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate enhancement",
    };
  }
}

/**
 * Regenerate Flux enhancement (user not happy with result)
 */
export async function regenerateFluxEnhancement(
  sceneId: string,
  currentFluxImageId: string,
  nanoBananaImageId: string,
  enhancementPrompt: string,
  userFeedback?: string
): Promise<GenerateImageResult> {
  try {
    console.log("🔄 Regenerating Flux enhancement for scene:", sceneId);

    // Get current iteration
    const [currentImage] = await db
      .select()
      .from(scene_images)
      .where(eq(scene_images.id, currentFluxImageId))
      .limit(1);

    if (!currentImage) {
      return { success: false, error: "Current Flux image not found" };
    }

    // Create new Flux enhancement with incremented iteration
    const [newFluxRecord] = await db
      .insert(scene_images)
      .values({
        scene_id: sceneId,
        generation_method: "auto_generate",
        generation_phase: "flux-enhancement",
        generation_prompt: enhancementPrompt,
        parent_image_id: nanoBananaImageId, // Always link back to Nano Banana
        status: "generating",
        refinement_iteration: currentImage.refinement_iteration + 1,
      })
      .returning();

    console.log("✅ Created new Flux enhancement record:", newFluxRecord.id);

    // Get Nano Banana image URL for reference
    const [nanoBananaImage] = await db
      .select()
      .from(scene_images)
      .where(eq(scene_images.id, nanoBananaImageId))
      .limit(1);

    if (!nanoBananaImage?.image_url) {
      return { success: false, error: "Nano Banana image URL not available" };
    }

    // Trigger n8n workflow for Flux regeneration with optional feedback
    try {
      if (!process.env.N8N_FLUX_ENHANCEMENT_WEBHOOK) {
        throw new Error("Flux enhancement webhook not configured");
      }
      const webhookResponse = await fetch(process.env.N8N_FLUX_ENHANCEMENT_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene_image_id: newFluxRecord.id,
          reference_image_url: nanoBananaImage.image_url,
          enhancement_prompt: enhancementPrompt,
          user_feedback: userFeedback || "Please improve the enhancement",
          iteration: newFluxRecord.refinement_iteration,
          previous_image_id: currentFluxImageId,
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n/flux-complete`,
        }),
      });

      if (!webhookResponse.ok) {
        throw new Error(`n8n webhook failed: ${webhookResponse.statusText}`);
      }

      console.log("✅ Flux regeneration workflow triggered");
    } catch (error) {
      console.error("❌ Failed to trigger n8n workflow:", error);

      // Mark as failed in database
      await db
        .update(scene_images)
        .set({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Failed to trigger workflow",
        })
        .where(eq(scene_images.id, newFluxRecord.id));

      return {
        success: false,
        error: "Failed to trigger regeneration workflow",
      };
    }

    return {
      success: true,
      imageId: newFluxRecord.id,
    };
  } catch (error) {
    console.error("❌ Error regenerating Flux enhancement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to regenerate enhancement",
    };
  }
}

/**
 * Approve final Flux image (ready for video generation)
 */
export async function approveFluxImage(
  imageId: string
): Promise<ApproveImageResult> {
  try {
    console.log("✅ Approving Flux image:", imageId);

    await db
      .update(scene_images)
      .set({
        approved_at: new Date(),
      })
      .where(eq(scene_images.id, imageId));

    console.log("✅ Flux image approved - ready for video generation");

    // TODO: Trigger video + audio generation workflows here
    // Check batch limits (max 2-3 videos at once)
    // If under limit, trigger n8n Workflows #5 & #6

    return { success: true };
  } catch (error) {
    console.error("❌ Error approving Flux image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve image",
    };
  }
}

/**
 * Get images for a scene (both phases)
 */
export async function getSceneImages(sceneId: string) {
  try {
    const images = await db
      .select()
      .from(scene_images)
      .where(eq(scene_images.scene_id, sceneId))
      .orderBy(scene_images.created_at);

    // Separate by phase
    const nanoBananaImages = images.filter(
      (img) => img.generation_phase === "nano-banana"
    );
    const fluxImages = images.filter(
      (img) => img.generation_phase === "flux-enhancement"
    );

    // Find latest approved images
    const approvedNanoBanana = nanoBananaImages
      .filter((img) => img.approved_at)
      .sort((a, b) => {
        return (
          (b.approved_at?.getTime() || 0) - (a.approved_at?.getTime() || 0)
        );
      })[0];

    const approvedFlux = fluxImages
      .filter((img) => img.approved_at)
      .sort((a, b) => {
        return (
          (b.approved_at?.getTime() || 0) - (a.approved_at?.getTime() || 0)
        );
      })[0];

    return {
      nanoBanana: {
        all: nanoBananaImages,
        approved: approvedNanoBanana || null,
        latest:
          nanoBananaImages[nanoBananaImages.length - 1] || null,
      },
      flux: {
        all: fluxImages,
        approved: approvedFlux || null,
        latest: fluxImages[fluxImages.length - 1] || null,
      },
    };
  } catch (error) {
    console.error("❌ Error getting scene images:", error);
    throw error;
  }
}
