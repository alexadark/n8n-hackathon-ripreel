import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(__dirname, "../.env.local") });

import { db } from "../lib/drizzle/db";
import { projects, scenes } from "../lib/drizzle/schema";
import { eq, desc } from "drizzle-orm";

// Your scenes data from the previous generation
const scenesData = [
  {
    scene_number: 1,
    slugline: "EXT. CRIME SCENE - NIGHT",
    location_ref: "Urban Street Crime Scene",
    time_of_day: "NIGHT",
    characters_present: ["DETECTIVE ELIAS VANE"],
    key_props: [
      "yellow police tape",
      "body on wet asphalt",
      "shattered high-end laptop",
      "small silver USB drive",
      "police cruiser (distant, flashing lights)",
      "rain-soaked pavement"
    ],
    action_summary: "In heavy rain at a cordoned-off street crime scene, Detective Elias Vane ducks under the tape, ignores the corpse, and retrieves a silver USB drive from a puddle beside a shattered laptop as his cynical voice-over plays.",
    shot_type: "Low Angle",
    composition_instruction: "Place the camera low to the wet asphalt, lens just above a rain-filled puddle. The silver USB drive is in razor-sharp focus in the foreground, catching the amber sodium vapor reflection. In the blurred background, suggest Vane's crouched silhouette and out-of-focus yellow police tape and cruiser lights. Emphasize the glistening wet surface and falling rain; do not show Vane's mouth (voice-over only).",
    visual_atmosphere: {
      lighting: "High-contrast chiaroscuro lit primarily by sickly amber sodium vapor streetlights, with faint, desaturated police red/blue flicker reflecting in the puddles. Strong backlight from streetlamps rim-lighting rain and the USB, deep shadows around the body.",
      palette: "Restricted to sodium vapor ambers, dirty yellow highlights on rain and tape, and deep onyx blacks in the background. Any police light color is desaturated and subdued, avoiding bright blues or reds."
    },
    audio_requirements: {
      sfx: "Intense rainfall hitting asphalt and plastic tape, distant police radio chatter, muted siren wail, squelchy footsteps as Vane moves, subtle drip echoes in the street canyon.",
      music: "Low, brooding electronic drones with sparse bass pulses, building a sense of dread without melody; keep it minimal under the voice-over."
    }
  },
  {
    scene_number: 2,
    slugline: "INT. ALL-NIGHT DINER - NIGHT",
    location_ref: "All-Night Diner Booth",
    time_of_day: "NIGHT",
    characters_present: ["DETECTIVE ELIAS VANE", "LENA"],
    key_props: [
      "small silver USB drive",
      "Formica table",
      "steamed-up diner windows",
      "Lena's red leather jacket",
      "fluorescent ceiling lights"
    ],
    action_summary: "In a harshly lit, nearly empty all-night diner, Vane sits opposite Lena and slides the silver USB drive across the table. Lena, terrified, reveals it contains a kill list with Vane's name at the top; he responds with a dry, cynical smirk.",
    shot_type: "Over-the-Shoulder",
    composition_instruction: "Frame over Vane's shoulder, focusing tightly on Lena's face as she reacts in fear. The USB drive rests on the Formica table in the lower foreground, slightly out of focus, while Lena's eyes and mouth are sharp and clearly readable for dialogue. Vane appears only as a blurred shoulder and side of head silhouette; avoid a full two-shot. Introduce a subtle Dutch tilt to the horizon line to increase unease, with steamed windows and cold fluorescents in the background.",
    visual_atmosphere: {
      lighting: "Harsh, buzzing overhead fluorescent light casting sickly greenish tones and hard shadows under eyes and cheekbones. Minimal fill, with the background falling into deep shadow beyond the booth. Light reflects off the slightly greasy table and fogged glass.",
      palette: "Cold fluorescent greens dominating skin tones and highlights, with muted amber reflections from outside streetlights in the steamed windows, all set against wet onyx blacks in the diner background. Lena's jacket is a deep, desaturated red treated as a dark accent rather than a bright color."
    },
    audio_requirements: {
      sfx: "Low diner ambience: distant frying hiss, faint clatter of dishes, soft refrigerator hum, occasional car passing in the rain outside. Subtle fluorescent light buzz.",
      music: "Tense, minimalist synth underscoring with slowly rising pads and a faint rhythmic pulse that tightens during Lena's line about the kill list, then briefly holds on Vane's smirk."
    }
  },
  {
    scene_number: 3,
    slugline: "INT. VANE'S APARTMENT - LATER",
    location_ref: "Vane's Apartment - Desk Area",
    time_of_day: "LATER (NIGHT)",
    characters_present: ["DETECTIVE ELIAS VANE"],
    key_props: [
      "small silver USB drive",
      "desktop computer",
      "monitor displaying warning bar",
      "keyboard and mouse",
      "Venetian blinds",
      "revolver"
    ],
    action_summary: "In Vane's dark, claustrophobic apartment, lit only by streetlight seeping through blinds and his computer screen, he plugs in the USB. Files begin to erase as a red warning bar announces a trace in progress. He curses, slams the desk, and grabs his revolver.",
    shot_type: "Over-the-Shoulder",
    composition_instruction: "Shoot from slightly low and behind Vane, over his shoulder, with the monitor dominating the frame. The screen text—deleting file lists and a bold warning bar reading \"UNAUTHORIZED ACCESS. TRACING LOCATION...\" —must be sharp and legible. Vane's head and shoulder are in partial silhouette at the edge of frame, cut off so his mouth is not the focus. Venetian blind shadows streak across his profile and desk. The rest of the room falls into deep shadow; no wide view of the apartment.",
    visual_atmosphere: {
      lighting: "Moody, low-key setup with slashes of amber streetlight through Venetian blinds creating hard stripes on walls and Vane, mixed with a cold, slightly green-tinted computer monitor glow as the key light on his face and hands. Strong contrast between the illuminated screen and surrounding darkness.",
      palette: "Deep onyx blacks dominating the room, with narrow bands of sodium vapor amber from the window and a desaturated, cold monitor hue leaning toward green rather than bright blue. Overall palette remains limited and subdued, emphasizing contrast over color variety."
    },
    audio_requirements: {
      sfx: "Soft computer fan whir, rapid keyboard clicks, subtle electronic beeps as files delete, the distinct chime or alarm when the warning appears, Vane's fist hitting the desk with a dull thud, faint city noise filtered through rain-streaked windows.",
      music: "A tense, pulsing electronic bed with stuttering pulses that accelerate as the trace begins, then drop to a low ominous drone when Vane grabs the revolver."
    }
  },
  {
    scene_number: 4,
    slugline: "EXT. ROOFTOP - NIGHT",
    location_ref: "City Rooftop Edge",
    time_of_day: "NIGHT",
    characters_present: ["DETECTIVE ELIAS VANE"],
    key_props: [
      "rooftop access door",
      "wet rooftop surface",
      "city skyline with sodium vapor street grid",
      "black helicopter",
      "helicopter searchlight",
      "mist and rain"
    ],
    action_summary: "Vane bursts onto a misty rooftop and runs to the edge, overlooking a grid of orange-lit streets and deep black voids. A sleek, silent black helicopter rises from the darkness, its blinding searchlight locking onto him. Vane shields his eyes as the rotor thunder grows and his voice-over reflects on the danger of truth.",
    shot_type: "Low Angle",
    composition_instruction: "Position the camera low on the slick rooftop surface, angled up toward Vane near the edge. Frame him from mid-torso up, silhouetted against the helicopter's blinding searchlight beam as he raises a hand to shield his eyes. The helicopter and its cone of light loom in the upper background, with the city's sodium grid rendered as soft bokeh below. Emphasize the mist, backlit raindrops, and strong contrast; avoid a wide running shot and focus on the static confrontation moment.",
    visual_atmosphere: {
      lighting: "Intense, focused searchlight from the helicopter as the primary backlight, creating a stark halo and hard-edged silhouette around Vane and the rising mist. Supplement with distant, low-level sodium vapor city glow from below, leaving the rest of the rooftop in near-black shadow.",
      palette: "Dominant onyx blacks in sky and rooftop, with hazy amber and dirty yellow glows from the city grid. The searchlight is a harsh, neutral white edged slightly toward cool, cutting through grey mist without introducing bright blues or other saturated colors."
    },
    audio_requirements: {
      sfx: "Helicopter rotor blades ramping from distant thrum to overpowering roar, wind whipped by the rotors, rain hitting metal and concrete, distant city hum far below, Vane's footsteps splashing then stopping near the edge.",
      music: "Dark, escalating synth score with rising tension and low brass-like pads, swelling under the rotor sound and Vane's voice-over, then holding on an unresolved sustained note as the scene cuts to black."
    }
  }
];

