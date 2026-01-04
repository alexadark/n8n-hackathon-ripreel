/**
 * n8n MCP Client
 * High-level TypeScript client for n8n workflow integration
 *
 * This client provides a clean API for:
 * - Discovering workflows dynamically
 * - Invoking workflows with type safety
 * - Polling job status for async workflows
 *
 * Usage in Server Actions:
 * ```typescript
 * import { invokeWorkflow } from "@/lib/n8n/mcp-client";
 *
 * const result = await invokeWorkflow<ParseScriptResponse>(
 *   "break_script_into_scenes",
 *   { script_content, project_id, user_id }
 * );
 * ```
 */

// Use process.env directly to avoid server-only module import issues
import type {
  WorkflowInfo,
  DiscoverWorkflowsOptions,
  InvokeWorkflowOptions,
  WorkflowInvocationResult,
  JobStatusResult,
  N8nWorkflowError,
  BibleCharacter,
  BibleLocation,
  BibleProp,
  BibleData,
  ParseScriptResult,
  GenerateBiblePayload,
  GenerateBibleResult,
  GenerateScenesPayload,
  GenerateScenesResult,
  ApiKeys,
} from "./types";

// ============================================================================
// Workflow Discovery
// ============================================================================

/**
 * Discover available n8n workflows
 *
 * Currently uses statically configured webhooks from environment variables.
 * Future: Could query n8n API for dynamic discovery.
 *
 * @param options - Discovery options (filtering, etc.)
 * @returns Array of discovered workflows
 */
export async function discoverWorkflows(
  options: DiscoverWorkflowsOptions = {}
): Promise<WorkflowInfo[]> {
  // Static workflow registry (discovered via MCP during development)
  const workflows: WorkflowInfo[] = [
    {
      name: "break_script_into_scenes",
      id: "1TA6wjxa1CZ3uAEk",
      active: true,
      webhookUrl: process.env.N8N_PARSE_SCREENPLAY_WEBHOOK,
      webhookMethod: "POST",
    },
    {
      name: "image_generation_orchestrator",
      id: "jDyejkSUkUFy39Dk",
      active: true,
      webhookUrl: process.env.N8N_IMAGE_GENERATION_WEBHOOK,
      webhookMethod: "POST",
      description: "Universal image generator supporting Seedream 4.5, Nano Banana Pro, Flux.2",
    },
    {
      name: "image_enhancement_flux",
      id: "LC5VLGYa1Z82045s",
      active: true,
      webhookUrl: process.env.N8N_FLUX_ENHANCEMENT_WEBHOOK,
      webhookMethod: "POST",
    },
    {
      name: "video_generation_veo3",
      id: "9P08lK46cM96q9vE",
      active: true,
      webhookUrl: process.env.N8N_VIDEO_GENERATION_WEBHOOK,
      webhookMethod: "POST",
      description: "Generate sequential videos using VEO3 with Extend mode. First shot uses image-to-video, subsequent shots extend from previous.",
    },
    // Split screenplay parsing workflows (optimized for timeout avoidance)
    {
      name: "generate_bible",
      id: "Jp286Vtl5SgnFoCi",
      active: true,
      webhookUrl: process.env.N8N_GENERATE_BIBLE_WEBHOOK,
      webhookMethod: "POST",
      description: "Generate Visual Bible (characters, locations, props) from screenplay - ~2.5 min",
    },
    {
      name: "generate_scenes",
      id: "xsxcipq5geMBFkfv", // generate_scenes_orchestrator workflow
      active: true,
      webhookUrl: process.env.N8N_GENERATE_SCENES_WEBHOOK,
      webhookMethod: "POST",
      description: "Generate scene breakdown from screenplay with Bible data (orchestrator) - processes scenes in parallel batches",
    },
    // MVP workflows
    {
      name: "scene_to_shots",
      id: "NfCxtVWOW1M3h62I",
      active: true,
      webhookUrl: process.env.N8N_SCENE_TO_SHOTS_WEBHOOK,
      webhookMethod: "POST",
      description: "AI scene division into 8s shots using Claude Sonnet 4.5",
    },
    {
      name: "video_generation_simple",
      id: "jHtOZ9R8Lut4QB1d",
      active: true,
      webhookUrl: process.env.N8N_VIDEO_GENERATION_SIMPLE_WEBHOOK,
      webhookMethod: "POST",
      description: "Simple video generation (no Extend mode) - single shot per call",
    },
    {
      name: "video_trimming",
      id: "vQnowhjF6ajaB4qZ",
      active: true,
      webhookUrl: process.env.N8N_VIDEO_TRIMMING_WEBHOOK,
      webhookMethod: "POST",
      description: "Trim video clips using FFmpeg API - fast copy mode (no re-encoding)",
    },
  ];

  // Apply filters
  let filtered = workflows;

  if (options.activeOnly) {
    filtered = filtered.filter((w) => w.active);
  }

  if (options.namePattern) {
    const regex = new RegExp(options.namePattern, "i");
    filtered = filtered.filter((w) => regex.test(w.name));
  }

  return filtered;
}

/**
 * Get workflow info by name
 *
 * @param workflowName - Name of the workflow to find
 * @returns Workflow info or null if not found
 */
export async function getWorkflowByName(
  workflowName: string
): Promise<WorkflowInfo | null> {
  const workflows = await discoverWorkflows();
  return workflows.find((w) => w.name === workflowName) || null;
}

// ============================================================================
// Workflow Invocation
// ============================================================================

/**
 * Invoke an n8n workflow by name
 *
 * Supports both sync (returns data immediately) and async (uses callbacks) modes.
 *
 * @param workflowName - Name of the workflow to invoke
 * @param payload - Workflow input data
 * @param options - Invocation options (mode, timeout, etc.)
 * @returns Invocation result with execution ID and optional data
 *
 * @example
 * // Sync mode (default) - returns data immediately
 * const result = await invokeWorkflow<ParseScriptResponse>(
 *   "break_script_into_scenes",
 *   { script_content, project_id, user_id }
 * );
 *
 * @example
 * // Async mode - uses callback webhook
 * const result = await invokeWorkflow(
 *   "nano_banana_image_generation",
 *   { scene_image_id, prompt },
 *   {
 *     mode: "async",
 *     callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n/nano-banana-complete`
 *   }
 * );
 */
