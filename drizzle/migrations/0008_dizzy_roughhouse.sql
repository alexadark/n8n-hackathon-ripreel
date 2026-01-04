-- Create new enum for prop generation method
CREATE TYPE "public"."prop_generation_method" AS ENUM('GENERATE', 'DESCRIBE');--> statement-breakpoint

-- Convert visual_style column to text temporarily
ALTER TABLE "projects" ALTER COLUMN "visual_style" SET DATA TYPE text;--> statement-breakpoint

-- Map old visual styles to new ones
UPDATE "projects" SET "visual_style" = CASE
    WHEN "visual_style" = 'neo-noir' THEN 'classic-noir'
    WHEN "visual_style" = 'thriller' THEN 'classic-noir'
    WHEN "visual_style" = 'horror' THEN 'classic-noir'
    WHEN "visual_style" = 'drama' THEN '70s-crime-drama'
    WHEN "visual_style" = 'sci-fi' THEN 'wes-anderson'
    WHEN "visual_style" = 'comedy' THEN 'wes-anderson'
    WHEN "visual_style" = 'romance' THEN 'wes-anderson'
    ELSE 'wes-anderson'
END;--> statement-breakpoint

-- Drop old enum and create new one
DROP TYPE "public"."visual_style";--> statement-breakpoint
CREATE TYPE "public"."visual_style" AS ENUM('wes-anderson', 'classic-noir', '70s-crime-drama');--> statement-breakpoint

-- Set column back to enum type
ALTER TABLE "projects" ALTER COLUMN "visual_style" SET DATA TYPE "public"."visual_style" USING "visual_style"::"public"."visual_style";--> statement-breakpoint

-- Add new columns to project_props
ALTER TABLE "project_props" ADD COLUMN "generation_method" "prop_generation_method" DEFAULT 'GENERATE' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_props" ADD COLUMN "scale_reference" text;