async function insertScenes(): Promise<void> {
  console.log("🎬 Inserting scenes from previous generation...\n");

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

  console.log(`📁 Project: "${latestProject.title}" (${latestProject.id})\n`);

  // Check if scenes already exist
  const existingScenes = await db
    .select()
    .from(scenes)
    .where(eq(scenes.project_id, latestProject.id));

  if (existingScenes.length > 0) {
    console.log(`⚠️ Project already has ${existingScenes.length} scenes.`);
    console.log("   Delete them first if you want to re-insert.");
    return;
  }

  // Insert scenes
  const sceneRecords = scenesData.map((scene) => ({
    project_id: latestProject.id,
    scene_number: scene.scene_number,
    slugline: scene.slugline,
    action_text: scene.action_summary || "",
    characters: scene.characters_present || [],
    validation_status: "pending" as const,
    full_data: {
      scene_number: scene.scene_number,
      slugline: scene.slugline,
      location: scene.location_ref,
      interior_exterior: scene.slugline.includes("INT.") ? "INT" as const : "EXT" as const,
      time_of_day: scene.time_of_day,
      duration_estimate: 30, // Default duration
      action_summary: scene.action_summary,
      characters_present: scene.characters_present.map((name) => ({
        name,
        role: name === "DETECTIVE ELIAS VANE" ? "lead" as const : "supporting" as const,
        actions: [],
        emotional_state: "",
      })),
      props_and_materials: scene.key_props?.map((item) => ({
        item,
        importance: "medium" as const,
        visual_note: "",
      })) || [],
      dialogue_snippet: "none",
      visual_mood: {
        lighting: scene.visual_atmosphere.lighting,
        color_palette: scene.visual_atmosphere.palette,
        composition: scene.composition_instruction,
        atmosphere: scene.visual_atmosphere.palette,
      },
      visual_atmosphere: `${scene.visual_atmosphere.lighting} ${scene.visual_atmosphere.palette}`,
      shot_type: scene.shot_type,
      composition_instruction: scene.composition_instruction,
      audio_requirements: {
        ambient: [],
        sfx: scene.audio_requirements.sfx.split(", "),
        music_mood: scene.audio_requirements.music,
        dialogue_tone: "",
      },
      image_generation_prompt: "",
      production_notes: "",
    },
    raw_scene_data: {
      scene_number: scene.scene_number,
      slugline: scene.slugline,
      time_of_day: scene.time_of_day,
      interior_exterior: scene.slugline.includes("INT.") ? "INT" as const : "EXT" as const,
      location: scene.location_ref,
      characters_present: scene.characters_present,
      props_used: scene.key_props,
      action_summary: scene.action_summary,
      shot_type: scene.shot_type,
      composition_instruction: scene.composition_instruction,
      visual_atmosphere: `${scene.visual_atmosphere.lighting} ${scene.visual_atmosphere.palette}`,
      visual_mood: {
        lighting: scene.visual_atmosphere.lighting,
        color_palette: scene.visual_atmosphere.palette,
        composition: scene.composition_instruction,
        atmosphere: scene.visual_atmosphere.palette,
      },
      audio_requirements: {
        sfx: scene.audio_requirements.sfx,
        music_mood: scene.audio_requirements.music,
      },
    },
  }));

  await db.insert(scenes).values(sceneRecords);

  console.log(`✅ Successfully inserted ${sceneRecords.length} scenes!`);
  console.log(`\n   View them at: /projects/${latestProject.id}/scenes`);
  console.log(`   Or continue Bible review at: /projects/${latestProject.id}/bible`);

  process.exit(0);
}

insertScenes().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
