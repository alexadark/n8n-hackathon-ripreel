/**
 * Hook for calling server actions from client components
 *
 * This provides a similar API to Next.js server actions but uses
 * React Router's fetcher pattern under the hood.
 *
 * Usage:
 * ```tsx
 * const { callAction, isLoading } = useServerAction();
 *
 * const handleClick = async () => {
 *   const result = await callAction('scenes', 'approveScene', sceneId);
 *   if (result.success) {
 *     toast.success('Approved!');
 *   }
 * };
 * ```
 */

import { useState, useCallback } from "react";

interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
  [key: string]: unknown;
}

export function useServerAction() {
  const [isLoading, setIsLoading] = useState(false);

  const callAction = useCallback(
    async <T = unknown>(
      module: string,
      method: string,
      ...args: unknown[]
    ): Promise<ActionResult<T>> => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/rpc", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ module, method, args }),
        });

        const result = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: result.error || `Request failed with status ${response.status}`,
          };
        }

        return result;
      } catch (error) {
        console.error("[useServerAction Error]", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Network error",
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { callAction, isLoading };
}

/**
 * Create a typed action caller for a specific module
 *
 * Usage:
 * ```tsx
 * const scenes = createModuleAction('scenes');
 *
 * // Then in component:
 * const result = await scenes.approveScene(sceneId);
 * ```
 */
export function createActionCaller(module: string) {
  return async <T = unknown>(method: string, ...args: unknown[]): Promise<ActionResult<T>> => {
    try {
      const response = await fetch("/api/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ module, method, args }),
      });

      // Safely parse JSON response
      let result: ActionResult<T>;
      try {
        const text = await response.text();
        if (!text || text.trim() === "") {
          return {
            success: false,
            error: `Empty response from server (status ${response.status})`,
          };
        }
        result = JSON.parse(text);
      } catch (parseError) {
        console.error("[createActionCaller] JSON parse error:", parseError);
        return {
          success: false,
          error: `Invalid JSON response from server: ${parseError instanceof Error ? parseError.message : "Parse error"}`,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: result.error || `Request failed with status ${response.status}`,
        };
      }

      return result;
    } catch (error) {
      console.error("[createActionCaller] Network error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  };
}

// Pre-created action callers for each module
export const scenesAction = createActionCaller("scenes");
export const projectsAction = createActionCaller("projects");
export const bibleAction = createActionCaller("bible");
export const bibleThreeShotAction = createActionCaller("bibleThreeShot");
export const sceneImagesAction = createActionCaller("sceneImages");
export const shotImagesAction = createActionCaller("shotImages");
export const shotsAction = createActionCaller("shots");
export const autoModeAction = createActionCaller("autoMode");
export const timelineAction = createActionCaller("timeline");
export const assemblyAction = createActionCaller("assembly");
export const imagesAction = createActionCaller("images");
export const visualStylesAction = createActionCaller("visualStyles");
