/**
 * Bible Cleanup API Resource Route
 *
 * POST endpoint to delete stuck variants without regenerating.
 *
 * Route: /api/bible/cleanup
 */

import { db } from "@/lib/drizzle/db.server";
import {
  bibleImageVariants,
  projectCharacters,
  projectLocations,
} from "@/lib/drizzle/schema";
import { eq, inArray, and } from "drizzle-orm";
import type { Route } from "./+types/api.bible.cleanup";

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

    console.log(`🧹 Cleaning up stuck variants for project ${projectId}`);

    // Get all characters and locations for this project
    const [characters, locations] = await Promise.all([
      db
        .select({ id: projectCharacters.id })
        .from(projectCharacters)
        .where(eq(projectCharacters.project_id, projectId)),
      db
        .select({ id: projectLocations.id })
        .from(projectLocations)
        .where(eq(projectLocations.project_id, projectId)),
    ]);

    const characterIds = characters.map((c) => c.id);
    const locationIds = locations.map((l) => l.id);
    const allAssetIds = [...characterIds, ...locationIds];

    if (allAssetIds.length === 0) {
      return Response.json({ success: true, deleted: 0 });
    }

    // Delete stuck variants (status = 'generating')
    const deleted = await db
      .delete(bibleImageVariants)
      .where(
        and(
          inArray(bibleImageVariants.asset_id, allAssetIds),
          eq(bibleImageVariants.status, "generating")
        )
      )
      .returning();

    console.log(`🗑️ Deleted ${deleted.length} stuck variants`);

    return Response.json({
      success: true,
      deleted: deleted.length,
    });
  } catch (error) {
    console.error("❌ Cleanup API error:", error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
