/**
 * Bible Reset API Resource Route
 *
 * POST endpoint to reset stuck Bible variants and regenerate them.
 *
 * Route: /api/bible/reset
 */

import { resetStuckBibleVariants } from "@/app/actions/auto-mode.server";
import type { Route } from "./+types/api.bible.reset";

export async function action({ request }: Route.ActionArgs) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return Response.json(
        { success: false, error: "projectId is required" },
        { status: 400 }
      );
    }

    console.log(`🔧 API: Resetting Bible variants for project ${projectId}`);

    const result = await resetStuckBibleVariants(projectId);

    return Response.json(result);
  } catch (error) {
    console.error("❌ Reset API error:", error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