export async function invokeWorkflow<T = unknown>(
  workflowName: string,
  payload: Record<string, unknown>,
  options: InvokeWorkflowOptions = {}
): Promise<WorkflowInvocationResult<T>> {
  const {
    mode = "sync",
    callbackUrl,
    timeout = 30000,
    headers = {},
    apiKeys,
  } = options;

  // Find workflow
  const workflow = await getWorkflowByName(workflowName);
  if (!workflow) {
    return {
      success: false,
      error: `Workflow "${workflowName}" not found`,
    };
  }

  if (!workflow.webhookUrl) {
    return {
      success: false,
      error: `Workflow "${workflowName}" has no webhook URL configured`,
    };
  }

  // Note: callbackUrl is optional for async mode
  // n8n workflows can handle callbacks internally (e.g., KIE.ai -> n8n -> Next.js)

  console.log(`🚀 Invoking n8n workflow: ${workflowName}`, {
    mode,
    hasCallback: !!callbackUrl,
    hasApiKeys: !!apiKeys?.anthropic || !!apiKeys?.kie,
    apiKeysDebug: {
      anthropicPresent: !!apiKeys?.anthropic,
      anthropicLength: apiKeys?.anthropic?.length || 0,
      kiePresent: !!apiKeys?.kie,
      kieLength: apiKeys?.kie?.length || 0,
    },
    payloadKeys: Object.keys(payload),
  });

  try {
    // Build request payload with optional callback_url and API keys
    const requestPayload: Record<string, unknown> = { ...payload };

    // Add callback_url if in async mode
    if (mode === "async" && callbackUrl) {
      requestPayload.callback_url = callbackUrl;
    }

    // Inject API keys if provided (for user-provided credentials)
    if (apiKeys?.anthropic) {
      requestPayload.anthropic_api_key = apiKeys.anthropic;
      console.log('✅ Added anthropic_api_key to payload');
    } else {
      console.log('⚠️ No anthropic key to add:', { apiKeys });
    }
    if (apiKeys?.kie) {
      requestPayload.kie_api_key = apiKeys.kie;
      console.log('✅ Added kie_api_key to payload');
    } else {
      console.log('⚠️ No kie key to add:', { apiKeys });
    }

    // Log final payload keys (not values for security)
    console.log('📦 Final request payload keys:', Object.keys(requestPayload));

    // Invoke webhook
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | undefined;

    // Only set timeout if specified (0 means no timeout)
    if (timeout > 0) {
      timeoutId = setTimeout(() => controller.abort(), timeout);
    }

    const response = await fetch(workflow.webhookUrl, {
      method: workflow.webhookMethod || "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      console.error(`❌ n8n webhook failed: ${response.statusText}`);
      return {
        success: false,
        error: `Workflow execution failed: ${response.statusText}`,
      };
    }

    // Parse response
    const responseText = await response.text();
    let result: unknown;

    try {
      result = JSON.parse(responseText);
    } catch (error) {
      console.error("❌ Failed to parse n8n response as JSON:", error);
      return {
        success: false,
        error: "Invalid JSON response from n8n",
      };
    }

    // Parse execution ID if available
    const executionId = extractExecutionId(result);

    // Extract data based on response format
    const data = extractWorkflowData<T>(result);

    console.log(`✅ Workflow ${workflowName} invoked successfully`, {
      executionId,
      hasData: !!data,
      mode,
    });

    return {
      success: true,
      executionId,
      data,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error(`❌ Workflow ${workflowName} timed out after ${timeout}ms`);
        return {
          success: false,
          error: `Workflow execution timed out after ${timeout}ms`,
        };
      }

      console.error(`❌ Error invoking workflow ${workflowName}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Unknown error occurred",
    };
  }
}

// ============================================================================
// Job Status Polling
// ============================================================================

/**
 * Get job status for an async workflow execution
 *
 * Note: This is a placeholder for future n8n API integration.
 * Currently, status updates come via webhook callbacks.
 *
 * @param executionId - n8n execution ID
 * @returns Job status result
 */
export async function getJobStatus<T = unknown>(
  executionId: string
): Promise<JobStatusResult<T>> {
  // TODO: Implement n8n API call to get execution status
  // For now, return pending status
  console.warn("⚠️ getJobStatus is not yet implemented - use webhook callbacks for status updates");

  return {
    status: "pending",
    progress: 0,
  };
}

/**
 * Poll job status until completion
 *
 * @param executionId - n8n execution ID
 * @param options - Polling options
 * @returns Final job status result
 */
export async function pollJobStatus<T = unknown>(
  executionId: string,
  options: {
    interval?: number;
    maxAttempts?: number;
    onProgress?: (result: JobStatusResult<T>) => void;
  } = {}
): Promise<JobStatusResult<T>> {
  const { interval = 2000, maxAttempts = 30, onProgress } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await getJobStatus<T>(executionId);

    if (onProgress) {
      onProgress(status);
    }

    // Check if job is complete
    if (status.status === "success" || status.status === "failed" || status.status === "canceled") {
      return status;
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  // Timeout
  return {
    status: "failed",
    error: `Polling timed out after ${maxAttempts} attempts`,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract execution ID from n8n response
 */
function extractExecutionId(result: unknown): string | undefined {
  if (typeof result === "object" && result !== null) {
    const obj = result as Record<string, unknown>;
    if (typeof obj.execution_id === "string") {
      return obj.execution_id;
    }
    if (typeof obj.executionId === "string") {
      return obj.executionId;
    }
  }
  return undefined;
}

/**
 * Extract workflow data from n8n response
 *
 * Handles different n8n response formats:
 * 1. Direct array: [{...}, {...}]
 * 2. Array with n8n metadata: [{json: {...}, pairedItem: {...}}, ...]
 * 3. Object with data property: {data: [...]}
 * 4. Direct object: {...}
 */
function extractWorkflowData<T>(result: unknown): T | undefined {
  if (Array.isArray(result)) {
    // Check if first item has n8n metadata wrapper
    if (result.length > 0 && result[0]?.json && typeof result[0].json === "object") {
      // Extract json property from each item
      return result.map((item: { json: unknown }) => item.json) as T;
    }
    // Return array directly
    return result as T;
  }

  if (typeof result === "object" && result !== null) {
    const obj = result as Record<string, unknown>;

    // Check for data property
    if (obj.data !== undefined) {
      return obj.data as T;
    }

    // Check for scenes property (legacy format)
    if (obj.scenes !== undefined) {
      return obj.scenes as T;
    }

    // Return object directly
    return result as T;
  }

  return undefined;
}

// ============================================================================
// Convenience Functions for Specific Workflows
// ============================================================================

/**
 * Parse screenplay using n8n workflow
 *
 * Convenience wrapper for the "break_script_into_scenes" workflow
 */
export async function parseScreenplay(payload: {
  script_content: string;
  visual_style?: string;
  is_pdf: boolean;
  project_id: string;
  user_id: string;
}): Promise<ParseScriptResult> {
  // Screenplay parsing can take 2-5+ minutes depending on model and script length
  // No timeout - let the workflow complete (n8n will handle its own timeouts)
  const result = await invokeWorkflow<Array<Record<string, unknown>>>(
    "break_script_into_scenes",
    payload,
    { timeout: 0 } // No timeout - wait for completion
  );

  // Transform WorkflowInvocationResult to ParseScriptResult
  if (!result.success) {
    return {
      success: false,
      error: result.error || "Failed to parse screenplay"
    };
  }

  // Parse the n8n response data
  // n8n Merge node returns array with 2 items: [bible_data, scenes_data]
  const data = result.data;
  let bible: BibleData | undefined;
  let scenes: Array<Record<string, unknown>> | undefined;

  console.log("📦 Raw n8n data type:", Array.isArray(data) ? 'array' : typeof data);
  console.log("📦 Data length:", Array.isArray(data) ? data.length : 'N/A');

  if (Array.isArray(data) && data.length > 0) {
    // Iterate through ALL items to find Bible and scenes data
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      console.log(`📦 Item ${i} keys:`, item ? Object.keys(item) : 'null');

      if (item && typeof item === 'object') {
        // n8n can return data under 'json' or 'output' key depending on node type
        // Structured Output Parsers use 'output', regular nodes use 'json'
        let itemData: unknown;
        if ('output' in item) {
          itemData = (item as { output: unknown }).output;
          console.log(`📦 Item ${i} using 'output' key`);
        } else if ('json' in item) {
          itemData = (item as { json: unknown }).json;
          console.log(`📦 Item ${i} using 'json' key`);
        } else {
          // Item itself might be the data
          itemData = item;
          console.log(`📦 Item ${i} using item directly`);
        }

        // Check if itemData is an array (scenes returned directly as array)
        if (Array.isArray(itemData)) {
          console.log(`📦 Item ${i} data is array with length:`, itemData.length);
          // This is likely the scenes array returned directly
          if (!scenes && itemData.length > 0 && itemData[0]?.scene_number !== undefined) {
            scenes = itemData as Array<Record<string, unknown>>;
            console.log(`✅ Found scenes array directly in item ${i}:`, scenes.length);
          }
        } else if (typeof itemData === 'object' && itemData !== null) {
          // itemData is an object
          const dataObj = itemData as Record<string, unknown>;
          console.log(`📦 Item ${i} data keys:`, Object.keys(dataObj));

          // Check for Bible data (characters, locations, props)
          if (!bible && (dataObj.characters || dataObj.locations || dataObj.props)) {
            bible = {
              characters: (dataObj.characters as BibleCharacter[]) || [],
              locations: (dataObj.locations as BibleLocation[]) || [],
              props: (dataObj.props as BibleProp[]) || []
            };
            console.log(`✅ Extracted Bible data from item ${i}:`, {
              characters: bible.characters.length,
              locations: bible.locations.length,
              props: bible.props.length
            });
          }

          // Check for scenes data wrapped in object (check both 'scenes' and 'raw_scenes')
          if (!scenes) {
            if (dataObj.scenes) {
              scenes = dataObj.scenes as Array<Record<string, unknown>>;
              console.log(`✅ Found scenes in item ${i}:`, scenes.length);
            } else if (dataObj.raw_scenes) {
              scenes = dataObj.raw_scenes as Array<Record<string, unknown>>;
              console.log(`✅ Found raw_scenes in item ${i}:`, scenes.length);
            }
          }
        }
      }
    }
  } else {
    console.log("⚠️ Data is not an array or is empty");
  }

  console.log("📊 Final parse result:", {
    hasBible: !!bible,
    hasScenes: !!scenes,
    charactersCount: bible?.characters.length || 0,
    scenesCount: scenes?.length || 0
  });

  return {
    success: true,
    bible,
    scenes
  };
}

// ============================================================================
// Split Screenplay Parsing (Bible + Scenes separately)
// ============================================================================

/**
 * Generate Visual Bible from screenplay (characters, locations, props)
 *
 * This is the first step in the split workflow approach.
 * Call this first, then call generateScenes() with the Bible data.
 * Split workflow avoids the ~6 minute timeout issue.
 *
 * @param payload - Bible generation parameters
 * @param apiKeys - Optional user-provided API keys
 * @returns Bible data including characters, locations, props, inline_characters
 */
export async function generateBible(
  payload: GenerateBiblePayload,
  apiKeys?: ApiKeys
): Promise<GenerateBibleResult> {
  // Check if webhook is configured
  const workflow = await getWorkflowByName("generate_bible");
  if (!workflow?.webhookUrl) {
    console.log("⚠️ N8N_GENERATE_BIBLE_WEBHOOK not configured - falling back to combined workflow");
    // Fall back to combined parseScreenplay workflow
    const parseResult = await parseScreenplay({
      script_content: payload.script_content,
      visual_style: payload.visual_style,
      is_pdf: payload.is_pdf,
      project_id: payload.project_id,
      user_id: payload.user_id,
    });

    if (!parseResult.success || !parseResult.bible) {
      return {
        success: false,
        error: parseResult.error || "Failed to generate Bible data",
      };
    }

    return {
      success: true,
      data: {
        characters: parseResult.bible.characters,
        locations: parseResult.bible.locations,
        props: parseResult.bible.props,
      },
    };
  }

  // Bible generation takes ~2.5 minutes - no timeout
  const result = await invokeWorkflow<Array<Record<string, unknown>>>(
    "generate_bible",
    payload as unknown as Record<string, unknown>,
    { timeout: 0, apiKeys } // No timeout - wait for completion (~2.5 min)
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Failed to generate Bible",
    };
  }

  // Parse the n8n response data
  const data = result.data;
  console.log("📖 Raw Bible data from n8n:", JSON.stringify(data, null, 2).slice(0, 500));

  // Extract Bible data from response
  // n8n returns array with wrapper: [{json: {output: {...}, characters: [...], ...}}]
  let bibleOutput: Record<string, unknown> | undefined;

  if (Array.isArray(data) && data.length > 0) {
    const firstItem = data[0];
    if (firstItem && typeof firstItem === 'object') {
      // Check for 'json' wrapper (n8n format)
      if ('json' in firstItem) {
        const jsonData = (firstItem as { json: Record<string, unknown> }).json;
        bibleOutput = jsonData.output as Record<string, unknown> || jsonData;
      } else if ('output' in firstItem) {
        bibleOutput = (firstItem as { output: Record<string, unknown> }).output;
      } else {
        bibleOutput = firstItem as Record<string, unknown>;
      }
    }
  } else if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    bibleOutput = data as Record<string, unknown>;
  }

  if (!bibleOutput) {
    return {
      success: false,
      error: "Invalid response format from Bible generation",
    };
  }

  // Extract inline_characters with type safety
  type InlineCharacter = {
    name: string;
    appears_in_scenes: number[];
    inline_description_seedream: string;
    inline_description_nano_banana: string;
  };

  return {
    success: true,
    data: {
      characters: (bibleOutput.characters as BibleCharacter[]) || [],
      locations: (bibleOutput.locations as BibleLocation[]) || [],
      props: (bibleOutput.props as BibleProp[]) || [],
      inline_characters: bibleOutput.inline_characters as InlineCharacter[] | undefined,
      style_data: bibleOutput.style_data as Record<string, unknown>,
    },
  };
}

/**
 * Generate scene breakdown from screenplay with Bible data
 *
 * This is the second step in the split workflow approach.
 * Requires Bible data from generateBible() as input.
 *
 * @param payload - Scene generation parameters including Bible data
 * @param apiKeys - Optional user-provided API keys
 * @returns Scene breakdown with shots and video prompts
 */
export async function generateScenes(
  payload: GenerateScenesPayload,
  apiKeys?: ApiKeys
): Promise<GenerateScenesResult> {
  // Check if webhook is configured
  const workflow = await getWorkflowByName("generate_scenes");
  if (!workflow?.webhookUrl) {
    console.log("⚠️ N8N_GENERATE_SCENES_WEBHOOK not configured - returning empty scenes");
    // In fallback mode, scenes would have been generated by parseScreenplay
    return {
      success: false,
      error: "Scene generation workflow not configured",
    };
  }

  // Scene generation takes ~3 minutes - no timeout
  const result = await invokeWorkflow<Array<Record<string, unknown>>>(
    "generate_scenes",
    payload as unknown as Record<string, unknown>,
    { timeout: 0, apiKeys } // No timeout - wait for completion (~3 min)
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Failed to generate scenes",
    };
  }

  // Parse the n8n response data
  const data = result.data;
  console.log("🎬 Raw Scenes data from n8n:", JSON.stringify(data, null, 2).slice(0, 500));

  // Type for bible_data in scenes result
  type ScenesBibleData = {
    characters: BibleCharacter[];
    locations: BibleLocation[];
    props: BibleProp[];
    inline_characters?: Array<{
      name: string;
      appears_in_scenes: number[];
      inline_description_seedream: string;
      inline_description_nano_banana: string;
    }>;
  };

  // Extract scenes from response
  // Supports multiple formats:
  // 1. Direct object: { scenes: [...], bible_data: {...} }
  // 2. Array with json wrapper: [{ json: { scenes: [...] } }]
  // 3. Array with scenes wrapper: [{ scenes: [...] }]
  // 4. Direct array of scenes: [{ scene_number: 1, ... }, { scene_number: 2, ... }]
  let scenesOutput: Array<Record<string, unknown>> | undefined;
  let bibleData: ScenesBibleData | undefined;

  if (Array.isArray(data) && data.length > 0) {
    const firstItem = data[0];
    if (firstItem && typeof firstItem === 'object') {
      // Check for 'json' wrapper (n8n format)
      if ('json' in firstItem) {
        const jsonData = (firstItem as { json: Record<string, unknown> }).json;
        scenesOutput = jsonData.scenes as Array<Record<string, unknown>>;
        bibleData = jsonData.bible_data as ScenesBibleData | undefined;
        console.log('📦 Extracted scenes from json wrapper format:', scenesOutput?.length || 0, 'scenes');
      } else if ('scenes' in firstItem) {
        // Array with { scenes: [...] } wrapper
        scenesOutput = (firstItem as { scenes: Array<Record<string, unknown>> }).scenes;
        bibleData = (firstItem as { bible_data?: ScenesBibleData }).bible_data;
        console.log('📦 Extracted scenes from scenes wrapper format:', scenesOutput?.length || 0, 'scenes');
      } else if ('scene_number' in firstItem) {
        // Direct array of scene objects: [{ scene_number: 1, ... }, ...]
        scenesOutput = data as Array<Record<string, unknown>>;
        console.log('📦 Extracted scenes from direct array format:', scenesOutput.length, 'scenes');
      }
    }
  } else if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    // Direct object format from generate_scenes_orchestrator: { scenes: [...], bible_data: {...} }
    const dataObj = data as Record<string, unknown>;
    if ('scenes' in dataObj && Array.isArray(dataObj.scenes)) {
      scenesOutput = dataObj.scenes as Array<Record<string, unknown>>;
      bibleData = dataObj.bible_data as ScenesBibleData | undefined;
      console.log('📦 Extracted scenes from direct object format:', scenesOutput.length, 'scenes');
    }
  }

  if (!scenesOutput) {
    console.error('❌ Failed to extract scenes from response. Data type:', typeof data, 'isArray:', Array.isArray(data));
    if (typeof data === 'object' && data !== null) {
      console.error('❌ Data keys:', Object.keys(data as object));
    }
    return {
      success: false,
      error: "Invalid response format from scene generation",
    };
  }

  return {
    success: true,
    data: {
      scenes: scenesOutput,
      bible_data: bibleData,
    },
  };
}

/**
 * Generate image with universal image generator
 *
 * Supports Seedream 4.5, Nano Banana Pro, Flux.2 models
 * Works for both text-to-image and image-to-image workflows
 *
 * Image-to-Image modes:
 * - source_image_url: Single reference image (standard I2I)
 * - reference_images: Array of reference images for multi-ref I2I (Seedream supports up to 14)
 *
 * @param payload - Image generation parameters
 * @param apiKeys - Optional user-provided API keys
 * @returns Workflow invocation result with taskId
 */
export async function generateImage(payload: {
  prompt: string;
  model: string; // e.g., "seedream4.5", "nano-banana-pro", "flux.2"
  aspect_ratio?: string; // e.g., "1:1", "16:9", "9:16"
  quality?: string; // "low", "medium", "high"
  source_image_url?: string; // For single image-to-image
  reference_images?: string[]; // For multi-reference I2I (Bible injection)
  character_id?: string;
  location_id?: string;
  prop_id?: string;
  shot_type?: string; // "portrait", "three_quarter", "full_body"
  variant_id?: string; // For multi-variant generation
  next_js_callback_url?: string; // Webhook URL to receive result
}, apiKeys?: ApiKeys): Promise<WorkflowInvocationResult<{ taskId: string; message: string }>> {
  return invokeWorkflow<{ taskId: string; message: string }>(
    "image_generation_orchestrator",
    payload,
    { mode: "sync", timeout: 300000, apiKeys } // 5 minutes - Nano Banana Pro can take longer
  );
}

/**
 * Generate Bible asset image (character, location, or prop)
 *
 * Convenience wrapper for Bible-specific image generation
 *
 * @param payload - Bible asset generation parameters
 * @param apiKeys - Optional user-provided API keys
 * @returns Workflow invocation result with taskId
 */
export async function generateBibleImage(payload: {
  asset_type: "character" | "location" | "prop";
  asset_id: string;
  prompt: string;
  model: string;
  aspect_ratio?: string;
  quality?: string;
  shot_type?: "portrait" | "three_quarter" | "full_body"; // Only for characters
  variant_id?: string; // For multi-variant generation
  source_image_url?: string; // For image-to-image generation
}, apiKeys?: ApiKeys): Promise<WorkflowInvocationResult<{ taskId: string; message: string }>> {
  // Determine callback URL based on asset type
  const callbackPath = payload.asset_type === 'character'
    ? '/api/webhooks/n8n/bible/character-image'
    : payload.asset_type === 'location'
    ? '/api/webhooks/n8n/bible/location-image'
    : '/api/webhooks/n8n/bible/prop-image';

  const next_js_callback_url = `${process.env.APP_URL || 'http://localhost:5173'}${callbackPath}`;

  return generateImage({
    ...payload,
    [`${payload.asset_type}_id`]: payload.asset_id,
    next_js_callback_url,
  }, apiKeys);
}

/**
 * Enhance image with Flux
 *
 * Convenience wrapper for the "image_enhancement_flux" workflow
 */
export async function enhanceImageWithFlux(payload: {
  scene_image_id: string;
  source_image_url: string;
  enhancement_prompt: string;
  callback_url: string;
}): Promise<WorkflowInvocationResult> {
  return invokeWorkflow(
    "image_enhancement_flux",
    payload,
    { mode: "async", callbackUrl: payload.callback_url }
  );
}

// ============================================================================
// Veo 3.1 Scene Video Generation (all shots at once)
// ============================================================================

/**
 * Veo 3.1 model options
 */
export type Veo31Model = 'veo3' | 'veo3_fast';

/**
 * Veo 3.1 aspect ratios
 */
export type Veo31AspectRatio = '16:9' | '9:16' | 'Auto';

/**
 * Shot data for n8n workflow
 *
 * Veo 3.1 generates video + audio from a single prompt.
 * The prompt includes everything: action, camera, dialogue, SFX, ambient, music.
 */
export interface ShotPayloadForN8n {
  shot_id: string;
  shot_number: number;
  shot_duration_seconds: number;
  is_first_shot: boolean;
  uses_extend: boolean;

  // Complete Veo 3.1 prompt (action, camera, dialogue, SFX, music - all in one)
  prompt: string;

  // Images for Veo 3.1 first/last frame generation
  // - 1 image: start frame only (FIRST_AND_LAST_FRAMES_2_VIDEO)
  // - 2 images: start + end frame (FIRST_AND_LAST_FRAMES_2_VIDEO)
  start_frame_image_url: string | null;
  end_frame_image_url: string | null;
}

/**
 * Payload for scene video generation
 * Sends all shots to n8n which handles the generate/extend chain
 *
 * Note: model (veo3_fast) and aspectRatio (16:9) are set by default in n8n
 */
export interface SceneVideoPayload {
  scene_id: string;
  scene_number: number;
  slugline: string;
  shots: ShotPayloadForN8n[];
}

/**
 * Response from n8n with video URLs for each shot
 */
export interface SceneVideoResult {
  scene_id: string;
  shots: Array<{
    shot_id: string;
    shot_number: number;
    veo_task_id: string;
    video_url: string;
    status: 'ready' | 'failed';
    error?: string;
  }>;
}

/**
 * Generate videos for all shots in a scene using Veo 3.1
 *
 * Sends all shots to n8n in a single payload.
 * n8n handles the sequential processing internally:
 * - Shot 1: Generate API with image(s) → taskId_1
 * - Shot 2: Extend API with taskId_1 → taskId_2
 * - Shot 3: Extend API with taskId_2 → taskId_3
 *
 * n8n polls Kie.ai for each video and returns when all are complete.
 */
export async function generateSceneVideo(
  payload: SceneVideoPayload
): Promise<WorkflowInvocationResult<SceneVideoResult>> {
  // Check if webhook is configured
  const workflow = await getWorkflowByName("video_generation_veo3");
  if (!workflow?.webhookUrl) {
    console.log("⚠️ N8N_VIDEO_GENERATION_WEBHOOK not configured - mock mode");
    console.log("📦 Scene Video payload:", JSON.stringify(payload, null, 2));

    // Return mock data for testing
    return {
      success: true,
      data: {
        scene_id: payload.scene_id,
        shots: payload.shots.map((shot, index) => ({
          shot_id: shot.shot_id,
          shot_number: shot.shot_number,
          veo_task_id: `mock_task_${Date.now()}_${index}`,
          video_url: `https://mock-storage/videos/${shot.shot_id}.mp4`,
          status: 'ready' as const,
        })),
      },
    };
  }

  // This is a SYNC call - n8n will process all shots and return when complete
  // Set longer timeout since video generation takes time
  return invokeWorkflow<SceneVideoResult>(
    "video_generation_veo3",
    payload as unknown as Record<string, unknown>,
    { mode: "sync", timeout: 0 } // No timeout - wait for all videos to complete
  );
}

