'use client';

import { useState } from 'react';
import { useRevalidator } from 'react-router';
import { Wand2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { autoModeAction } from '@/hooks/use-server-action';
import { getApiKeysFromStorage } from '@/hooks/use-api-keys';

interface AutoGenerateButtonProps {
  projectId: string;
  sceneCount: number;
}

export function AutoGenerateButton({ projectId, sceneCount }: AutoGenerateButtonProps) {
  const revalidator = useRevalidator();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAutoGenerate = async () => {
    if (sceneCount === 0) {
      toast.error('No scenes to generate images for');
      return;
    }

    setIsGenerating(true);
    toast.info(`Generating images for ${sceneCount} scenes...`);

    try {
      const apiKeys = getApiKeysFromStorage();
      const result = await autoModeAction('autoGenerateAllSceneImages', projectId, apiKeys);
      if (result.success) {
        toast.success(`Started generating ${result.stats?.variants || 0} variants`);
        revalidator.revalidate();
      } else {
        toast.error(result.error || 'Failed to generate images');
      }
    } catch (error) {
      console.error('Error auto-generating scene images:', error);
      toast.error('Failed to generate images');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleAutoGenerate}
      disabled={isGenerating || sceneCount === 0}
      variant="outline"
      className="border-[#f5c518] text-[#f5c518] hover:bg-[#f5c518] hover:text-black"
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Wand2 className="mr-2 h-4 w-4" />
          Auto Generate All Images
        </>
      )}
    </Button>
  );
}
