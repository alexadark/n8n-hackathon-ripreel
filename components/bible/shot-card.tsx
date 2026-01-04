'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRevalidator } from 'react-router';
import {
  Image as ImageIcon,
  Check,
  Loader2,
  RefreshCw,
  Upload,
  Wand2,
  Edit2,
  Save,
  X,
  Plus,
  Eye,
  Undo2,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { VariantGallery } from '@/components/bible/variant-gallery';
import { SimpleModelSelector, modelSelectionToArray, type SimpleModelSelection } from '@/components/bible/model-selector';
import { toast } from 'sonner';
import { bibleThreeShotAction } from '@/hooks/use-server-action';
import type { AIModel, ShotType } from '@/lib/bible/models';
import type { ProjectCharacter, BibleImageVariant } from '@/lib/drizzle/schema';
import { cn, optimizeImageUrl, IMAGE_SIZES } from '@/lib/utils';
import { getApiKeysFromStorage } from '@/hooks/use-api-keys';

// Type for optimistic (pending) variants that haven't been saved yet
interface OptimisticVariant {
  id: string;
  image_url: string;
  model: string;
  status: 'generating';
  generation_order: number;
  is_selected: boolean;
  isOptimistic: true;
}

// Timeout for generation (5 minutes - Nano Banana Pro can take longer)
const GENERATION_TIMEOUT_MS = 300000;
// Polling interval (5 seconds)
const POLLING_INTERVAL_MS = 5000;

interface ShotCardProps {
  character: ProjectCharacter;
  shotType: ShotType;
  title: string;
  aspectRatio: string; // e.g., "1:1", "4:3", "9:16"
  variants?: BibleImageVariant[]; // Variants for this shot
}

const SHOT_TYPE_LABELS = {
  portrait: 'Portrait',
  three_quarter: '3/4 View',
  full_body: 'Full Body',
};

export function ShotCard({ character, shotType, title, aspectRatio, variants = [] }: ShotCardProps) {
  const revalidator = useRevalidator();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingMultiple, setIsGeneratingMultiple] = useState(false);
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isUnapproving, setIsUnapproving] = useState(false);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [isInitializingPrompts, setIsInitializingPrompts] = useState(false);
  const [showVariants, setShowVariants] = useState(variants.length > 0);

  // Optimistic variants - shown immediately while generation is in progress
  const [optimisticVariants, setOptimisticVariants] = useState<OptimisticVariant[]>([]);

  const [refinementPrompt, setRefinementPrompt] = useState('');

  // Model-specific prompts (Seedream and Nano Banana have different optimal prompts)
  const seedreamPrompt = (character.portrait_prompt_seedream as string) || '';
  const nanoBananaPrompt = (character.portrait_prompt_nano_banana as string) || '';
  const legacyPrompt = (character[`${shotType}_prompt` as keyof ProjectCharacter] as string) || '';

  const [editedSeedreamPrompt, setEditedSeedreamPrompt] = useState(seedreamPrompt);
  const [editedNanoBananaPrompt, setEditedNanoBananaPrompt] = useState(nanoBananaPrompt);
  const [editedPrompt, setEditedPrompt] = useState(legacyPrompt);

  // Model selection states
  const [selectedModel, setSelectedModel] = useState<SimpleModelSelection>('both');
  const [addVariantModel, setAddVariantModel] = useState<SimpleModelSelection>('seedream');
  const [refineModel, setRefineModel] = useState<SimpleModelSelection>('seedream');

  // Default model for backward compatibility
  const defaultModel: AIModel = 'seedream-4.5-text-to-image';

  // Get shot-specific fields
  const imageUrl = character[`${shotType}_image_url` as keyof ProjectCharacter] as string;
  const status = character[`${shotType}_status` as keyof ProjectCharacter] as string;
  const prompt = character[`${shotType}_prompt` as keyof ProjectCharacter] as string;

  // Combine real variants with optimistic ones
  // Remove optimistic variants when real ones with 'generating' status appear
  const combinedVariants = useMemo(() => {
    const realGeneratingIds = new Set(
      variants.filter(v => v.status === 'generating').map(v => v.model)
    );
    // Filter out optimistic variants that now have real counterparts
    const filteredOptimistic = optimisticVariants.filter(
      ov => !realGeneratingIds.has(ov.model)
    );
    return [...variants, ...filteredOptimistic];
  }, [variants, optimisticVariants]);

  // Clear optimistic variants when all real variants are no longer generating
  useEffect(() => {
    const hasRealGenerating = variants.some(v => v.status === 'generating');
    if (!hasRealGenerating && optimisticVariants.length > 0) {
      // Check if we have real variants that replaced the optimistic ones
      const optimisticModels = new Set(optimisticVariants.map(ov => ov.model));
      const hasReplacements = variants.some(v => optimisticModels.has(v.model));
      if (hasReplacements || variants.length > 0) {
        setOptimisticVariants([]);
      }
    }
  }, [variants, optimisticVariants]);

  // Auto-fix stuck variants on mount (for existing projects with stuck generations)
  useEffect(() => {
    const hasStuckVariants = variants.some(v => v.status === 'generating');
    if (hasStuckVariants) {
      // Check and reset any stuck variants (older than 5 minutes)
      void bibleThreeShotAction('resetStuckVariants', 'character', character.id, shotType).then(result => {
        if (result.success) {
          const data = result.data as { resetCount?: number } | undefined;
          if (data?.resetCount && data.resetCount > 0) {
            console.log(`🔧 Auto-reset ${data.resetCount} stuck variant(s) for ${shotType}`);
            revalidator.revalidate();
          }
        }
      });
    }
    // Only run on mount/when variants change from props
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id, shotType]);

  // Check if any variants are generating
  const hasGeneratingVariants = combinedVariants.some(v => v.status === 'generating');
  const isAnyGenerating = status === 'generating' || hasGeneratingVariants;

  // Timeout for generation status (no individual polling - parent handles it via BibleAutoRefresh)
  useEffect(() => {
    if (!isAnyGenerating) return;

    // Set up timeout only - polling is handled by parent BibleAutoRefresh component
    const timeout = setTimeout(() => {
      toast.error('Generation timed out. Please try again.');
      // Clear optimistic variants on timeout to stop the spinner
      setOptimisticVariants([]);
      revalidator.revalidate();
    }, GENERATION_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [isAnyGenerating, revalidator]);

  const statusColor = {
    pending: 'bg-[#f5c518]/20 text-[#f5c518]',
    generating: 'bg-blue-500/20 text-blue-400',
    ready: 'bg-cyan-500/20 text-cyan-400',
    approved: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
  };

  // Helper to create optimistic variants for immediate UI feedback
  const createOptimisticVariants = useCallback((models: ('seedream' | 'nano-banana')[]): OptimisticVariant[] => {
    const modelMap: Record<string, string> = {
      'seedream': 'seedream-4.5-text-to-image',
      'nano-banana': 'nano-banana-pro-text-to-image',
    };
    const currentMaxOrder = Math.max(...combinedVariants.map(v => v.generation_order || 0), -1);

    return models.map((model, index) => ({
      id: `optimistic-${model}-${Date.now()}-${index}`,
      image_url: '',
      model: modelMap[model],
      status: 'generating' as const,
      generation_order: currentMaxOrder + 1 + index,
      is_selected: false,
      isOptimistic: true as const,
    }));
  }, [combinedVariants]);

  const handleSavePrompt = async (): Promise<void> => {
    setIsSavingPrompt(true);
    try {
      // Save model-specific prompts
      const result = await bibleThreeShotAction('updateCharacterModelPrompts', character.id, shotType, {
        seedream: editedSeedreamPrompt,
        nanoBanana: editedNanoBananaPrompt,
      });
      if (result.success) {
        toast.success('Prompts updated');
        setIsEditingPrompt(false);
        revalidator.revalidate();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to save prompts');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleCancelEdit = (): void => {
    setEditedSeedreamPrompt(seedreamPrompt);
    setEditedNanoBananaPrompt(nanoBananaPrompt);
    setEditedPrompt(legacyPrompt);
    setIsEditingPrompt(false);
  };

  const handleInitializeFromVisualDna = async (): Promise<void> => {
    setIsInitializingPrompts(true);
    try {
      const result = await bibleThreeShotAction('initializeModelPromptsFromVisualDna', character.id);
      if (result.success) {
        toast.success('Prompts initialized from Visual DNA');
        revalidator.revalidate();
      } else {
        toast.error(result.error || 'Failed to initialize prompts');
      }
    } catch {
      toast.error('Failed to initialize prompts');
    } finally {
      setIsInitializingPrompts(false);
    }
  };

  const handleGenerate = async (): Promise<void> => {
    // Check for at least one model-specific prompt
    if (!seedreamPrompt && !nanoBananaPrompt) {
      toast.error('Please add at least one model-specific prompt first');
      return;
    }

    setIsGenerating(true);
    try {
      const apiKeys = getApiKeysFromStorage();
      const result = await bibleThreeShotAction('generateCharacterShot', character.id, shotType, defaultModel, apiKeys);
      if (result.success) {
        toast.success(`${SHOT_TYPE_LABELS[shotType]} generation started`);
        revalidator.revalidate();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to start generation');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    handleUpload(file);
  };

  const handleUpload = async (file: File): Promise<void> => {
    setIsUploading(true);
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await bibleThreeShotAction('uploadCharacterShot', character.id, shotType, {
        buffer,
        filename: file.name,
        contentType: file.type,
      });

      if (result.success) {
        toast.success(`${SHOT_TYPE_LABELS[shotType]} uploaded`);
        revalidator.revalidate();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRefine = async (): Promise<void> => {
    if (!imageUrl) {
      toast.error('No image to refine');
      return;
    }

    // Only allow single models for refinement
    if (refineModel === 'both') {
      toast.error('Please select a specific model for refinement');
      return;
    }

    const modelToUse: AIModel = refineModel === 'seedream'
      ? 'seedream-4.5-text-to-image'
      : 'nano-banana-pro-text-to-image';

    setIsRefining(true);
    setShowVariants(true); // Show variants gallery since refinement creates a variant
    try {
      const apiKeys = getApiKeysFromStorage();
      const result = await bibleThreeShotAction('refineCharacterShot', 
        character.id,
        shotType,
        modelToUse,
        refinementPrompt || undefined,
        apiKeys
      );

      if (result.success) {
        toast.success('Refinement started - creating new variant');
        setRefinementPrompt('');
        revalidator.revalidate();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to start refinement');
    } finally {
      setIsRefining(false);
    }
  };

  const handleApprove = async (): Promise<void> => {
    setIsApproving(true);
    try {
      const result = await bibleThreeShotAction('approveCharacterShot', character.id, shotType);
      if (result.success) {
        toast.success(`${SHOT_TYPE_LABELS[shotType]} approved`);
        revalidator.revalidate();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to approve shot');
    } finally {
      setIsApproving(false);
    }
  };

  const handleUnapprove = async (): Promise<void> => {
    setIsUnapproving(true);
    try {
      const result = await bibleThreeShotAction('unapproveCharacterShot', character.id, shotType);
      if (result.success) {
        toast.success(`${SHOT_TYPE_LABELS[shotType]} unapproved - you can now change your selection`);
        setShowVariants(true); // Show variants so user can reselect
        revalidator.revalidate();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to unapprove shot');
    } finally {
      setIsUnapproving(false);
    }
  };

  const handleGenerateMultiple = async (): Promise<void> => {
    const modelsToUse = modelSelectionToArray(selectedModel);

    // Check if we have prompts for the selected models
    const hasNeededPrompts =
      (modelsToUse.includes('seedream') && seedreamPrompt) ||
      (modelsToUse.includes('nano-banana') && nanoBananaPrompt);

    if (!hasNeededPrompts) {
      toast.error('Please add prompts for the selected model(s) first');
      return;
    }

    // Immediately add optimistic variants for visual feedback
    const newOptimisticVariants = createOptimisticVariants(modelsToUse);
    setOptimisticVariants(prev => [...prev, ...newOptimisticVariants]);
    setShowVariants(true);
    setIsGeneratingMultiple(true);

    try {
      const apiKeys = getApiKeysFromStorage();
      const result = await bibleThreeShotAction('generateMultipleVariants', 'character', character.id, shotType, modelsToUse, apiKeys);
      if (result.success) {
        const count = modelsToUse.length;
        toast.success(`Generating ${count} image option${count > 1 ? 's' : ''}`);
        revalidator.revalidate();
      } else {
        toast.error(result.error);
        // Remove optimistic variants on failure
        setOptimisticVariants(prev =>
          prev.filter(ov => !newOptimisticVariants.some(nov => nov.id === ov.id))
        );
        if (variants.length === 0) {
          setShowVariants(false);
        }
      }
    } catch {
      toast.error('Failed to start generation');
      // Remove optimistic variants on failure
      setOptimisticVariants(prev =>
        prev.filter(ov => !newOptimisticVariants.some(nov => nov.id === ov.id))
      );
      if (variants.length === 0) {
        setShowVariants(false);
      }
    } finally {
      setIsGeneratingMultiple(false);
    }
  };

  const handleAddVariant = async (): Promise<void> => {
    // Only allow single models for Add Variant
    if (addVariantModel === 'both') {
      toast.error('Please select a specific model');
      return;
    }

    // Check if we have the prompt for the selected model
    const hasPromptForModel =
      (addVariantModel === 'seedream' && seedreamPrompt) ||
      (addVariantModel === 'nano-banana' && nanoBananaPrompt);

    if (!hasPromptForModel) {
      toast.error(`Please add a ${addVariantModel === 'seedream' ? 'Seedream' : 'Nano Banana'} prompt first`);
      return;
    }

    // Immediately add optimistic variant for visual feedback
    const newOptimisticVariants = createOptimisticVariants([addVariantModel]);
    setOptimisticVariants(prev => [...prev, ...newOptimisticVariants]);
    setShowVariants(true);
    setIsAddingVariant(true);

    try {
      const apiKeys = getApiKeysFromStorage();
      const result = await bibleThreeShotAction('addSingleVariant', 'character', character.id, shotType, addVariantModel, apiKeys);
      if (result.success) {
        toast.success(`Adding new variant with ${addVariantModel === 'seedream' ? 'Seedream 4.5' : 'Nano Banana Pro'}`);
        revalidator.revalidate();
      } else {
        toast.error(result.error);
        // Remove optimistic variant on failure
        setOptimisticVariants(prev =>
          prev.filter(ov => !newOptimisticVariants.some(nov => nov.id === ov.id))
        );
      }
    } catch {
      toast.error('Failed to add variant');
      // Remove optimistic variant on failure
      setOptimisticVariants(prev =>
        prev.filter(ov => !newOptimisticVariants.some(nov => nov.id === ov.id))
      );
    } finally {
      setIsAddingVariant(false);
    }
  };

  const isDisabled = status === 'approved';

  return (
    <div className="bg-[#1c1c1f] border border-[#333] rounded-lg overflow-hidden hover:border-[#666] transition-colors">
      {/* Image Area or Variant Gallery */}
      {showVariants && combinedVariants.length > 0 ? (
        <div className="p-4 bg-[#141416]">
          <VariantGallery
            variants={combinedVariants.map((v) => ({
              id: v.id,
              image_url: v.image_url || '',
              model: v.model,
              status: v.status || 'pending',
              generation_order: v.generation_order || 0,
              is_selected: v.is_selected || false,
              prompt: prompt,
            }))}
            aspectRatio={aspectRatio}
            onSelect={() => setShowVariants(false)}
            assetType="character"
            assetId={character.id}
            shotType={shotType}
          />
        </div>
      ) : (
        <div
          className={cn(
            'bg-[#141416] relative',
            aspectRatio === '1:1' && 'aspect-square',
            aspectRatio === '4:3' && 'aspect-[4/3]',
            aspectRatio === '9:16' && 'aspect-[9/16]'
          )}
        >
          {imageUrl ? (
            <img
              src={optimizeImageUrl(imageUrl, IMAGE_SIZES.cardSquare)}
              alt={title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon size={48} className="text-[#333]" />
            </div>
          )}

          {/* Status Badge */}
          <Badge
            className={cn(
              'absolute top-3 right-3 font-oswald uppercase text-xs',
              statusColor[status as keyof typeof statusColor]
            )}
          >
            {status === 'generating' && (
              <Loader2 size={12} className="mr-1 animate-spin" />
            )}
            {status}
          </Badge>

          {/* Aspect Ratio Badge */}
          <Badge className="absolute top-3 left-3 bg-[#333] text-[#888] font-courier text-xs">
            {aspectRatio}
          </Badge>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h4 className="font-oswald text-lg uppercase tracking-wide text-white mb-3">
          {title}
        </h4>

        {/* Model-Specific Prompts */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-[#888] text-xs font-oswald uppercase">
              AI Model Prompts
            </Label>
            {!isDisabled && !isEditingPrompt && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingPrompt(true)}
                className="h-6 px-2 text-[#888] hover:text-[#f5c518]"
              >
                <Edit2 size={12} className="mr-1" />
                Edit
              </Button>
            )}
          </div>

          {isEditingPrompt ? (
            <div className="space-y-3">
              {/* Seedream Prompt */}
              <div className="p-3 bg-[#0a0a0b] rounded-lg border border-[#333]">
                <Label className="text-[#f5c518] text-xs font-oswald uppercase mb-1 block">
                  Seedream 4.5 Prompt
                </Label>
                <Textarea
                  value={editedSeedreamPrompt}
                  onChange={(e) => setEditedSeedreamPrompt(e.target.value)}
                  className="bg-[#141416] border-[#333] text-white font-courier text-xs min-h-[80px]"
                  rows={4}
                  placeholder="Prompt optimized for Seedream 4.5..."
                />
              </div>

              {/* Nano Banana Prompt */}
              <div className="p-3 bg-[#0a0a0b] rounded-lg border border-[#333]">
                <Label className="text-[#00f2ea] text-xs font-oswald uppercase mb-1 block">
                  Nano Banana Pro Prompt
                </Label>
                <Textarea
                  value={editedNanoBananaPrompt}
                  onChange={(e) => setEditedNanoBananaPrompt(e.target.value)}
                  className="bg-[#141416] border-[#333] text-white font-courier text-xs min-h-[80px]"
                  rows={4}
                  placeholder="Prompt optimized for Nano Banana Pro..."
                />
              </div>

              {/* Save/Cancel Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSavePrompt}
                  disabled={isSavingPrompt}
                  className="bg-green-600 hover:bg-green-500 text-white"
                >
                  {isSavingPrompt ? (
                    <Loader2 size={12} className="mr-1 animate-spin" />
                  ) : (
                    <Save size={12} className="mr-1" />
                  )}
                  Save Both
                </Button>
                <Button
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSavingPrompt}
                  variant="outline"
                  className="border-[#333] text-[#888]"
                >
                  <X size={12} className="mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Initialize from Visual DNA button - shown when prompts are empty but visual_dna exists */}
              {!seedreamPrompt && !nanoBananaPrompt && character.visual_dna && (
                <Button
                  size="sm"
                  onClick={handleInitializeFromVisualDna}
                  disabled={isInitializingPrompts}
                  className="w-full bg-[#333] hover:bg-[#444] text-white mb-2"
                >
                  {isInitializingPrompts ? (
                    <Loader2 size={12} className="mr-2 animate-spin" />
                  ) : (
                    <Copy size={12} className="mr-2" />
                  )}
                  Initialize from Visual DNA
                </Button>
              )}

              {/* Seedream Prompt Display */}
              <div className="p-2 bg-[#0a0a0b] rounded border border-[#333]/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#f5c518] text-[10px] font-oswald uppercase">Seedream 4.5 Prompt</span>
                </div>
                <div className="max-h-[100px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent">
                  <p className="font-courier text-xs text-[#ccc] leading-relaxed whitespace-pre-wrap">
                    {seedreamPrompt || <span className="text-[#666]">No Seedream prompt</span>}
                  </p>
                </div>
              </div>

              {/* Nano Banana Prompt Display */}
              <div className="p-2 bg-[#0a0a0b] rounded border border-[#333]/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#00f2ea] text-[10px] font-oswald uppercase">Nano Banana Pro Prompt</span>
                </div>
                <div className="max-h-[100px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent">
                  <p className="font-courier text-xs text-[#ccc] leading-relaxed whitespace-pre-wrap">
                    {nanoBananaPrompt || <span className="text-[#666]">No Nano Banana prompt</span>}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* Actions */}
        <div className="flex flex-col gap-2">
          {/* Generate Multiple Options - with model selector */}
          {!isDisabled && status !== 'generating' && !imageUrl && !showVariants && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-[#888] text-xs font-oswald uppercase shrink-0">
                  Model:
                </Label>
                <SimpleModelSelector
                  value={selectedModel}
                  onChange={setSelectedModel}
                  disabled={isGeneratingMultiple}
                  className="flex-1"
                />
              </div>
              <Button
                onClick={handleGenerateMultiple}
                disabled={isGeneratingMultiple || (!seedreamPrompt && !nanoBananaPrompt)}
                className="w-full bg-[#f5c518] hover:bg-white text-black font-oswald uppercase tracking-wider"
              >
                {isGeneratingMultiple ? (
                  <Loader2 size={14} className="mr-2 animate-spin" />
                ) : (
                  <Wand2 size={14} className="mr-2" />
                )}
                {selectedModel === 'both' ? 'Generate 2 Options' : 'Generate Option'}
              </Button>
            </div>
          )}

          {/* View/Change Selection - when variants exist and image is selected */}
          {imageUrl && combinedVariants.length > 0 && !showVariants && !isDisabled && status !== 'generating' && (
            <Button
              onClick={() => setShowVariants(true)}
              variant="outline"
              className="w-full border-[#666] text-[#ccc] hover:border-[#f5c518] hover:text-[#f5c518]"
            >
              <Eye size={14} className="mr-2" />
              View All Variants ({combinedVariants.length})
            </Button>
          )}

          {/* Add Variant - with model selector (replaces Regenerate Single) */}
          {!isDisabled && status !== 'generating' && (imageUrl || showVariants) && (
            <div className="flex flex-col gap-2 p-2 bg-[#141416] rounded-lg border border-[#333]">
              <Label className="text-[#888] text-xs font-oswald uppercase">
                Add New Variant
              </Label>
              <div className="flex gap-2">
                <SimpleModelSelector
                  value={addVariantModel}
                  onChange={setAddVariantModel}
                  disabled={isAddingVariant}
                  singleOnly
                  className="flex-1"
                />
                <Button
                  onClick={handleAddVariant}
                  disabled={isAddingVariant || (!seedreamPrompt && !nanoBananaPrompt)}
                  size="sm"
                  className="bg-[#f5c518] hover:bg-white text-black"
                >
                  {isAddingVariant ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Generating State */}
          {status === 'generating' && (
            <Button
              disabled
              className="w-full bg-[#333] text-[#888] font-oswald uppercase tracking-wider"
            >
              <Loader2 size={14} className="mr-2 animate-spin" />
              Generating...
            </Button>
          )}

          {/* Upload Button */}
          {!isDisabled && status !== 'generating' && (
            <>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                variant="outline"
                className="w-full border-[#333] text-[#888] hover:border-[#f5c518] hover:text-[#f5c518]"
              >
                {isUploading ? (
                  <Loader2 size={14} className="mr-2 animate-spin" />
                ) : (
                  <Upload size={14} className="mr-2" />
                )}
                Upload Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </>
          )}

          {/* Refine Section - with model selector and prompt input */}
          {imageUrl && !isDisabled && status !== 'generating' && (
            <div className="flex flex-col gap-2 p-3 bg-[#0a0a0b] rounded-lg border border-[#00f2ea]/30">
              <Label className="text-[#00f2ea] text-xs font-oswald uppercase flex items-center gap-1">
                <Wand2 size={12} />
                Refine with AI (Image-to-Image)
              </Label>
              <Textarea
                value={refinementPrompt}
                onChange={(e) => setRefinementPrompt(e.target.value)}
                className="bg-[#141416] border-[#333] text-white font-courier text-xs min-h-[60px] focus:border-[#00f2ea]"
                rows={2}
                placeholder="Describe what you want to change... (e.g., 'make the lighting warmer', 'add more detail to the face')"
              />
              <div className="flex gap-2">
                <SimpleModelSelector
                  value={refineModel}
                  onChange={setRefineModel}
                  disabled={isRefining}
                  singleOnly
                  className="flex-1"
                />
                <Button
                  onClick={handleRefine}
                  disabled={isRefining || !refinementPrompt.trim()}
                  size="sm"
                  className="bg-[#00f2ea] hover:bg-white text-black px-4"
                >
                  {isRefining ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Wand2 size={14} className="mr-1" />
                      Refine
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Approve / Regenerate (MVP: All shots including portrait) */}
          {status === 'ready' && (
            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                disabled={isApproving}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-oswald uppercase tracking-wider"
              >
                {isApproving ? (
                  <Loader2 size={14} className="mr-2 animate-spin" />
                ) : (
                  <Check size={14} className="mr-2" />
                )}
                Approve
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                variant="outline"
                className="border-[#333] text-[#888] hover:border-[#f5c518] hover:text-[#f5c518]"
              >
                <RefreshCw size={14} />
              </Button>
            </div>
          )}

          {/* Approved State */}
          {status === 'approved' && (
            <div className="flex flex-col gap-2">
              <div className="w-full flex items-center justify-center gap-2 py-2 text-green-400">
                <Check size={16} />
                <span className="font-oswald uppercase tracking-wider text-sm">
                  Approved
                </span>
              </div>
              {/* View variants and Unapprove buttons */}
              <div className="flex gap-2">
                {combinedVariants.length > 0 && (
                  <Button
                    onClick={() => setShowVariants(true)}
                    variant="outline"
                    className="flex-1 border-[#333] text-[#888] hover:border-[#f5c518] hover:text-[#f5c518]"
                  >
                    <Eye size={14} className="mr-2" />
                    View ({combinedVariants.length})
                  </Button>
                )}
                <Button
                  onClick={handleUnapprove}
                  disabled={isUnapproving}
                  variant="outline"
                  className="flex-1 border-[#333] text-[#888] hover:border-amber-500 hover:text-amber-500"
                >
                  {isUnapproving ? (
                    <Loader2 size={14} className="mr-2 animate-spin" />
                  ) : (
                    <Undo2 size={14} className="mr-2" />
                  )}
                  Unapprove
                </Button>
              </div>
            </div>
          )}

          {/* Failed State */}
          {status === 'failed' && (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-oswald uppercase tracking-wider"
            >
              {isGenerating ? (
                <Loader2 size={14} className="mr-2 animate-spin" />
              ) : (
                <RefreshCw size={14} className="mr-2" />
              )}
              Retry Generation
            </Button>
          )}
        </div>
      </div>

    </div>
  );
}