// ============================================================================
// Legacy Video Generation (single scene video)
// ============================================================================

/**
 * Shot data from scene's raw_scene_data
 * Matches ShotData interface in schema
 */
export interface VideoShotData {
  shot_number: number;
  shot_duration_seconds: number;
  is_first_shot: boolean;
  shot_type: string;
  composition_instruction: string | null;
  action_prompt: string;
  end_frame_instruction: string | null;
  dialogue_segment: string | null;
}

/**
 * Video generation payload for VEO 3.1
 * Includes all scene data for video + audio generation
 */
export interface VideoGenerationPayload {
  // Required fields
  scene_video_id: string;
  image_url: string;
  scene_number: number;
  slugline: string;
  callback_url: string;

  // Video prompt (action description + visual instructions)
  prompt: string;

  // Shot breakdown (from raw_scene_data.shots)
  shots?: VideoShotData[] | null;

  // Dialogue and audio
  dialogue?: string | null;
  dialogue_tone?: string | null;
  voice_type?: string | null;

  // Audio requirements
  audio?: {
    ambient?: string[] | string | null;
    sfx?: string[] | string | null;
    music_mood?: string | null;
    music?: string | null;
  } | null;

  // Characters in scene (for voice/performance reference)
  characters?: string[] | null;

  // Visual mood (for consistency)
  visual_mood?: {
    lighting?: string | null;
    color_palette?: string | null;
    atmosphere?: string | null;
  } | null;

