import { useState } from "react";
import { useRevalidator } from "react-router";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { projectsAction } from "@/hooks/use-server-action";
import { getApiKeysFromStorage } from "@/hooks/use-api-keys";

interface RegenerateScenesButtonProps {
  projectId: string;
}

/**
 * Button to regenerate scenes when scene generation failed
 *
 * Triggers the n8n generate_scenes_orchestrator workflow with:
 * - PDF URL from Supabase storage
 * - Bible data from database
 * - Visual style configuration
 */
export function RegenerateScenesButton({ projectId }: RegenerateScenesButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revalidator = useRevalidator();

  const handleRegenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get API keys from localStorage
      const apiKeys = getApiKeysFromStorage();

      // Call server action via RPC
      const result = await projectsAction('regenerateScenes', projectId, apiKeys);

      if (result.success) {
        // Refresh the page to show new scenes
        revalidator.revalidate();
      } else {
        setError(result.error || "Failed to regenerate scenes");
      }
    } catch (err) {
      console.error("Error regenerating scenes:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        onClick={handleRegenerate}
        disabled={isLoading}
        className="bg-[#f5c518] hover:bg-white text-black font-oswald uppercase tracking-wider px-6 py-3"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Scenes...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            Generate Scenes
          </>
        )}
      </Button>

      {error && (
        <p className="font-courier text-red-500 text-sm text-center max-w-md">
          {error}
        </p>
      )}

      {isLoading && (
        <p className="font-courier text-[#888] text-xs text-center">
          This may take 2-3 minutes. Please wait...
        </p>
      )}
    </div>
  );
}
