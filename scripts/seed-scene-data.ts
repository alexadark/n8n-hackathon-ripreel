import { db } from '../lib/drizzle/db';
import { scenes } from '../lib/drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const sceneId = '137f14a1-afae-4228-9fd9-aa89a3e3802d'; // Scene 1: EXT. RAINSOAKED ALLEY - NIGHT

  // Get current scene data
  const [scene] = await db.select().from(scenes).where(eq(scenes.id, sceneId));

  if (!scene) {
    console.log('Scene not found');
    process.exit(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentRawData = scene.raw_scene_data as any || {};

  // Add action description and shots for noir opening scene
  const updatedRawData = {
    ...currentRawData,

    // Action description - what happens in the scene
    action_description: 'Rain pours down in sheets, streaming off fire escapes and pooling in gutters. Detective emerges from shadows, fedora pulled low, trench coat collar turned up against the rain. He pauses at a crime scene cordoned by police tape, red and blue lights casting wet reflections on the asphalt. He crouches down, examines something on the ground - a photograph, ruined by the rain. His weathered face shows resignation, another body, another case that will haunt him.',

    // Also add action_summary as backup
    action_summary: 'Detective arrives at rain-soaked crime scene, examines evidence in the alley',

    // Duration estimate in seconds (2 shots x 8 seconds = 16 seconds)
    duration_estimate: 16,
    estimated_duration_seconds: 16,

    // Shot breakdown for Veo 3.1 (8 seconds per shot)
    shots: [
      {
        shot_number: 1,
        shot_duration_seconds: 8,
        is_first_shot: true,
        shot_type: 'Wide to medium shot',
        composition_instruction: 'Wide establishing shot of rain-soaked alley transitioning to Detective emerging from shadows',
        action_prompt: 'Heavy rain cascades down a dark urban alley. Neon signs flicker, their colors bleeding into puddles on wet asphalt. Police lights pulse red and blue in the distance. A lone figure emerges from the shadows - the Detective. Rain streams off his fedora as he walks toward camera. His trench coat glistens wet. He pauses at the crime scene, eyes scanning with weary familiarity.',
        end_frame_instruction: null,
        dialogue_segment: null,
      },
      {
        shot_number: 2,
        shot_duration_seconds: 8,
        is_first_shot: false,
        shot_type: 'Medium to close-up',
        composition_instruction: 'Detective crouching at crime scene, examining evidence, police lights on his face',
        action_prompt: 'Detective crouches down at the crime scene. His gloved hand reaches for a rain-soaked photograph on the wet ground. He lifts it carefully, police lights painting his weathered face in alternating red and blue. His eyes narrow - recognition, or perhaps resignation. He stands slowly, photograph in hand, staring into the rain-soaked night.',
        end_frame_instruction: 'Detective stands up, photograph in hand, looking off into the rain',
        dialogue_segment: null,
      },
    ],

    // Visual mood (inferred from noir setting)
    visual_mood: {
      lighting: 'Low-key noir lighting, harsh shadows, neon accents, police light reflections',
      color_palette: 'Deep blues, blacks, red and blue police lights, neon greens and pinks',
      atmosphere: 'Rain-soaked noir, oppressive, melancholic, urban decay',
      composition: 'Dutch angles, deep shadows, wet surfaces reflecting light',
    },

    // Composition instructions for image generation
    composition_instruction: 'Film noir style, rain-soaked urban alley, dramatic shadows, neon reflections in puddles',
    composition_instruction_seedream: 'Cinematic film noir, heavy rain, urban alley at night, neon signs, police lights, dramatic low-key lighting, wet surfaces reflecting light',
    composition_instruction_nano_banana: 'Hyper-realistic noir scene, torrential rain, dark alley, fedora-wearing detective silhouette, red and blue police lights, neon reflections',

    // Visual atmosphere
    visual_atmosphere: 'Dark noir atmosphere with rain creating a curtain of water, neon lights bleeding colors into wet surfaces, isolated pools of light in overwhelming darkness',
  };

  // Update the scene
  await db.update(scenes)
    .set({
      raw_scene_data: updatedRawData,
      action_text: 'Detective arrives at rain-soaked crime scene and examines evidence',
      updated_at: new Date(),
    })
    .where(eq(scenes.id, sceneId));

  console.log('✅ Scene 1 updated with action descriptions and shots!');
  console.log('');
  console.log('=== UPDATED RAW DATA ===');
  console.log(JSON.stringify(updatedRawData, null, 2));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