  // Duration estimate (in seconds)
  duration_estimate?: number | null;

  // Veo 3.1 7-component prompt (if available)
  video_prompt_veo3?: {
    subject: string;
    action: string;
    scene: string;
    style: string;
    dialogue: string | null;
    sounds: string;
    technical: string;
  } | null;
}

/**
 * Response from the new VEO3 Extend workflow
 */
export interface Veo3ExtendResponse {
  success: boolean;
  totalShots: number;
  results: Array<{
    shotIndex: number;
    prompt: string;
    mode: 'generate' | 'extend';
    taskId: string;
    videoUrl: string;
    status: string;
  }>;
  videoUrls: string[];
}

/**
 * Generate video from approved scene image using VEO 3.1 with Extend mode
 *
 * Uses the new VEO3 Extend workflow which:
 * - First shot: FIRST_AND_LAST_FRAMES_2_VIDEO (image-to-video)
 * - Subsequent shots: Extend API (continues from previous video)
 * - Polling-based (no callback needed)
 * - Returns video URLs directly in response
 *
 * @param payload - Video generation parameters
 * @returns Workflow invocation result with video URL
 */
export async function generateVideo(
  payload: VideoGenerationPayload
): Promise<WorkflowInvocationResult<Veo3ExtendResponse>> {
  // Check if webhook is configured
  const workflow = await getWorkflowByName("video_generation_veo3");
  if (!workflow?.webhookUrl) {
    console.log("⚠️ N8N_VIDEO_GENERATION_WEBHOOK not configured - mock mode");
    console.log("📦 Would send to n8n:", JSON.stringify(payload, null, 2));
    return {
      success: true,
      data: {
        success: true,
        totalShots: 1,
        results: [{
          shotIndex: 0,
          prompt: payload.prompt,
          mode: 'generate',
          taskId: `mock_task_${Date.now()}`,
          videoUrl: `https://mock-storage/videos/${payload.scene_video_id}.mp4`,
          status: 'completed',
        }],
        videoUrls: [`https://mock-storage/videos/${payload.scene_video_id}.mp4`],
      },
    };
  }

  // Build shots array for n8n workflow
  // If we have shot breakdown from raw_scene_data, use it
  // Otherwise create a single shot from the prompt
  type N8nShot = {
    prompt: string;
    imageUrl: string;
    shotNumber?: number;
    duration?: number;
    isFirstShot?: boolean;
    dialogue?: string | null;
  };

  const n8nShots: N8nShot[] = [];

  if (payload.shots && payload.shots.length > 0) {
    // Use shot breakdown - each shot gets its action_prompt
    payload.shots.forEach((shot, index) => {
      n8nShots.push({
        prompt: shot.action_prompt || payload.prompt,
        imageUrl: index === 0 ? payload.image_url : '', // Only first shot needs image
        shotNumber: shot.shot_number,
        duration: shot.shot_duration_seconds,
        isFirstShot: shot.is_first_shot,
        dialogue: shot.dialogue_segment,
      });
    });
  } else {
    // Single shot - use the composed prompt
    n8nShots.push({
      prompt: payload.prompt,
      imageUrl: payload.image_url,
    });
  }

  // Format audio data for n8n
  const formatAudioArray = (value: string[] | string | null | undefined): string | null => {
    if (!value) return null;
    return Array.isArray(value) ? value.join(", ") : value;
  };

  // Infer ambient from SFX if not provided
  // Ambient sounds are typically: crowd noise, room tone, background chatter, wind, etc.
  const inferAmbient = (sfx: string | null): string | null => {
    if (!sfx) return null;
    const ambientPatterns = [
      /crowd\s*murmur/i,
      /crowd\s*chatter/i,
      /room\s*tone/i,
      /background\s*(noise|sounds?)/i,
      /distant\s+\w+/i,
      /wind/i,
      /rain/i,
      /traffic/i,
      /city\s*sounds?/i,
      /ocean/i,
      /waves/i,
      /birds?/i,
      /crickets?/i,
    ];
    const matches = ambientPatterns
      .map(p => sfx.match(p)?.[0])
      .filter(Boolean);
    return matches.length > 0 ? matches.join(", ") : null;
  };

  // Infer music_mood from music description
  const inferMusicMood = (music: string | null): string | null => {
    if (!music) return null;
    const moodPatterns = [
      /melancholic/i, /tense/i, /suspenseful/i, /romantic/i,
      /dramatic/i, /upbeat/i, /sad/i, /hopeful/i, /dark/i,
      /mysterious/i, /ominous/i, /joyful/i, /nostalgic/i,
      /intense/i, /peaceful/i, /haunting/i, /energetic/i,
    ];
    for (const pattern of moodPatterns) {
      const match = music.match(pattern);
      if (match) return match[0].toLowerCase();
    }
    // Check for tempo descriptors
    if (/slow/i.test(music)) return "slow, atmospheric";
    if (/fast|upbeat/i.test(music)) return "energetic";
    return null;
  };

  // Infer dialogue_tone from voice_type
  const inferDialogueTone = (voiceType: string | null): string | null => {
    if (!voiceType) return null;
    const tonePatterns = [
      /sultry/i, /dangerous/i, /knowing/i, /threatening/i,
      /warm/i, /cold/i, /nervous/i, /confident/i, /scared/i,
      /angry/i, /sad/i, /excited/i, /calm/i, /urgent/i,
      /whispered/i, /shouted/i, /sarcastic/i, /sincere/i,
    ];
    const matches = tonePatterns
      .map(p => voiceType.match(p)?.[0]?.toLowerCase())
      .filter(Boolean);
    return matches.length > 0 ? matches.join(", ") : null;
  };

  // Infer visual_mood from slugline
  const inferVisualMood = (slugline: string): { lighting: string; atmosphere: string; color_palette: string } | null => {
    const isNight = /night/i.test(slugline);
    const isDay = /day/i.test(slugline);
    const isInt = /^int\./i.test(slugline);
    const isExt = /^ext\./i.test(slugline);

    // Location-based mood inference
    const locationMoods: Record<string, { lighting: string; atmosphere: string; color_palette: string }> = {
      nightclub: { lighting: "dim, neon accents, spotlights", atmosphere: "smoky, intimate, noir", color_palette: "deep blues, reds, shadows" },
      bar: { lighting: "warm, low, amber", atmosphere: "intimate, moody", color_palette: "warm browns, amber, shadows" },
      office: { lighting: "fluorescent, harsh", atmosphere: "sterile, corporate", color_palette: "whites, grays, muted" },
      street: { lighting: isNight ? "streetlamps, neon signs" : "natural, harsh shadows", atmosphere: isNight ? "urban noir, dangerous" : "busy, exposed", color_palette: isNight ? "yellows, blacks, neon" : "natural, high contrast" },
      apartment: { lighting: "practical lights, warm", atmosphere: "personal, intimate", color_palette: "warm neutrals" },
      alley: { lighting: "harsh shadows, single source", atmosphere: "dangerous, claustrophobic", color_palette: "dark, high contrast" },
    };

    // Check for location keywords in slugline
    const slugLower = slugline.toLowerCase();
    for (const [location, mood] of Object.entries(locationMoods)) {
      if (slugLower.includes(location)) {
        return mood;
      }
    }

    // Default based on INT/EXT and time of day
    if (isNight && isInt) {
      return { lighting: "low key, practical lights", atmosphere: "intimate, shadowy", color_palette: "warm with deep shadows" };
    } else if (isNight && isExt) {
      return { lighting: "streetlights, moonlight", atmosphere: "noir, mysterious", color_palette: "blues, blacks, isolated warm spots" };
    } else if (isDay && isInt) {
      return { lighting: "natural window light", atmosphere: "clear, defined", color_palette: "natural, balanced" };
    } else if (isDay && isExt) {
      return { lighting: "natural sunlight", atmosphere: "open, exposed", color_palette: "bright, natural" };
    }

    return null;
  };

  // Apply inferences
  const sfxStr = formatAudioArray(payload.audio?.sfx);
  const musicStr = payload.audio?.music || null;
  const inferredAmbient = payload.audio?.ambient ? formatAudioArray(payload.audio.ambient) : inferAmbient(sfxStr);
  const inferredMusicMood = payload.audio?.music_mood || inferMusicMood(musicStr);
  const inferredDialogueTone = payload.dialogue_tone || inferDialogueTone(payload.voice_type || null);
  const inferredVisualMood = payload.visual_mood || inferVisualMood(payload.slugline);

  // Build the full payload for n8n
  const newPayload = {
    shots: n8nShots,
    model: 'veo3',
    aspectRatio: '16:9',

    // Audio data for Veo 3.1 (generates video with audio)
    audio: {
      ambient: inferredAmbient,
      sfx: sfxStr,
      music_mood: inferredMusicMood,
      music: musicStr,
    },

    // Dialogue
    dialogue: payload.dialogue || null,
    dialogue_tone: inferredDialogueTone,
    voice_type: payload.voice_type || null,

    // Characters (for voice reference)
    characters: payload.characters || null,

    // Visual mood (inferred from slugline if not provided)
    visual_mood: inferredVisualMood,

    // Duration estimate (default to 8 seconds if not provided - typical scene length)
    duration_estimate: payload.duration_estimate || 8,

    // Veo 3.1 7-component prompt (if available)
    video_prompt_veo3: payload.video_prompt_veo3 || null,

    // Scene metadata
    _metadata: {
      scene_video_id: payload.scene_video_id,
      scene_number: payload.scene_number,
      slugline: payload.slugline,
    },
  };

  console.log('🎬 Sending to VEO3 Extend workflow:', {
    shots: newPayload.shots.length,
    model: newPayload.model,
    aspectRatio: newPayload.aspectRatio,
    hasAudio: !!newPayload.audio,
    hasDialogue: !!newPayload.dialogue,
    hasVeo3Prompt: !!newPayload.video_prompt_veo3,
    firstShotPromptPreview: newPayload.shots[0]?.prompt?.substring(0, 100) + '...',
  });

  // Synchronous call - workflow polls internally and returns when complete
  // This can take several minutes per video
  return invokeWorkflow<Veo3ExtendResponse>(
    "video_generation_veo3",
    newPayload,
    { mode: "sync", timeout: 0 } // No timeout - wait for completion
  );
}

