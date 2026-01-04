/**
 * Quick script to fix a shot's video URL when n8n succeeded but webhook failed
 *
 * Usage: npx tsx scripts/fix-shot-video.ts
 */

import { db } from '../lib/drizzle/db';
import { scene_shots, scenes } from '../lib/drizzle/schema';
import { eq } from 'drizzle-orm';

async function fixShotVideo() {
  const shotId = '75f01023-98e5-4092-97b3-f4031a85c943';
  const videoUrl = 'https://tempfile.aiquickdraw.com/v/195c96838402c1f468e7c83f8b2742cc_1765970900.mp4';
  const taskId = '195c96838402c1f468e7c83f8b2742cc';

  console.log('🔧 Fixing shot video result:', shotId);

  // Check current state
  const [shot] = await db
    .select()
    .from(scene_shots)
    .where(eq(scene_shots.id, shotId))
    .limit(1);

  if (!shot) {
    console.error('❌ Shot not found:', shotId);
    process.exit(1);
  }

  console.log('📊 Current shot state:', {
    id: shot.id,
    video_status: shot.video_status,
    video_url: shot.video_url,
    veo_task_id: shot.veo_task_id,
    error_message: shot.error_message,
  });

  // Update the shot
  await db
    .update(scene_shots)
    .set({
      video_url: videoUrl,
      video_status: 'ready',
      veo_task_id: taskId,
      error_message: null,
      updated_at: new Date(),
    })
    .where(eq(scene_shots.id, shotId));

  // Verify update
  const [updatedShot] = await db
    .select()
    .from(scene_shots)
    .where(eq(scene_shots.id, shotId))
    .limit(1);

  console.log('✅ Updated shot state:', {
    id: updatedShot.id,
    video_status: updatedShot.video_status,
    video_url: updatedShot.video_url,
    veo_task_id: updatedShot.veo_task_id,
  });

  // Get scene info for path reference
  const [scene] = await db
    .select()
    .from(scenes)
    .where(eq(scenes.id, shot.scene_id))
    .limit(1);

  if (scene) {
    console.log(`📍 Refresh page: /projects/${scene.project_id}/studio/video`);
  }

  process.exit(0);
}

fixShotVideo().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
