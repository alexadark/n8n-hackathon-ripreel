import type { StyleConfig, VisualStyle } from "@/lib/drizzle/schema";

/**
 * Re-export types from schema for convenience
 */
export type { StyleConfig, VisualStyle };

/**
 * System style slugs - the 3 predefined styles
 */
export type SystemStyleSlug = "classic-noir" | "70s-crime-drama" | "almodovar";

/**
 * Style selection for project creation
 */
export interface StyleSelection {
  type: "system" | "custom" | "custom-unsaved";
  styleId?: string; // For system or saved custom styles
  customConfig?: StyleConfig; // For unsaved custom styles
}

/**
 * Style preview card data for UI
 */
export interface StylePreviewData {
  id: string;
  slug: string;
  name: string;
  description: string;
  isSystem: boolean;
  previewImageUrl?: string;
}

/**
 * System styles with full configuration
 * These are seeded into the database on migration
 */
export const SYSTEM_STYLES: Record<SystemStyleSlug, Omit<VisualStyle, "id" | "created_at" | "updated_at">> = {
  "classic-noir": {
    slug: "classic-noir",
    name: "Classic Film Noir",
    description: "Black & white, high contrast, shadows, fatalistic mood",
    is_system: true,
    preview_image_url: null,
    style_config: {
      film_stock_prefix:
        "Black and white 35mm Kodak Double-X 5222 photograph, silver gelatin print, visible film grain, high contrast",
      composition_rules:
        "dutch angles for tension, low camera angles shooting upward, deep focus",
      lighting_style:
        "single-source hard key lighting from 45 degrees, extreme chiaroscuro with 60-70% of frame in shadow",
      color_palette:
        "pure monochromatic black and white, no color whatsoever, crushed pure blacks, blown-out white highlights",
      neutral_background: "pure black or dark grey gradient, no detail visible",
      atmosphere_keywords:
        "fatalistic cynical paranoid, morally ambiguous, urban isolation, existential dread",
      texture_keywords:
        "silver gelatin print texture, visible film grain structure, orthochromatic skin rendering",
      character_pose_style:
        "subject angled three-quarter view, world-weary expression, cigarette optional",
      location_style:
        "wet pavement reflecting light, rain on windows, cigarette smoke and fog diffusing light beams",
      prop_style:
        "product photography high contrast black and white, hard dramatic side lighting",
      camera_movement_style:
        "slow deliberate dolly movements, occasional dutch angle, tracking through fog",
      default_camera_angles:
        "low angle for power, high angle for vulnerability, dutch angle for unease",
      veo_color_grade:
        "pure black and white, crushed blacks, high contrast, silver gelatin look",
      veo_style_reference:
        "classic film noir, Double Indemnity, The Maltese Falcon, Touch of Evil",
      music_style:
        "slow jazz piano, melancholic saxophone, sparse upright bass, smoky atmosphere",
      narrator_style:
        "male voice low and gravelly, world-weary cynical delivery, hardboiled detective monologue",
      default_ambient:
        "rain on windows, distant thunder, city traffic far below, clock ticking",
    },
  },
  "70s-crime-drama": {
    slug: "70s-crime-drama",
    name: "The Godfather Style",
    description: "Warm amber, low-key lighting, operatic tragedy, 1970s New Hollywood",
    is_system: true,
    preview_image_url: null,
    style_config: {
      film_stock_prefix:
        "35mm Kodak 5254 tungsten film photograph, warm amber color temperature, heavy visible grain",
      composition_rules:
        "intimate close-ups on long telephoto lenses, shallow depth of field isolating subjects",
      lighting_style:
        "Gordon Willis extreme low-key lighting, faces 70-80% in shadow with eyes barely visible",
      color_palette:
        "strictly warm earth tones: deep amber, tobacco brown, burnt umber, olive gold, mahogany",
      neutral_background:
        "dark brown or deep amber gradient, impenetrable shadow",
      atmosphere_keywords:
        "operatic tragedy, corrupt power, family loyalty and betrayal, inevitable doom",
      texture_keywords:
        "heavy visible film grain, warm color cast throughout, soft halation on highlights",
      character_pose_style:
        "subject looking down or aside, contemplative heavy expression, eyes barely visible in shadow",
      location_style:
        "wood-paneled offices, leather furniture, dark wallpaper, heavy curtains",
      prop_style:
        "product photography warm amber lighting, tobacco and mahogany tones, aged patina",
      camera_movement_style:
        "slow deliberate movements, long takes, slow zoom-ins on faces, patient pace",
      default_camera_angles:
        "eye level for conversations, overhead for meetings, low angle for power",
      veo_color_grade:
        "deep amber and warm brown, heavy shadows, rich blacks, tobacco filter look",
      veo_style_reference:
        "The Godfather, Gordon Willis cinematography, 1970s New Hollywood",
      music_style:
        "Nino Rota style, solo trumpet, melancholic Italian melody, orchestral swells",
      narrator_style:
        "male voice measured and grave, Italian-American cadence, weight of family history",
      default_ambient:
        "heavy silence, clock ticking, distant city sounds, leather creaking",
    },
  },
  almodovar: {
    slug: "almodovar",
    name: "Almodovar",
    description: "Bold primary colors, melodrama, intimate close-ups, Spanish sensibility",
    is_system: true,
    preview_image_url: null,
    style_config: {
      film_stock_prefix:
        "35mm Kodak Vision3 500T photograph, vibrant saturated colors, rich skin tones, slight diffusion",
      composition_rules:
        "intimate close-ups on faces, shallow depth of field, theatrical framing, faces filling frame",
      lighting_style:
        "colored practical lighting with red and blue gels, warm tungsten key light, dramatic but flattering",
      color_palette:
        "bold saturated primary colors: deep crimson red, electric blue, sunflower yellow, emerald green, fuchsia pink",
      neutral_background:
        "rich colored backdrop, deep red or electric blue or warm interior",
      atmosphere_keywords:
        "melodramatic passionate intense, baroque theatrical, Spanish sensibility, emotional extremes",
      texture_keywords:
        "rich saturated colors, soft diffused skin tones, slight halation on highlights, warm color cast",
      character_pose_style:
        "subject in intimate close-up, emotional expressive face, eyes glistening, dramatic makeup",
      location_style:
        "colorful Spanish interiors, bold wallpaper patterns, kitsch decor, religious iconography",
      prop_style:
        "product photography bold saturated colors, red background, theatrical lighting",
      camera_movement_style:
        "slow deliberate push-ins on faces, gentle tracking shots, intimate dolly movements",
      default_camera_angles:
        "eye level for intimacy, extreme close-ups for emotion, medium shots for dialogue",
      veo_color_grade:
        "saturated bold colors, warm skin tones, rich reds and blues, slight diffusion",
      veo_style_reference:
        "Pedro Almodovar films, All About My Mother, Volver, Talk to Her",
      music_style:
        "Alberto Iglesias style, Spanish guitar, melancholic strings, passionate crescendos",
      narrator_style:
        "female voice warm and emotional, Spanish-inflected cadence, intimate confessional tone",
      default_ambient:
        "Spanish street sounds, distant flamenco guitar, clock ticking, soft crying",
    },
  },
};

