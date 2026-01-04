/**
 * n8n MCP Client - Usage Examples
 *
 * This file demonstrates how to use the n8n MCP client in your Server Actions.
 * These are working examples you can copy-paste into your actions.
 */

import {
  invokeWorkflow,
  parseScreenplay,
  generateImage,
  enhanceImageWithFlux,
  discoverWorkflows,
} from "@/lib/n8n";
import type { ParseScriptPayload, WorkflowInvocationResult } from "@/lib/n8n";

// ============================================================================
// Example 1: Parse Screenplay (Sync Mode)
// ============================================================================

/**
 * Parse a screenplay and get scenes immediately
 * Use in: app/actions/projects.ts
 */
export async function exampleParseScreenplay() {
  const payload: ParseScriptPayload = {
    script_content: "INT. COFFEE SHOP - DAY\n\nA detective enters...",
    project_id: "proj_123",
    user_id: "user_456",
    is_pdf: false,
    visual_style: "wes-anderson",
  };

  // Method 1: Using convenience function
  const result = await parseScreenplay(payload);

  if (result.success && result.scenes) {
    console.log(`✅ Parsed ${result.scenes.length} scenes`);
    return result.scenes;
  } else {
    console.error("❌ Parse failed:", result.error);
    throw new Error(result.error);
  }
}

// ============================================================================
// Example 2: Generate Image (Sync Mode)
// ============================================================================

/**
 * Generate image with AI model
 * Use in: app/actions/images.ts
 */
export async function exampleGenerateImage(prompt: string) {
  // Using convenience function
  const result = await generateImage({
    prompt,
    model: "seedream4.5",
    aspect_ratio: "16:9",
    quality: "high",
    next_js_callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n/image-complete`,
  });

  if (result.success) {
    console.log("✅ Image generation started:", result.data?.taskId);
    return { success: true, taskId: result.data?.taskId };
  } else {
    console.error("❌ Failed to start image generation:", result.error);
    return { success: false, error: result.error };
  }
}

// ============================================================================
// Example 3: Enhance Image (Async Mode)
// ============================================================================

/**
 * Enhance image with Flux (Phase 2)
 * Use in: app/actions/images.ts
 */
export async function exampleEnhanceImage(
  sceneImageId: string,
  sourceImageUrl: string,
  enhancementPrompt: string
) {
  const result = await enhanceImageWithFlux({
    scene_image_id: sceneImageId,
    source_image_url: sourceImageUrl,
    enhancement_prompt: enhancementPrompt,
    callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n/flux-complete`,
  });

  if (result.success) {
    console.log("✅ Enhancement started:", result.executionId);
    return { success: true, executionId: result.executionId };
  } else {
    console.error("❌ Enhancement failed:", result.error);
    return { success: false, error: result.error };
  }
}

// ============================================================================
// Example 4: Workflow Discovery
// ============================================================================

/**
 * List all available workflows
 * Use in: Admin dashboard or debug tools
 */
export async function exampleDiscoverWorkflows() {
  // Get all workflows
  const allWorkflows = await discoverWorkflows();
  console.log("All workflows:", allWorkflows);

  // Get only active workflows
  const activeWorkflows = await discoverWorkflows({ activeOnly: true });
  console.log("Active workflows:", activeWorkflows);

  // Find image-related workflows
  const imageWorkflows = await discoverWorkflows({
    namePattern: "image|nano|flux",
  });
  console.log("Image workflows:", imageWorkflows);

  return allWorkflows;
}

// ============================================================================
// Example 5: Error Handling
// ============================================================================

/**
 * Comprehensive error handling example
 */
export async function exampleErrorHandling() {
  try {
    const result = await invokeWorkflow(
      "break_script_into_scenes",
      {
        script_content: "...",
        project_id: "proj_123",
        user_id: "user_456",
        is_pdf: false,
      },
      {
        timeout: 30000, // 30 seconds
      }
    );

    if (!result.success) {
      // Handle workflow-level failure
      if (result.error?.includes("timeout")) {
        console.error("⏱️ Workflow timed out");
        // Maybe retry or notify user
      } else if (result.error?.includes("not found")) {
        console.error("🔍 Workflow not found");
        // Check workflow name or configuration
      } else {
        console.error("❌ Workflow failed:", result.error);
        // Generic error handling
      }

      return {
        success: false,
        error: result.error,
      };
    }

    // Success - use result.data
    console.log("✅ Workflow completed successfully");
    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    // Handle unexpected errors (network issues, etc.)
    console.error("💥 Unexpected error:", error);

    if (error instanceof Error) {
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
// Example 6: Batch Processing
// ============================================================================

/**
 * Process multiple scenes in parallel (with rate limiting)
 */
export async function exampleBatchProcessing(sceneIds: string[]) {
  const BATCH_SIZE = 3; // Process 3 at a time (RAM optimization)

  const results: WorkflowInvocationResult[] = [];

  for (let i = 0; i < sceneIds.length; i += BATCH_SIZE) {
    const batch = sceneIds.slice(i, i + BATCH_SIZE);

    console.log(
      `🚀 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(sceneIds.length / BATCH_SIZE)}`
    );

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map((sceneId) =>
        generateImage({
          prompt: `Scene ${sceneId} visualization`,
          model: "seedream4.5",
          next_js_callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n/image-complete`,
        })
      )
    );

    results.push(...batchResults);

    // Wait a bit before next batch to avoid overwhelming n8n
    if (i + BATCH_SIZE < sceneIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(
    `✅ Batch processing complete: ${results.filter((r) => r.success).length}/${results.length} succeeded`
  );

  return results;
}

// ============================================================================
// Example 7: Migration from Old Code
// ============================================================================

/**
 * BEFORE: Using raw fetch in lib/n8n.ts
 */
async function oldApproach(payload: ParseScriptPayload) {
  const response = await fetch(
    process.env.N8N_PARSE_SCREENPLAY_WEBHOOK || "",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(`Workflow failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * AFTER: Using MCP client
 */
async function newApproach(payload: ParseScriptPayload) {
  const result = await parseScreenplay(payload);

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.scenes;
}

// The new approach gives you:
// ✅ Type safety
// ✅ Consistent error handling
// ✅ Automatic response parsing (handles n8n metadata)
// ✅ Timeout handling
// ✅ Cleaner code
