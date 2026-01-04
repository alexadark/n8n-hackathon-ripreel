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
import { scenes } from './scenes';
import type { InferSelectModel } from 'drizzle-orm';

/**
 * Scene Image Variants Table
 *
 * Stores multiple AI-generated image options for each scene.
 * Users can generate images with different models (Seedream 4.5, Nano Banana Pro)
 * and select the best variant.
 *
 * Bible elements (characters, locations, props) are automatically injected
 * into the generation prompt based on the scene's raw_scene_data.
 */
export const sceneImageVariants = pgTable(
  'scene_image_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Scene reference
    scene_id: uuid('scene_id')
      .notNull()
      .references(() => scenes.id, { onDelete: 'cascade' }),

    // Image data
    image_url: text('image_url').notNull().default(''),
    storage_path: text('storage_path').notNull().default(''),
    model: text('model').notNull(), // seedream-4.5-text-to-image, nano-banana-pro-text-to-image
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
    index('scene_image_variant_scene_id_idx').on(t.scene_id),
    index('scene_image_variant_status_idx').on(t.status),
    index('scene_image_variant_is_selected_idx').on(t.is_selected),
  ]
);

// Export types for TypeScript
export type SceneImageVariant = InferSelectModel<typeof sceneImageVariants>;
export type NewSceneImageVariant = typeof sceneImageVariants.$inferInsert;
