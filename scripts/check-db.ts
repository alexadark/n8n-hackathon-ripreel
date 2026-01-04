import { db } from '../lib/drizzle/db';
import { projects, scenes, sceneImageVariants, scene_shots } from '../lib/drizzle/schema';
import { eq, desc } from 'drizzle-orm';

async function main() {
  // Find recent projects
  const projectList = await db
    .select({ id: projects.id, title: projects.title, status: projects.status })
    .from(projects)
    .orderBy(desc(projects.created_at))
    .limit(5);

  console.log('Recent projects:');
  console.log(JSON.stringify(projectList, null, 2));

  // Find the Last Witness project
  const lastWitness = projectList.find(p => p.title?.toLowerCase().includes('witness'));

  if (lastWitness) {
    console.log('\n--- Last Witness Project ---');
    console.log('ID:', lastWitness.id);

    // Get scenes
    const scenesList = await db
      .select()
      .from(scenes)
      .where(eq(scenes.project_id, lastWitness.id))
      .limit(3);

    console.log('\nScene 1 FULL DATA DUMP:');
    const scene1 = scenesList[0];
    console.log('\n--- FULL DATA (all keys) ---');
    console.log(JSON.stringify(scene1.full_data, null, 2));
    console.log('\n--- RAW SCENE DATA (all keys) ---');
    console.log(JSON.stringify(scene1.raw_scene_data, null, 2));
    console.log('\n--- action_text column ---');
    console.log(scene1.action_text);

    console.log('\n\n========================================\n');
    for (const scene of scenesList) {
      console.log('\n========== Scene ' + scene.scene_number + ': ' + scene.slugline + ' ==========');

      // Get variants for this scene
      const variants = await db
        .select()
        .from(sceneImageVariants)
        .where(eq(sceneImageVariants.scene_id, scene.id));

      console.log('  Variants: ' + variants.length);
      variants.forEach(v => {
        const selected = v.is_selected ? '(SELECTED)' : '';
        console.log('    - ' + v.model + ': ' + v.status + ' ' + selected);
      });

      // Check for scene_shots (Veo 3.1 video generation)
      const shots = await db
        .select()
        .from(scene_shots)
        .where(eq(scene_shots.scene_id, scene.id));

      if (shots.length > 0) {
        console.log('  Scene Shots: ' + shots.length);
        shots.forEach(shot => {
          console.log('    Shot ' + shot.shot_number + ':');
          console.log('      start_frame_image_url:', shot.start_frame_image_url || 'NULL');
          console.log('      end_frame_image_url:', shot.end_frame_image_url || 'NULL');
          console.log('      end_frame_instruction:', shot.end_frame_instruction || 'NULL');
          console.log('      video_status:', shot.video_status || 'NULL');
        });
      } else {
        console.log('  Scene Shots: 0 (no shots created yet)');
      }
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
