import { pgEnum } from 'drizzle-orm/pg-core';

// Project workflow status tracking
export const projectStatusEnum = pgEnum('project_status', [
  'parsing',
  'bible_review',
  'scene_validation',
  'asset_generation',
  'timeline_review',
  'final_review',
  'assembling',
  'completed',
  'failed',
]);

// NOTE: visual_style is now a text column, not an enum
// This allows dynamic styles without migration constraints
// See: 0018_convert_visual_style_to_text.sql

// Prop generation method (from n8n workflow)
export const propGenerationMethodEnum = pgEnum('prop_generation_method', [
  'GENERATE',
  'DESCRIBE',
]);

// Scene validation status (HITL Checkpoint #1)
export const sceneValidationStatusEnum = pgEnum('scene_validation_status', [
  'pending',
  'approved',
  'rejected',
]);

// Image generation method (2 flexible methods)
export const imageGenerationMethodEnum = pgEnum('image_generation_method', [
  'auto_generate',
  'upload',
]);

// Asset generation status (images, videos, audio)
export const assetStatusEnum = pgEnum('asset_status', [
  'generating',
  'ready',
  'approved',
  'failed',
]);

// Bible asset status (characters, locations, props)
export const bibleAssetStatusEnum = pgEnum('bible_asset_status', [
  'pending',
  'generating',
  'ready',
  'approved',
  'failed',
]);

// Character role in the production
export const characterRoleEnum = pgEnum('character_role', [
  'lead',
  'supporting',
  'background',
]);

// Character tier for Bible inclusion (from n8n character classification)
// main: Full Bible (3 shots) - protagonist/antagonist, 3+ scenes, significant dialogue
// supporting: Bible (portrait only) - named with dialogue, 2+ scenes
// extra: NO Bible - guards, dead bodies, passersby → inline description in scenes
export const characterTierEnum = pgEnum('character_tier', [
  'main',
  'supporting',
  'extra',
]);

// Prop importance level
export const propImportanceEnum = pgEnum('prop_importance', [
  'high',
  'medium',
  'low',
]);

// Location type
export const locationTypeEnum = pgEnum('location_type', [
  'interior',
  'exterior',
]);

// Audio track types (3 tracks per scene)
export const audioTypeEnum = pgEnum('audio_type', [
  'voiceover',
  'sfx',
  'music',
]);

// Final reel assembly status
export const reelStatusEnum = pgEnum('reel_status', [
  'assembling',
  'uploading', // Uploading assembled video to Supabase storage
  'ready',
  'failed',
]);
