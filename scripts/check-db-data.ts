import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(__dirname, "../.env.local") });

import { db } from "../lib/drizzle/db";
import { projects, scenes, projectCharacters, projectLocations, projectProps } from "../lib/drizzle/schema";
import { eq } from "drizzle-orm";

async function checkData(): Promise<void> {
  console.log("🔍 Checking database for existing data...\n");

  // Check projects
  const allProjects = await db.select().from(projects);
  console.log(`📁 Projects found: ${allProjects.length}`);

  if (allProjects.length > 0) {
    console.log("\nProject Details:");
    allProjects.forEach((project, idx) => {
      console.log(`\n${idx + 1}. ${project.title}`);
      console.log(`   ID: ${project.id}`);
      console.log(`   Status: ${project.status}`);
      console.log(`   Visual Style: ${project.visual_style}`);
      console.log(`   Created: ${project.created_at}`);
    });

    // Check Bible assets for each project
    for (const project of allProjects) {
      console.log(`\n📖 Bible Assets for "${project.title}":`);

      const chars = await db.select().from(projectCharacters).where(eq(projectCharacters.project_id, project.id));
      const locs = await db.select().from(projectLocations).where(eq(projectLocations.project_id, project.id));
      const props = await db.select().from(projectProps).where(eq(projectProps.project_id, project.id));

      console.log(`   Characters: ${chars.length}`);
      console.log(`   Locations: ${locs.length}`);
      console.log(`   Props: ${props.length}`);

      // Check scenes
      const projectScenes = await db.select().from(scenes).where(eq(scenes.project_id, project.id));
      console.log(`   Scenes: ${projectScenes.length}`);
    }
  } else {
    console.log("\n❌ No projects found in database.");
    console.log("You'll need to run the n8n workflow to generate new data.");
  }

  process.exit(0);
}

checkData().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
