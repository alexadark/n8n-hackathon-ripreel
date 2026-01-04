import { pgTable, text, uuid, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

/**
 * Bible Image Variants Table
 *
 * Stores multiple AI-generated image options for each Bible asset (characters, locations).
 * Users can generate images with different models and select the best variant.
 *
 * Polymorphic Design:
 * - asset_type: "character" | "location" (props deprecated for MVP)
 * - asset_id: References the ID in the respective table
 * - shot_type: Only used for characters, MVP uses "portrait" only (nullable for locations)
 */
export const bibleImageVariants = pgTable('bible_image_variants', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Polymorphic reference to asset
  asset_type: text('asset_type', {
    enum: ['character', 'location', 'prop'],
  }).notNull(),
  asset_id: uuid('asset_id').notNull(),

  // Shot type (only for characters)
  shot_type: text('shot_type', {
    enum: ['portrait', 'three_quarter', 'full_body'],
  }),

  // Image data
  image_url: text('image_url').notNull(),
  storage_path: text('storage_path').notNull(),
  model: text('model').notNull(), // AI model used: seedream-4.5-text-to-image, nano-banana-pro-text-to-image, etc.
  prompt: text('prompt'), // Generation prompt used

  // Status tracking
  status: text('status', {
    enum: ['generating', 'ready', 'failed', 'selected'],
  })
    .notNull()
    .default('generating'),
  is_selected: boolean('is_selected').default(false).notNull(), // The chosen variant

  // Metadata
  generation_order: integer('generation_order').default(0), // Order in batch (0, 1, 2...)
  n8n_job_id: text('n8n_job_id'), // n8n workflow execution ID (cleared on completion)
  error_message: text('error_message'),

  // Timestamps
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Export type for TypeScript
export type BibleImageVariant = typeof bibleImageVariants.$inferSelect;
export type NewBibleImageVariant = typeof bibleImageVariants.$inferInsert;
