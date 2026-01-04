import type { Route } from "./+types/api.webhooks.n8n.nano-banana-complete";
import { db } from "@/lib/drizzle/db.server";
import { scene_images } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Webhook endpoint to receive Nano Banana generation results from n8n
 *
 * Expected payload:
 * {
 *   scene_image_id: string;
 *   image_url?: string;
 *   status: "ready" | "failed";
 *   error_message?: string;
 * }
 */
export async function action({ request }: Route.ActionArgs) {
  try {
    const body = await request.json();
    const { scene_image_id, image_url, status, error_message } = body;

    console.log("Received Nano Banana result:", {
      scene_image_id,
      status,
      has_image: !!image_url,
    });

    if (!scene_image_id) {
      return Response.json(
        { success: false, error: "scene_image_id is required" },
        { status: 400 }
      );
    }

    // Update database with generated image
    await db
      .update(scene_images)
      .set({
        image_url: image_url || null,
        status: status || "ready",
        error_message: error_message || null,
      })
      .where(eq(scene_images.id, scene_image_id));

    console.log("Nano Banana image updated in database");

    return Response.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
