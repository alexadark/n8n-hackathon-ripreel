import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { scene_shots } from './scene_shots';
import type { InferSelectModel } from 'drizzle-orm';

/**
 * Shot Image Variants Table
 *
 * Stores multiple AI-generated image options for each shot's start frame.
 * Users can generate images with different models (Seedream 4.5, Nano Banana Pro)
 * and select the best variant for each shot.
 *
 * This enables per-shot image generation instead of per-scene,
 * allowing each shot to start with a unique image (different camera angles,
 * character positions, etc.) for better Veo 3 video generation.
 *
 * Bible elements (characters, locations, props) are automatically injected
 * into the generation prompt based on the parent scene's data.
 */
export const shotImageVariants = pgTable(
  'shot_image_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Shot reference
    shot_id: uuid('shot_id')
      .notNull()
      .references(() => scene_shots.id, { onDelete: 'cascade' }),

    // Image data
    image_url: text('image_url').notNull().default(''),
    storage_path: text('storage_path').notNull().default(''),
    model: text('model').notNull(), // seedream-4.5-image-to-image, nano-banana-pro-image-to-image
    prompt: text('prompt'), // Full prompt with Bible injection

    // Bible element tracking (IDs of injected elements)
    injected_characters: jsonb('injected_characters').$type<string[]>(),
    injected_locations: jsonb('injected_locations').$type<string[]>(),
    injected_props: jsonb('injected_props').$type<string[]>(),

    // Status tracking
    status: text('status', {
      enum: ['generating', 'ready', 'failed', 'selected'],
    })
      .notNull()
      .default('generating'),
    is_selected: boolean('is_selected').default(false).notNull(),

    // Refinement tracking (for image-to-image iterations)
    parent_variant_id: uuid('parent_variant_id'),

    // Metadata
    generation_order: integer('generation_order').default(0),
    n8n_job_id: text('n8n_job_id'),
    error_message: text('error_message'),

    // Timestamps
    created_at: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('shot_image_variant_shot_id_idx').on(t.shot_id),
    index('shot_image_variant_status_idx').on(t.status),
    index('shot_image_variant_is_selected_idx').on(t.is_selected),
  ]
);

// Export types for TypeScript
export type ShotImageVariant = InferSelectModel<typeof shotImageVariants>;
export type NewShotImageVariant = typeof shotImageVariants.$inferInsert;
