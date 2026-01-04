/**
 * AI Model Configuration for Bible Image Generation
 * Supports multiple providers: ByteDance, Google DeepMind, Black Forest Labs
 */

export type AIModel =
  | 'seedream-4.5-text-to-image'
  | 'seedream-4.5-image-to-image'
  | 'nano-banana-pro-text-to-image'
  | 'nano-banana-pro-image-to-image'
  | 'flux-2-text-to-image'
  | 'flux-2-image-to-image';

export type ModelType = 'text-to-image' | 'image-to-image';

export interface AIModelOption {
  value: AIModel;
  label: string;
  type: ModelType;
  description: string;
  provider: 'ByteDance' | 'Google DeepMind' | 'Black Forest Labs';
  aspectRatios: AspectRatio[];
  maxResolution: string;
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export type ImageQuality = 'low' | 'medium' | 'high';

export type ShotType = 'portrait' | 'three_quarter' | 'full_body';

export const SHOT_TYPE_LABELS: Record<ShotType, string> = {
  portrait: 'Portrait',
  three_quarter: '3/4 View',
  full_body: 'Full Body',
};

export const SHOT_TYPE_DESCRIPTIONS: Record<ShotType, string> = {
  portrait: 'Extreme close-up - Face and expression',
  three_quarter: 'Medium shot - Waist up, 45° angle',
  full_body: 'Wide shot - Full costume and silhouette',
};

/**
 * Available AI Models for Image Generation
 */
export const AI_MODELS: AIModelOption[] = [
  {
    value: 'seedream-4.5-text-to-image',
    label: 'Seedream 4.5 (Text-to-Image)',
    type: 'text-to-image',
    description: '4K AI image generation with sharp realism and cinematic quality',
    provider: 'ByteDance',
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    maxResolution: '4096x4096',
  },
  {
    value: 'seedream-4.5-image-to-image',
    label: 'Seedream 4.5 (Image-to-Image)',
    type: 'image-to-image',
    description: 'Refine existing images with AI enhancement (up to 14 reference images)',
    provider: 'ByteDance',
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    maxResolution: '4096x4096',
  },
  {
    value: 'nano-banana-pro-text-to-image',
    label: 'Nano Banana Pro (Text-to-Image)',
    type: 'text-to-image',
    description: 'Gemini 3 Pro Image model with advanced text rendering capabilities',
    provider: 'Google DeepMind',
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    maxResolution: '2048x2048',
  },
  {
    value: 'nano-banana-pro-image-to-image',
    label: 'Nano Banana Pro (Image-to-Image)',
    type: 'image-to-image',
    description: 'Refine with Gemini 3 Pro - Camera angles, focus, color, and lighting',
    provider: 'Google DeepMind',
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    maxResolution: '2048x2048',
  },
  {
    value: 'flux-2-text-to-image',
    label: 'Flux.2 (Text-to-Image)',
    type: 'text-to-image',
    description: 'Open-weight model with 4MP resolution and structured prompt following',
    provider: 'Black Forest Labs',
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    maxResolution: '4096x4096',
  },
  {
    value: 'flux-2-image-to-image',
    label: 'Flux.2 (Image-to-Image)',
    type: 'image-to-image',
    description: 'Multi-image editing in single checkpoint (up to 10 reference images)',
    provider: 'Black Forest Labs',
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    maxResolution: '4096x4096',
  },
];

/**
 * Get models filtered by type
 */
export function getModelsByType(type: ModelType): AIModelOption[] {
  return AI_MODELS.filter((model) => model.type === type);
}

/**
 * Get text-to-image models only
 */
export function getTextToImageModels(): AIModelOption[] {
  return getModelsByType('text-to-image');
}

/**
 * Get image-to-image models only
 */
export function getImageToImageModels(): AIModelOption[] {
  return getModelsByType('image-to-image');
}

/**
 * Get model by value
 */
export function getModelByValue(value: AIModel): AIModelOption | undefined {
  return AI_MODELS.find((model) => model.value === value);
}

/**
 * Map internal model values to n8n workflow model names
 */
export function mapModelToN8NName(model: AIModel): string {
  const mapping: Record<AIModel, string> = {
    'seedream-4.5-text-to-image': 'seedream/4.5-text-to-image',
    'seedream-4.5-image-to-image': 'seedream/4.5-edit', // I2I uses 'edit' not 'image-to-image'
    'nano-banana-pro-text-to-image': 'nano-banana-pro',
    'nano-banana-pro-image-to-image': 'nano-banana-pro', // Same name for both T2I and I2I
    'flux-2-text-to-image': 'flux-2/pro-text-to-image',
    'flux-2-image-to-image': 'flux-2/pro-image-to-image',
  };

  return mapping[model] || 'seedream/4.5-text-to-image';
}

/**
 * Parameters for image generation
 */
export interface ImageGenerationParams {
  prompt: string;
  model: AIModel;
  aspect_ratio?: AspectRatio;
  quality?: ImageQuality;
  source_image_url?: string; // For image-to-image
  character_id?: string;
  location_id?: string;
  prop_id?: string;
  shot_type?: ShotType;
}

/**
 * Get default aspect ratio for shot type
 */
export function getDefaultAspectRatio(shotType: ShotType): AspectRatio {
  const defaults: Record<ShotType, AspectRatio> = {
    portrait: '1:1',
    three_quarter: '4:3',
    full_body: '9:16',
  };

  return defaults[shotType];
}

/**
 * Validate model supports aspect ratio
 */
export function isAspectRatioSupported(
  model: AIModel,
  aspectRatio: AspectRatio
): boolean {
  const modelConfig = getModelByValue(model);
  if (!modelConfig) return false;

  return modelConfig.aspectRatios.includes(aspectRatio);
}

/**
 * Get supported aspect ratios for a model
 */
export function getSupportedAspectRatios(model: AIModel): AspectRatio[] {
  const modelConfig = getModelByValue(model);
  if (!modelConfig) return ['1:1'];

  return modelConfig.aspectRatios;
}
