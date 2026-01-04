import { pgTable, uuid, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

/**
 * StyleConfig interface - Full configuration for visual style
 * Used by n8n workflows for Bible and Scene generation
 */
export interface StyleConfig {
  // Bible generation
  film_stock_prefix: string;
  composition_rules: string;
  lighting_style: string;
  color_palette: string;
  neutral_background: string;
  atmosphere_keywords: string;
  texture_keywords: string;
  character_pose_style: string;
  location_style: string;
  prop_style: string;
  // Scene/Video generation
  camera_movement_style: string;
  default_camera_angles: string;
  veo_color_grade: string;
  veo_style_reference: string;
  music_style: string;
  narrator_style: string;
  default_ambient: string;
}

/**
 * Visual Styles table - Stores predefined and custom visual styles
 *
 * System styles (is_system = true): classic-noir, 70s-crime-drama, almodovar
 * User custom styles (is_system = false): saved and reusable per user
 */
export const visualStyles = pgTable("visual_styles", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(), // 'wes-anderson', 'my-custom-style'
  name: text("name").notNull(), // 'Wes Anderson', 'My Custom Style'
  description: text("description").notNull(),
  is_system: boolean("is_system").default(false).notNull(), // true for predefined
  style_config: jsonb("style_config").$type<StyleConfig>().notNull(),
  preview_image_url: text("preview_image_url"), // Optional preview thumbnail
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type VisualStyle = InferSelectModel<typeof visualStyles>;
export type NewVisualStyle = typeof visualStyles.$inferInsert;