// ============================================================================
// MVP Simplified Workflows
// ============================================================================

/**
 * Shot data returned from scene-to-shots workflow
 */
export interface GeneratedShot {
  shot_number: number;
  duration_seconds: number;
  action: string;
  dialogue: string | null;
  shot_type: 'Wide' | 'Medium' | 'Close-up' | 'Over-the-shoulder' | 'POV';
  composition: string;
}

/**
 * Response from scene-to-shots workflow
 */
export interface SceneToShotsResult {
  success: boolean;
  sceneId: string;
  totalShots: number;
  totalDuration: number;
  shots: GeneratedShot[];
  error?: string;
}

/**
 * Divide a scene into 8-second narrative shots using AI (Claude Sonnet 4.5)
 *
 * MVP workflow - simpler than the full scene breakdown with Bible data.
 * Each shot is designed for VEO 3.1 video generation.
 * Uses structured JSON output for reliable parsing.
 *
 * @param payload - Scene data to divide
 * @returns Array of shots with action descriptions
 */
export async function divideSceneIntoShots(payload: {
  sceneId: string;
  sceneText: string;
  dialogue?: string | null;
  characters?: string[];
  estimatedDuration?: number;
}): Promise<WorkflowInvocationResult<SceneToShotsResult>> {
  // Check if webhook is configured
  const workflow = await getWorkflowByName("scene_to_shots");
  if (!workflow?.webhookUrl) {
    console.log("⚠️ N8N_SCENE_TO_SHOTS_WEBHOOK not configured - mock mode");
    return {
      success: true,
      data: {
        success: true,
        sceneId: payload.sceneId,
        totalShots: 3,
        totalDuration: 24,
        shots: [
          { shot_number: 1, duration_seconds: 8, action: "Mock shot 1", dialogue: null, shot_type: "Wide", composition: "Establishing" },
          { shot_number: 2, duration_seconds: 8, action: "Mock shot 2", dialogue: null, shot_type: "Medium", composition: "Character focus" },
          { shot_number: 3, duration_seconds: 8, action: "Mock shot 3", dialogue: null, shot_type: "Close-up", composition: "Detail" },
        ],
      },
    };
  }

  return invokeWorkflow<SceneToShotsResult>(
    "scene_to_shots",
    payload as unknown as Record<string, unknown>,
    { mode: "sync", timeout: 60000 } // 1 minute timeout
  );
}

