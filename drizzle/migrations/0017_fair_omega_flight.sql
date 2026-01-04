-- Custom SQL migration: Add visual_styles table and update projects FK
-- This migrates from enum-based visual_style to a proper FK relationship

-- Step 1: Create visual_styles table
CREATE TABLE IF NOT EXISTS "visual_styles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "is_system" boolean NOT NULL DEFAULT false,
  "style_config" jsonb NOT NULL,
  "preview_image_url" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Step 2: Seed system styles (3 predefined styles)
INSERT INTO "visual_styles" ("slug", "name", "description", "is_system", "style_config") VALUES
  ('classic-noir', 'Classic Film Noir', 'Black & white, high contrast, shadows, fatalistic mood', true, '{
    "film_stock_prefix": "Black and white 35mm Kodak Double-X 5222 photograph, silver gelatin print, visible film grain, high contrast",
    "composition_rules": "dutch angles for tension, low camera angles shooting upward, deep focus",
    "lighting_style": "single-source hard key lighting from 45 degrees, extreme chiaroscuro with 60-70% of frame in shadow",
    "color_palette": "pure monochromatic black and white, no color whatsoever, crushed pure blacks, blown-out white highlights",
    "neutral_background": "pure black or dark grey gradient, no detail visible",
    "atmosphere_keywords": "fatalistic cynical paranoid, morally ambiguous, urban isolation, existential dread",
    "texture_keywords": "silver gelatin print texture, visible film grain structure, orthochromatic skin rendering",
    "character_pose_style": "subject angled three-quarter view, world-weary expression, cigarette optional",
    "location_style": "wet pavement reflecting light, rain on windows, cigarette smoke and fog diffusing light beams",
    "prop_style": "product photography high contrast black and white, hard dramatic side lighting",
    "camera_movement_style": "slow deliberate dolly movements, occasional dutch angle, tracking through fog",
    "default_camera_angles": "low angle for power, high angle for vulnerability, dutch angle for unease",
    "veo_color_grade": "pure black and white, crushed blacks, high contrast, silver gelatin look",
    "veo_style_reference": "classic film noir, Double Indemnity, The Maltese Falcon, Touch of Evil",
    "music_style": "slow jazz piano, melancholic saxophone, sparse upright bass, smoky atmosphere",
    "narrator_style": "male voice low and gravelly, world-weary cynical delivery, hardboiled detective monologue",
    "default_ambient": "rain on windows, distant thunder, city traffic far below, clock ticking"
  }'::jsonb),
  ('70s-crime-drama', 'The Godfather Style', 'Warm amber, low-key lighting, operatic tragedy, 1970s New Hollywood', true, '{
    "film_stock_prefix": "35mm Kodak 5254 tungsten film photograph, warm amber color temperature, heavy visible grain",
    "composition_rules": "intimate close-ups on long telephoto lenses, shallow depth of field isolating subjects",
    "lighting_style": "Gordon Willis extreme low-key lighting, faces 70-80% in shadow with eyes barely visible",
    "color_palette": "strictly warm earth tones: deep amber, tobacco brown, burnt umber, olive gold, mahogany",
    "neutral_background": "dark brown or deep amber gradient, impenetrable shadow",
    "atmosphere_keywords": "operatic tragedy, corrupt power, family loyalty and betrayal, inevitable doom",
    "texture_keywords": "heavy visible film grain, warm color cast throughout, soft halation on highlights",
    "character_pose_style": "subject looking down or aside, contemplative heavy expression, eyes barely visible in shadow",
    "location_style": "wood-paneled offices, leather furniture, dark wallpaper, heavy curtains",
    "prop_style": "product photography warm amber lighting, tobacco and mahogany tones, aged patina",
    "camera_movement_style": "slow deliberate movements, long takes, slow zoom-ins on faces, patient pace",
    "default_camera_angles": "eye level for conversations, overhead for meetings, low angle for power",
    "veo_color_grade": "deep amber and warm brown, heavy shadows, rich blacks, tobacco filter look",
    "veo_style_reference": "The Godfather, Gordon Willis cinematography, 1970s New Hollywood",
    "music_style": "Nino Rota style, solo trumpet, melancholic Italian melody, orchestral swells",
    "narrator_style": "male voice measured and grave, Italian-American cadence, weight of family history",
    "default_ambient": "heavy silence, clock ticking, distant city sounds, leather creaking"
  }'::jsonb),
  ('almodovar', 'Almodovar', 'Bold primary colors, melodrama, intimate close-ups, Spanish sensibility', true, '{
    "film_stock_prefix": "35mm Kodak Vision3 500T photograph, vibrant saturated colors, rich skin tones, slight diffusion",
    "composition_rules": "intimate close-ups on faces, shallow depth of field, theatrical framing, faces filling frame",
    "lighting_style": "colored practical lighting with red and blue gels, warm tungsten key light, dramatic but flattering",
    "color_palette": "bold saturated primary colors: deep crimson red, electric blue, sunflower yellow, emerald green, fuchsia pink",
    "neutral_background": "rich colored backdrop, deep red or electric blue or warm interior",
    "atmosphere_keywords": "melodramatic passionate intense, baroque theatrical, Spanish sensibility, emotional extremes",
    "texture_keywords": "rich saturated colors, soft diffused skin tones, slight halation on highlights, warm color cast",
    "character_pose_style": "subject in intimate close-up, emotional expressive face, eyes glistening, dramatic makeup",
    "location_style": "colorful Spanish interiors, bold wallpaper patterns, kitsch decor, religious iconography",
    "prop_style": "product photography bold saturated colors, red background, theatrical lighting",
    "camera_movement_style": "slow deliberate push-ins on faces, gentle tracking shots, intimate dolly movements",
    "default_camera_angles": "eye level for intimacy, extreme close-ups for emotion, medium shots for dialogue",
    "veo_color_grade": "saturated bold colors, warm skin tones, rich reds and blues, slight diffusion",
    "veo_style_reference": "Pedro Almodovar films, All About My Mother, Volver, Talk to Her",
    "music_style": "Alberto Iglesias style, Spanish guitar, melancholic strings, passionate crescendos",
    "narrator_style": "female voice warm and emotional, Spanish-inflected cadence, intimate confessional tone",
    "default_ambient": "Spanish street sounds, distant flamenco guitar, clock ticking, soft crying"
  }'::jsonb)