/**
 * Get empty style config template for custom style creation
 */
export function getEmptyStyleConfig(): StyleConfig {
  return {
    film_stock_prefix: "",
    composition_rules: "",
    lighting_style: "",
    color_palette: "",
    neutral_background: "",
    atmosphere_keywords: "",
    texture_keywords: "",
    character_pose_style: "",
    location_style: "",
    prop_style: "",
    camera_movement_style: "",
    default_camera_angles: "",
    veo_color_grade: "",
    veo_style_reference: "",
    music_style: "",
    narrator_style: "",
    default_ambient: "",
  };
}

/**
 * Style config field groups for the custom form UI
 */
export const STYLE_CONFIG_GROUPS = {
  basic: {
    label: "Basic Settings",
    fields: [
      { key: "film_stock_prefix", label: "Film Stock / Camera" },
      { key: "composition_rules", label: "Composition Rules" },
      { key: "lighting_style", label: "Lighting Style" },
      { key: "color_palette", label: "Color Palette" },
      { key: "atmosphere_keywords", label: "Atmosphere / Mood" },
      { key: "texture_keywords", label: "Texture / Grain" },
    ],
  },
  characterLocation: {
    label: "Character & Location",
    fields: [
      { key: "neutral_background", label: "Background Style" },
      { key: "character_pose_style", label: "Character Pose Style" },
      { key: "location_style", label: "Location Style" },
      { key: "prop_style", label: "Prop Style" },
    ],
  },
  videoAudio: {
    label: "Video & Audio",
    fields: [
      { key: "camera_movement_style", label: "Camera Movement" },
      { key: "default_camera_angles", label: "Default Camera Angles" },
      { key: "veo_color_grade", label: "Video Color Grade" },
      { key: "veo_style_reference", label: "Style Reference Films" },
      { key: "music_style", label: "Music Style" },
      { key: "narrator_style", label: "Narrator Voice Style" },
      { key: "default_ambient", label: "Default Ambient Sound" },
    ],
  },
} as const;

export type StyleConfigFieldKey = keyof StyleConfig;