/**
 * Response from simple video generation workflow
 */
export interface SimpleVideoResult {
  success: boolean;
  shotId: string;
  prompt: string;
  taskId?: string;
  videoUrl?: string;
  status: 'completed' | 'failed';
  error?: string;
  mode: 'simple';
}

/**
 * Generate a single video from an image using VEO3 (simple mode - no Extend)
 *
 * MVP workflow - generates one independent video per call.
 * Simpler than the Extend workflow which chains videos together.
 *
 * Uses FIRST_AND_LAST_FRAMES_2_VIDEO generation type with veo3_fast model.
 *
 * @param payload - Video generation parameters
 * @param apiKeys - Optional user-provided API keys
 * @returns Video URL on success
 */
export async function generateVideoSimple(payload: {
  shotId: string;
  imageUrl: string;
  prompt: string;
  duration?: number;
  model?: 'veo3' | 'veo3_fast';
  aspectRatio?: '16:9' | '9:16' | 'Auto';
}, apiKeys?: ApiKeys): Promise<WorkflowInvocationResult<SimpleVideoResult>> {
  // Check if webhook is configured
  const workflow = await getWorkflowByName("video_generation_simple");
  if (!workflow?.webhookUrl) {
    console.error("❌ N8N_VIDEO_GENERATION_SIMPLE_WEBHOOK not configured");
    return {
      success: false,
      error: "N8N_VIDEO_GENERATION_SIMPLE_WEBHOOK not configured in .env.local",
    };
  }

  // Simple mode uses veo3_fast by default for faster generation
  const videoPayload = {
    ...payload,
    model: payload.model || 'veo3_fast',
    aspectRatio: payload.aspectRatio || '16:9',
    duration: payload.duration || 8,
  };

  return invokeWorkflow<SimpleVideoResult>(
    "video_generation_simple",
    videoPayload as unknown as Record<string, unknown>,
    { mode: "sync", timeout: 0, apiKeys } // No timeout - video generation takes time
  );
}

