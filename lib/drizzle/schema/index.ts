// Schema exports - all database schemas are exported from here
// This file is needed for the database connection setup

// Film production workflow schemas
export * from "./enums";
export * from "./visual-styles";
export * from "./projects";
export * from "./scenes";
export * from "./scene_images";
export * from "./scene_image_variants";
export * from "./scene_videos";
export * from "./scene_shots";
export * from "./shot_image_variants";
export * from "./scene_audio";
export * from "./final_reels";
export * from "./share_links";

// Bible assets (characters, locations, props)
export * from "./project_characters";
export * from "./project_locations";
export * from "./project_props";
export * from "./bible_image_variants";

// Type exports for convenience
export type { Project, NewProject } from "./projects";
export type { Scene, NewScene, RawSceneData, SceneData, ShotData, InlineCharacter, VideoPromptVeo3 } from "./scenes";
export type { SceneImage, NewSceneImage } from "./scene_images";
export type { SceneImageVariant, NewSceneImageVariant } from "./scene_image_variants";
export type { SceneVideo, NewSceneVideo } from "./scene_videos";
export type { SceneShot, NewSceneShot, Veo3PromptData } from "./scene_shots";
export type { ShotImageVariant, NewShotImageVariant } from "./shot_image_variants";
export type { SceneAudio, NewSceneAudio } from "./scene_audio";
export type { FinalReel, NewFinalReel } from "./final_reels";
export type { ShareLink, NewShareLink } from "./share_links";

// Bible asset types
export type { ProjectCharacter, NewProjectCharacter, CharacterRawData } from "./project_characters";
export type { ProjectLocation, NewProjectLocation, LocationRawData, TimeVariants } from "./project_locations";
export type { ProjectProp, NewProjectProp, PropRawData } from "./project_props";
export type { BibleImageVariant, NewBibleImageVariant } from "./bible_image_variants";

// Visual styles
export type { VisualStyle, NewVisualStyle, StyleConfig } from "./visual-styles";