ON CONFLICT ("slug") DO NOTHING;

-- Step 3: Add visual_style_id column to projects (nullable first for migration)
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "visual_style_id" uuid;

-- Step 4: Migrate existing projects by mapping old enum to new FK
-- Map 'wes-anderson' to 'almodovar' (closest match), others map directly
UPDATE "projects"
SET "visual_style_id" = (
  SELECT "id" FROM "visual_styles" WHERE "slug" =
    CASE
      WHEN "projects"."visual_style" = 'wes-anderson' THEN 'almodovar'
      ELSE "projects"."visual_style"::text
    END
)
WHERE "visual_style_id" IS NULL;

-- Step 5: Add FK constraint
ALTER TABLE "projects"
ADD CONSTRAINT "projects_visual_style_id_fkey"
FOREIGN KEY ("visual_style_id") REFERENCES "visual_styles"("id");

-- Step 6: Make visual_style_id NOT NULL after migration
-- Note: Only do this if all projects have been migrated
-- ALTER TABLE "projects" ALTER COLUMN "visual_style_id" SET NOT NULL;

-- Step 7: Create index on visual_style_id
CREATE INDEX IF NOT EXISTS "projects_visual_style_id_idx" ON "projects" ("visual_style_id");

-- Note: We keep the old visual_style column for now to ensure backward compatibility
-- Once confirmed working, run: ALTER TABLE "projects" DROP COLUMN "visual_style";