// ============================================================================
// Video Trimming (FFmpeg API)
// ============================================================================

/**
 * Response from video trimming workflow
 */
export interface TrimVideoResult {
  success: boolean;
  videoUrl: string;
  duration: number;
  shotId: string;
  processingTime?: number;
  error?: string;
}

/**
 * Trim a video clip using FFmpeg API via n8n workflow
 *
 * Uses fast copy mode (no re-encoding) for near-instant trimming (~1-2 seconds).
 * The trimmed video URL is temporary (expires in 2 hours) - caller should
 * update the database immediately with the new URL.
 *
 * @param payload - Trim parameters
 * @returns Trimmed video URL on success
 */
export async function trimVideoClip(payload: {
  shotId: string;
  videoUrl: string;
  start: number; // Start time in seconds
  end: number;   // End time in seconds
  mode?: 'fast' | 'precise';
}): Promise<WorkflowInvocationResult<TrimVideoResult>> {
  // Check if webhook is configured
  const workflow = await getWorkflowByName("video_trimming");
  if (!workflow?.webhookUrl) {
    console.error("❌ N8N_VIDEO_TRIMMING_WEBHOOK not configured");
    return {
      success: false,
      error: "N8N_VIDEO_TRIMMING_WEBHOOK not configured in .env.local",
    };
  }

  // Validate trim points
  if (payload.start < 0) {
    return {
      success: false,
      error: "Start time cannot be negative",
    };
  }

  if (payload.end <= payload.start) {
    return {
      success: false,
      error: "End time must be greater than start time",
    };
  }

  console.log('✂️ Trimming video:', {
    shotId: payload.shotId,
    start: payload.start,
    end: payload.end,
    duration: payload.end - payload.start,
  });

  return invokeWorkflow<TrimVideoResult>(
    "video_trimming",
    payload as unknown as Record<string, unknown>,
    { mode: "sync", timeout: 60000 } // 1 minute timeout - trimming is fast
  );
}
