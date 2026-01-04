'use client';

import { useState, useEffect } from 'react';
import { useRevalidator } from 'react-router';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Check,
  Sparkles,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Images,
  Wand2,
  RefreshCw,
  Trash2,
  Undo2,
  Expand,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import type { Scene, SceneImageVariant } from '@/lib/drizzle/schema';
import type { BibleInjectionData, SceneModelSelection } from '@/app/actions/types';
import { sceneImagesAction } from '@/hooks/use-server-action';
import { BibleInjectionPreview } from './bible-injection-preview';
import { getApiKeysFromStorage } from '@/hooks/use-api-keys';
import { optimizeImageUrl, IMAGE_SIZES } from '@/lib/utils';

// Timeout for generation (5 minutes - Nano Banana Pro can take longer)
const GENERATION_TIMEOUT_MS = 300000;
// Polling interval (3 seconds for faster updates)
const POLLING_INTERVAL_MS = 3000;

interface SceneImageCardProps {
  scene: Scene;
  variants: SceneImageVariant[];
  bibleData: BibleInjectionData;
}

export function SceneImageCard({
  scene,
  variants,
  bibleData,
}: SceneImageCardProps) {
  const revalidator = useRevalidator();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSelecting, setIsSelecting] = useState<string | null>(null);
  const [isUnselecting, setIsUnselecting] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingVariant, setIsDeletingVariant] = useState<string | null>(null);
  const [isRetryingVariant, setIsRetryingVariant] = useState<string | null>(null);
  const [showBiblePreview, setShowBiblePreview] = useState(false);
  const [selectedModel, setSelectedModel] = useState<SceneModelSelection>('seedream');
  const [refineModel, setRefineModel] = useState<SceneModelSelection>('seedream');
  const [refinementPrompt, setRefinementPrompt] = useState('');
  // Track which variant is selected as source for refinement (separate from approval)
  const [refineSourceId, setRefineSourceId] = useState<string | null>(null);
  // Lightbox state for full-size image preview
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Find selected variant
  const selectedVariant = variants.find((v) => v.is_selected);

  // Separate variants by status
  const generatingVariants = variants.filter((v) => v.status === 'generating');
  const readyVariants = variants.filter((v) => v.status === 'ready');
  const failedVariants = variants.filter((v) => v.status === 'failed');

  // Check if any generation is in progress
  const isAnyGenerating = generatingVariants.length > 0;

  // Polling for generation status - auto-refresh when variants are generating
  // Also poll when isGenerating is true (before DB variants are created)
  const shouldPoll = isAnyGenerating || isGenerating;

  // Timeout for generation status (no individual polling - parent route handles refresh)
  useEffect(() => {
    if (!shouldPoll) return;

    // Set up timeout only - no individual polling to avoid performance issues
    const timeout = setTimeout(() => {
      console.log('⏰ Scene image generation timed out');
      revalidator.revalidate();
    }, GENERATION_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [shouldPoll, revalidator]);

  // Check if we have Bible reference images available
  // MVP Simplification: Portrait only for characters
  const hasReferenceImages =
    (bibleData.location?.image_url ? 1 : 0) +
    bibleData.characters.filter((c) => c.portrait_url).length +
    bibleData.props.filter((p) => p.image_url).length > 0;

  const handleGenerate = async () => {
    setIsGenerating(true);
    const apiKeys = getApiKeysFromStorage();
    const result = await sceneImagesAction('generateSceneVariants', scene.id, selectedModel, apiKeys);

    if (result.success) {
      revalidator.revalidate();
    } else {
      console.error('Failed to generate variants:', result.error);
      alert('Failed to generate images: ' + result.error);
    }
    setIsGenerating(false);
  };

  const handleSelectVariant = async (variantId: string) => {
    setIsSelecting(variantId);
    // Pass API keys for auto-generating shots when image is approved
    const apiKeys = getApiKeysFromStorage();
    const result = await sceneImagesAction('selectSceneVariant', variantId, apiKeys);

    if (result.success) {
      revalidator.revalidate();
    } else {
      console.error('Failed to select variant:', result.error);
      alert('Failed to select image: ' + result.error);
    }
    setIsSelecting(null);
  };

  const handleUnselectVariant = async (variantId: string) => {
    setIsUnselecting(true);
    const result = await sceneImagesAction('unselectSceneVariant', variantId);

    if (result.success) {
      revalidator.revalidate();
    } else {
      console.error('Failed to unapprove variant:', result.error);
      alert('Failed to unapprove image: ' + result.error);
    }
    setIsUnselecting(false);
  };

  const handleRefine = async (variantId: string) => {
    if (!refinementPrompt.trim()) {
      alert('Please enter a refinement prompt');
      return;
    }

    if (refineModel === 'both') {
      alert('Please select a specific model for refinement');
      return;
    }

    setIsRefining(true);
    const apiKeys = getApiKeysFromStorage();
    const result = await sceneImagesAction('refineSceneVariant', variantId, refineModel, refinementPrompt, apiKeys);

    if (result.success) {
      setRefinementPrompt('');
      revalidator.revalidate();
    } else {
      console.error('Failed to refine variant:', result.error);
      alert('Failed to refine image: ' + result.error);
    }
    setIsRefining(false);
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    const result = await sceneImagesAction('deleteAllVariants', scene.id);

    if (result.success) {
      revalidator.revalidate();
    } else {
      console.error('Failed to delete variants:', result.error);
      alert('Failed to delete: ' + result.error);
    }
    setIsDeleting(false);
  };

  const handleDeleteVariant = async (variantId: string) => {
    setIsDeletingVariant(variantId);
    const result = await sceneImagesAction('deleteVariant', variantId);

    if (result.success) {
      // Clear refine source if deleted variant was selected
      if (refineSourceId === variantId) {
        setRefineSourceId(null);
      }
      revalidator.revalidate();
    } else {
      console.error('Failed to delete variant:', result.error);
      alert('Failed to delete: ' + result.error);
    }
    setIsDeletingVariant(null);
  };

  const handleRetryVariant = async (variantId: string) => {
    setIsRetryingVariant(variantId);
    const apiKeys = getApiKeysFromStorage();
    const result = await sceneImagesAction('retryVariant', variantId, apiKeys);

    if (result.success) {
      revalidator.revalidate();
    } else {
      console.error('Failed to retry variant:', result.error);
      alert('Failed to retry: ' + result.error);
    }
    setIsRetryingVariant(null);
  };

  // Get model display name
  const getModelDisplayName = (model: string): string => {
    if (model.includes('seedream')) return 'Seedream 4.5';
    if (model.includes('nano-banana')) return 'Nano Banana Pro';
    return model;
  };

  return (
    <Card className="bg-[#1c1c1f] border-[#333] p-6">
      {/* Scene Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-[#f5c518] text-black font-oswald uppercase text-xs">
            Scene {scene.scene_number}
          </Badge>
          {scene.raw_scene_data?.interior_exterior && (
            <Badge
              variant="outline"
              className="border-[#333] text-[#666] font-courier text-xs"
            >
              {scene.raw_scene_data.interior_exterior}
            </Badge>
          )}
          {selectedVariant && (
            <Badge className="bg-green-900/80 text-green-400 border border-green-700 ml-auto">
              <Check size={12} className="mr-1" />
              Approved
            </Badge>
          )}
        </div>
        <h3 className="font-courier font-bold text-white text-sm uppercase mb-3">
          {scene.raw_scene_data?.slugline || scene.slugline}
        </h3>

        {/* Bible Injection Preview Toggle */}
        <button
          onClick={() => setShowBiblePreview(!showBiblePreview)}
          className="flex items-center gap-2 text-[#888] hover:text-white transition-colors text-xs font-courier"
        >
          {showBiblePreview ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
          <span>
            Bible Elements ({bibleData.characters.length} characters
            {bibleData.location ? ', 1 location' : ''}
            {bibleData.props.length > 0 ? `, ${bibleData.props.length} props` : ''})
          </span>
        </button>

        {showBiblePreview && (
          <div className="mt-3 p-3 bg-[#0a0a0b] border border-[#333] rounded">
            <BibleInjectionPreview data={bibleData} />
          </div>
        )}
      </div>

      {/* Already Approved State */}
      {selectedVariant && (
        <div className="space-y-4">
          <div className="aspect-video bg-[#0a0a0b] border border-green-800 rounded overflow-hidden relative">
            <img
              src={optimizeImageUrl(selectedVariant.image_url, IMAGE_SIZES.cardMedium)}
              alt={`Scene ${scene.scene_number}`}
              className="w-full h-full object-cover"
            />
            {/* Expand button - top right */}
            <button
              onClick={() => setLightboxImage(selectedVariant.image_url)}
              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded transition-colors z-10"
              title="View full size"
            >
              <Expand size={14} className="text-white" />
            </button>
            <div className="absolute bottom-2 left-2">
              <Badge className="bg-[#0a0a0b]/80 text-[#888] border border-[#333] font-courier text-xs">
                {getModelDisplayName(selectedVariant.model)}
              </Badge>
            </div>
          </div>

          {/* Unapprove + Refine Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => handleUnselectVariant(selectedVariant.id)}
              disabled={isUnselecting}
              className="flex-1 bg-[#333] hover:bg-[#555] text-white font-oswald uppercase text-xs tracking-wider px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-[#555]"
            >
              {isUnselecting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Unapproving...
                </>
              ) : (
                <>
                  <Undo2 size={14} />
                  Unapprove
                </>
              )}
            </button>
          </div>

          {/* Refinement Section for Approved Image */}
          <div className="p-3 bg-[#0a0a0b] rounded-lg border border-[#00f2ea]/30">
            <Label className="text-[#00f2ea] text-xs font-oswald uppercase flex items-center gap-1 mb-2">
              <Wand2 size={12} />
              Refine Approved Image (Image-to-Image)
            </Label>
            <Textarea
              value={refinementPrompt}
              onChange={(e) => setRefinementPrompt(e.target.value)}
              className="bg-[#141416] border-[#333] text-white font-courier text-xs min-h-[60px] focus:border-[#00f2ea] mb-2"
              rows={2}
              placeholder="Describe what you want to change... (e.g., 'make the lighting warmer', 'add more dramatic shadows')"
            />
            <div className="flex gap-2 items-center">
              <div className="flex gap-1">
                <button
                  onClick={() => setRefineModel('seedream')}
                  className={`px-2 py-1 text-xs font-courier rounded border transition-colors ${
                    refineModel === 'seedream'
                      ? 'bg-blue-900/50 border-blue-500 text-blue-400'
                      : 'bg-[#141416] border-[#333] text-[#666] hover:border-[#555]'
                  }`}
                >
                  Seedream
                </button>
                <button
                  onClick={() => setRefineModel('nano-banana')}
                  className={`px-2 py-1 text-xs font-courier rounded border transition-colors ${
                    refineModel === 'nano-banana'
                      ? 'bg-purple-900/50 border-purple-500 text-purple-400'
                      : 'bg-[#141416] border-[#333] text-[#666] hover:border-[#555]'
                  }`}
                >
                  Nano Banana
                </button>
              </div>
              <button
                onClick={() => handleRefine(selectedVariant.id)}
                disabled={isRefining || !refinementPrompt.trim()}
                className="flex-1 bg-[#00f2ea] hover:bg-white text-black font-oswald uppercase text-xs tracking-wider px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                {isRefining ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Refining...
                  </>
                ) : (
                  <>
                    <Wand2 size={12} />
                    Refine
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-3 bg-green-900/20 border border-green-800 rounded text-center">
            <p className="text-green-400 font-courier text-xs">
              Image approved - Video + audio generation will start
            </p>
          </div>

          {/* Other Variants - Show when approved and there are other variants */}
          {variants.filter(v => v.id !== selectedVariant.id).length > 0 && (
            <div className="mt-6 pt-4 border-t border-[#333]">
              <p className="text-[#888] font-courier text-xs uppercase tracking-wider mb-3">
                Other Variants ({variants.filter(v => v.id !== selectedVariant.id).length})
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {variants.filter(v => v.id !== selectedVariant.id).map((variant) => (
                  <div
                    key={variant.id}
                    className={`space-y-2 border rounded p-2 transition-all ${
                      variant.status === 'failed'
                        ? 'border-red-800 bg-red-900/10'
                        : variant.status === 'ready'
                          ? 'border-[#f5c518] bg-[#0a0a0b]'
                          : 'border-[#333] bg-[#0a0a0b]'
                    }`}
                  >
                    {/* Model Label */}
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={`font-courier text-xs ${
                          variant.model.includes('seedream')
                            ? 'border-blue-500 text-blue-400'
                            : 'border-purple-500 text-purple-400'
                        }`}
                      >
                        {getModelDisplayName(variant.model)}
                      </Badge>
                      {variant.status === 'generating' && (
                        <Loader2 size={12} className="text-[#f5c518] animate-spin" />
                      )}
                    </div>

                    {/* Image Preview */}
                    <div className="aspect-video bg-[#1c1c1f] rounded overflow-hidden relative">
                      {variant.status === 'generating' ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 size={24} className="text-[#f5c518] animate-spin" />
                        </div>
                      ) : variant.status === 'failed' ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-red-400 font-courier text-xs text-center px-2">
                            {variant.error_message || 'Failed'}
                          </p>
                        </div>
                      ) : variant.image_url ? (
                        <>
                          <img
                            src={optimizeImageUrl(variant.image_url, IMAGE_SIZES.previewSmall)}
                            alt={`Variant by ${getModelDisplayName(variant.model)}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => setLightboxImage(variant.image_url)}
                            className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded transition-colors"
                            title="View full size"
                          >
                            <Expand size={12} className="text-white" />
                          </button>
                        </>
                      ) : null}
                    </div>

                    {/* Action Buttons */}
                    {variant.status === 'ready' && (
                      <button
                        onClick={() => handleSelectVariant(variant.id)}
                        disabled={isSelecting === variant.id}
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-oswald uppercase text-xs tracking-wider px-2 py-1.5 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {isSelecting === variant.id ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <>
                            <Check size={10} />
                            Use This
                          </>
                        )}
                      </button>
                    )}
                    {variant.status === 'failed' && (
                      <button
                        onClick={() => handleRetryVariant(variant.id)}
                        disabled={isRetryingVariant === variant.id}
                        className="w-full bg-[#f5c518] hover:bg-white text-black font-oswald uppercase text-xs tracking-wider px-2 py-1.5 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {isRetryingVariant === variant.id ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <>
                            <RefreshCw size={10} />
                            Retry
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Variants Yet - Generate Button */}
      {!selectedVariant && variants.length === 0 && (
        <div className="space-y-4">
          {/* Show spinners immediately when generating, before DB variants are created */}
          {isGenerating ? (
            <div className={`grid gap-4 ${selectedModel === 'both' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {(selectedModel === 'seedream' || selectedModel === 'both') && (
                <div className="aspect-video bg-[#1c1c1f] border border-[#f5c518]/50 rounded flex flex-col items-center justify-center">
                  <Loader2 size={32} className="text-[#f5c518] animate-spin mb-2" />
                  <p className="text-[#f5c518] font-courier text-xs">Generating...</p>
                  <p className="text-[#666] font-courier text-xs">Seedream 4.5</p>
                </div>
              )}
              {(selectedModel === 'nano-banana' || selectedModel === 'both') && (
                <div className="aspect-video bg-[#1c1c1f] border border-[#f5c518]/50 rounded flex flex-col items-center justify-center">
                  <Loader2 size={32} className="text-[#f5c518] animate-spin mb-2" />
                  <p className="text-[#f5c518] font-courier text-xs">Generating...</p>
                  <p className="text-[#666] font-courier text-xs">Nano Banana Pro</p>
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video bg-[#0a0a0b] border border-[#333] rounded flex items-center justify-center">
              <div className="text-center">
                <ImageIcon size={48} className="text-[#333] mx-auto mb-2" />
                <p className="text-[#666] font-courier text-xs">No image yet</p>
              </div>
            </div>
          )}

          {/* Model Selector */}
          <div className="space-y-2">
            <p className="text-[#888] font-courier text-xs uppercase tracking-wider">
              Select AI Model
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedModel('seedream')}
                className={`flex-1 px-3 py-2 text-xs font-courier rounded border transition-colors ${
                  selectedModel === 'seedream'
                    ? 'bg-blue-900/50 border-blue-500 text-blue-400'
                    : 'bg-[#0a0a0b] border-[#333] text-[#666] hover:border-[#555]'
                }`}
              >
                Seedream 4.5
              </button>
              <button
                onClick={() => setSelectedModel('nano-banana')}
                className={`flex-1 px-3 py-2 text-xs font-courier rounded border transition-colors ${
                  selectedModel === 'nano-banana'
                    ? 'bg-purple-900/50 border-purple-500 text-purple-400'
                    : 'bg-[#0a0a0b] border-[#333] text-[#666] hover:border-[#555]'
                }`}
              >
                Nano Banana Pro
              </button>
              <button
                onClick={() => setSelectedModel('both')}
                className={`flex-1 px-3 py-2 text-xs font-courier rounded border transition-colors ${
                  selectedModel === 'both'
                    ? 'bg-[#f5c518]/20 border-[#f5c518] text-[#f5c518]'
                    : 'bg-[#0a0a0b] border-[#333] text-[#666] hover:border-[#555]'
                }`}
              >
                Both
              </button>
            </div>
          </div>

          {/* Generation Mode Indicator */}
          {hasReferenceImages && (
            <div className="flex items-center gap-2 p-2 bg-green-900/20 border border-green-800 rounded">
              <Images size={14} className="text-green-400" />
              <p className="text-green-400 font-courier text-xs">
                Using Bible reference images (Image-to-Image)
              </p>
            </div>
          )}
          {!hasReferenceImages && (
            <div className="flex items-center gap-2 p-2 bg-yellow-900/20 border border-yellow-800 rounded">
              <ImageIcon size={14} className="text-yellow-400" />
              <p className="text-yellow-400 font-courier text-xs">
                No Bible images found - using text descriptions only
              </p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-[#f5c518] hover:bg-white text-black font-oswald uppercase text-sm tracking-wider px-4 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate {selectedModel === 'both' ? '2 Variants' : '1 Variant'}
              </>
            )}
          </button>

          <p className="text-[#666] font-courier text-xs text-center">
            {selectedModel === 'both'
              ? 'Generates 2 variants: Seedream 4.5 & Nano Banana Pro'
              : selectedModel === 'seedream'
                ? 'Generates 1 variant with Seedream 4.5'
                : 'Generates 1 variant with Nano Banana Pro'}
          </p>
        </div>
      )}

      {/* Variants in Progress or Ready */}
      {!selectedVariant && variants.length > 0 && (
        <div className="space-y-4">
          {/* Variant Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {variants.map((variant) => {
              const isRefineSource = refineSourceId === variant.id ||
                (!refineSourceId && readyVariants[0]?.id === variant.id);

              return (
                <div
                  key={variant.id}
                  className={`space-y-2 border rounded p-3 transition-all ${
                    variant.status === 'failed'
                      ? 'border-red-800 bg-red-900/10'
                      : isRefineSource && variant.status === 'ready'
                        ? 'border-[#00f2ea] bg-[#00f2ea]/10 ring-2 ring-[#00f2ea]/50'
                        : variant.status === 'ready'
                          ? 'border-[#f5c518] bg-[#0a0a0b]'
                          : 'border-[#333] bg-[#0a0a0b]'
                  }`}
                >
                  {/* Model Label + Delete Button */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`font-courier text-xs ${
                          variant.model.includes('seedream')
                            ? 'border-blue-500 text-blue-400'
                            : 'border-purple-500 text-purple-400'
                        }`}
                      >
                        {getModelDisplayName(variant.model)}
                      </Badge>
                      {isRefineSource && variant.status === 'ready' && (
                        <Badge className="bg-[#00f2ea]/20 text-[#00f2ea] border border-[#00f2ea] text-xs">
                          <Wand2 size={10} className="mr-1" />
                          Refine Source
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {variant.status === 'generating' && (
                        <Loader2 size={14} className="text-[#f5c518] animate-spin" />
                      )}
                      {variant.status === 'failed' && (
                        <span className="text-red-400 text-xs font-courier">
                          Failed
                        </span>
                      )}
                      {/* Individual Delete Button */}
                      <button
                        onClick={() => handleDeleteVariant(variant.id)}
                        disabled={isDeletingVariant === variant.id}
                        className="p-1 text-[#666] hover:text-red-400 transition-colors disabled:opacity-50"
                        title="Delete this variant"
                      >
                        {isDeletingVariant === variant.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Image Preview - Clickable to select for refinement */}
                  <div
                    className={`aspect-video bg-[#1c1c1f] rounded overflow-hidden relative ${
                      variant.status === 'ready' ? 'cursor-pointer hover:opacity-90' : ''
                    }`}
                    onClick={() => {
                      if (variant.status === 'ready') {
                        setRefineSourceId(variant.id);
                      }
                    }}
                  >
                    {variant.status === 'generating' ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <Loader2
                            size={32}
                            className="text-[#f5c518] animate-spin mx-auto mb-2"
                          />
                          <p className="text-[#666] font-courier text-xs">
                            Generating...
                          </p>
                        </div>
                      </div>
                    ) : variant.status === 'failed' ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <p className="text-red-400 font-courier text-xs text-center px-4">
                          {variant.error_message || 'Generation failed'}
                        </p>
                      </div>
                    ) : variant.image_url ? (
                      <>
                        <img
                          src={optimizeImageUrl(variant.image_url, IMAGE_SIZES.cardMedium)}
                          alt={`Variant by ${getModelDisplayName(variant.model)}`}
                          className="w-full h-full object-cover"
                        />
                        {variant.status === 'ready' && (
                          <>
                            {/* Expand button - top right */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage(variant.image_url);
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded transition-colors z-10"
                              title="View full size"
                            >
                              <Expand size={14} className="text-white" />
                            </button>
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                              <span className="text-white text-xs font-courier bg-black/50 px-2 py-1 rounded">
                                Click to select for refinement
                              </span>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <p className="text-[#666] font-courier text-xs">
                          No image
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons - Ready */}
                  {variant.status === 'ready' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSelectVariant(variant.id)}
                        disabled={isSelecting === variant.id}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white font-oswald uppercase text-xs tracking-wider px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                      >
                        {isSelecting === variant.id ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <Check size={12} />
                            Approve
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setRefineSourceId(variant.id)}
                        className={`px-3 py-2 text-xs font-oswald uppercase tracking-wider transition-colors flex items-center justify-center gap-1 ${
                          isRefineSource
                            ? 'bg-[#00f2ea] text-black'
                            : 'bg-[#333] hover:bg-[#555] text-white border border-[#555]'
                        }`}
                      >
                        <Wand2 size={12} />
                        Refine
                      </button>
                    </div>
                  )}

                  {/* Action Buttons - Failed (Retry) */}
                  {variant.status === 'failed' && (
                    <button
                      onClick={() => handleRetryVariant(variant.id)}
                      disabled={isRetryingVariant === variant.id}
                      className="w-full bg-[#f5c518] hover:bg-white text-black font-oswald uppercase text-xs tracking-wider px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      {isRetryingVariant === variant.id ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={12} />
                          Retry
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add New Variant Section - always available when not generating */}
          {!isAnyGenerating && (
            <div className="p-3 bg-[#0a0a0b] rounded-lg border border-[#333]">
              <Label className="text-[#f5c518] text-xs font-oswald uppercase flex items-center gap-1 mb-2">
                <Sparkles size={12} />
                Generate New Variant
              </Label>
              <div className="flex gap-2 items-center">
                <div className="flex gap-1 flex-1">
                  <button
                    onClick={() => setSelectedModel('seedream')}
                    className={`flex-1 px-2 py-1 text-xs font-courier rounded border transition-colors ${
                      selectedModel === 'seedream'
                        ? 'bg-blue-900/50 border-blue-500 text-blue-400'
                        : 'bg-[#141416] border-[#333] text-[#666] hover:border-[#555]'
                    }`}
                  >
                    Seedream
                  </button>
                  <button
                    onClick={() => setSelectedModel('nano-banana')}
                    className={`flex-1 px-2 py-1 text-xs font-courier rounded border transition-colors ${
                      selectedModel === 'nano-banana'
                        ? 'bg-purple-900/50 border-purple-500 text-purple-400'
                        : 'bg-[#141416] border-[#333] text-[#666] hover:border-[#555]'
                    }`}
                  >
                    Nano Banana
                  </button>
                  <button
                    onClick={() => setSelectedModel('both')}
                    className={`flex-1 px-2 py-1 text-xs font-courier rounded border transition-colors ${
                      selectedModel === 'both'
                        ? 'bg-[#f5c518]/20 border-[#f5c518] text-[#f5c518]'
                        : 'bg-[#141416] border-[#333] text-[#666] hover:border-[#555]'
                    }`}
                  >
                    Both
                  </button>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-[#f5c518] hover:bg-white text-black font-oswald uppercase text-xs tracking-wider px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Delete All Button - shows when there are any variants */}
          {variants.length > 0 && (
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="bg-red-900/50 hover:bg-red-800 text-red-400 font-oswald uppercase text-xs tracking-wider px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-red-800"
              >
                {isDeleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Trash2 size={14} />
                    Delete All
                  </>
                )}
              </button>
            </div>
          )}

          {/* Refinement Section - for ready variants */}
          {readyVariants.length > 0 && !isAnyGenerating && (
            <div className="mt-4 p-3 bg-[#0a0a0b] rounded-lg border border-[#00f2ea]/30">
              <Label className="text-[#00f2ea] text-xs font-oswald uppercase flex items-center gap-1 mb-2">
                <Wand2 size={12} />
                Refine Selected Image (Image-to-Image)
              </Label>
              <Textarea
                value={refinementPrompt}
                onChange={(e) => setRefinementPrompt(e.target.value)}
                className="bg-[#141416] border-[#333] text-white font-courier text-xs min-h-[60px] focus:border-[#00f2ea] mb-2"
                rows={2}
                placeholder="Describe what you want to change... (e.g., 'make the lighting warmer', 'add more dramatic shadows', 'adjust the composition')"
              />
              <div className="flex gap-2 items-center">
                <div className="flex gap-1">
                  <button
                    onClick={() => setRefineModel('seedream')}
                    className={`px-2 py-1 text-xs font-courier rounded border transition-colors ${
                      refineModel === 'seedream'
                        ? 'bg-blue-900/50 border-blue-500 text-blue-400'
                        : 'bg-[#141416] border-[#333] text-[#666] hover:border-[#555]'
                    }`}
                  >
                    Seedream
                  </button>
                  <button
                    onClick={() => setRefineModel('nano-banana')}
                    className={`px-2 py-1 text-xs font-courier rounded border transition-colors ${
                      refineModel === 'nano-banana'
                        ? 'bg-purple-900/50 border-purple-500 text-purple-400'
                        : 'bg-[#141416] border-[#333] text-[#666] hover:border-[#555]'
                    }`}
                  >
                    Nano Banana
                  </button>
                </div>
                <button
                  onClick={() => {
                    // Use selected variant or fall back to first ready variant
                    const sourceId = refineSourceId || readyVariants[0]?.id;
                    if (sourceId) {
                      handleRefine(sourceId);
                    }
                  }}
                  disabled={isRefining || !refinementPrompt.trim()}
                  className="flex-1 bg-[#00f2ea] hover:bg-white text-black font-oswald uppercase text-xs tracking-wider px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  {isRefining ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Refining...
                    </>
                  ) : (
                    <>
                      <Wand2 size={12} />
                      Refine
                    </>
                  )}
                </button>
              </div>
              <p className="text-[#666] font-courier text-xs mt-2">
                Click on an image above or use the &quot;Refine&quot; button to select which variant to refine
              </p>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Dialog for full-size image preview */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] w-[98vw] h-[98vh] p-0 bg-black border-[#333] overflow-hidden">
          {lightboxImage && (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <img
                src={lightboxImage}
                alt="Full size preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
