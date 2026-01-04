/**
 * Project Status API Resource Route
 *
 * GET endpoint to check project status and scene count.
 *
 * Route: /api/projects/:projectId/status
 */

import { db } from "@/lib/drizzle/db.server";
import { projects, scenes } from "@/lib/drizzle/schema";
import { eq, count } from "drizzle-orm";
import type { Route } from "./+types/api.projects.$projectId.status";

export async function loader({ params }: Route.LoaderArgs) {
  try {
    const projectId = params.projectId;

    console.log("📊 Status API called for project:", projectId);

    // Fetch project
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      console.log("❌ Project not found:", projectId);
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Count scenes
    const [sceneCount] = await db
      .select({ count: count() })
      .from(scenes)
      .where(eq(scenes.project_id, projectId));

    const response = {
      status: project.status,
      sceneCount: sceneCount?.count || 0,
    };

    console.log("✅ Status API response:", response);

    return Response.json(response);
  } catch (error) {
    console.error("❌ Error in status API:", error);
    return Response.json(
      {
        error: "Failed to fetch project status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
