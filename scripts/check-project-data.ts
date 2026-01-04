import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(__dirname, "../.env.local") });

import { db } from "../lib/drizzle/db";
import { projects, scenes, projectCharacters, projectLocations, projectProps } from "../lib/drizzle/schema";
import { eq, desc } from "drizzle-orm";

async function checkData(): Promise<void> {
  console.log("🔍 Checking database for existing project data...\n");

  // Get the most recent project
  const [latestProject] = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.created_at))
    .limit(1);

  if (!latestProject) {
    console.log("❌ No projects found in database.");
    return;
  }

  console.log(`📁 Latest Project: "${latestProject.title}"`);
  console.log(`   ID: ${latestProject.id}`);
  console.log(`   Status: ${latestProject.status}`);
  console.log(`   Visual Style: ${latestProject.visual_style}`);
  console.log(`   Created: ${latestProject.created_at}\n`);

  // Check Bible assets
  const characters = await db
    .select()
    .from(projectCharacters)
    .where(eq(projectCharacters.project_id, latestProject.id));

  const locations = await db
    .select()
    .from(projectLocations)
    .where(eq(projectLocations.project_id, latestProject.id));

  const props = await db
    .select()
    .from(projectProps)
    .where(eq(projectProps.project_id, latestProject.id));

  console.log(`📖 Bible Assets:`);
  console.log(`   Characters: ${characters.length}`);
  if (characters.length > 0) {
    characters.forEach((char, idx) => {
      console.log(`     ${idx + 1}. ${char.name} (${char.role}) - Status: ${char.image_status}`);
    });
  }
  console.log(`   Locations: ${locations.length}`);
  if (locations.length > 0) {
    locations.forEach((loc, idx) => {
      console.log(`     ${idx + 1}. ${loc.name} (${loc.type}) - Status: ${loc.image_status}`);
    });
  }
  console.log(`   Props: ${props.length}`);
  if (props.length > 0) {
    props.forEach((prop, idx) => {
      console.log(`     ${idx + 1}. ${prop.name} (${prop.importance}) - Status: ${prop.image_status}`);
    });
  }

  // Check scenes
  const projectScenes = await db
    .select()
    .from(scenes)
    .where(eq(scenes.project_id, latestProject.id))
    .orderBy(scenes.scene_number);

  console.log(`\n🎬 Scenes: ${projectScenes.length}`);
  if (projectScenes.length > 0) {
    projectScenes.forEach((scene) => {
      console.log(`   Scene ${scene.scene_number}: ${scene.slugline}`);
      console.log(`     Status: ${scene.validation_status}`);
      console.log(`     Has full_data: ${!!scene.full_data}`);
      console.log(`     Has raw_scene_data: ${!!scene.raw_scene_data}`);
      if (scene.full_data) {
        const fullData = scene.full_data as { characters_present?: string[]; location?: string; location_ref?: string };
        console.log(`     Characters: ${fullData.characters_present?.length || 0}`);
        console.log(`     Location: ${fullData.location || fullData.location_ref || 'N/A'}`);
      }
      console.log("");
    });
  } else {
    console.log("   ⚠️ No scenes found in database!");
  }

  console.log("\n✅ Summary:");
  console.log(`   Project Status: ${latestProject.status}`);
  console.log(`   Bible Assets: ${characters.length + locations.length + props.length} total`);
  console.log(`   Scenes: ${projectScenes.length}`);

  if (projectScenes.length > 0) {
    console.log("\n✅ Your scenes ARE stored in the database!");
    console.log(`   You can view them at: /projects/${latestProject.id}/scenes`);
    console.log(`   Or continue Bible review at: /projects/${latestProject.id}/bible`);
  } else {
    console.log("\n⚠️ Scenes are NOT stored yet.");
    console.log("   You'll need to regenerate or check if parsing is still in progress.");
  }

  process.exit(0);
}

checkData().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
