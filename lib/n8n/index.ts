/**
 * n8n Integration - Main Entry Point
 *
 * This module provides a clean, type-safe interface for n8n workflow integration.
 *
 * @example Basic workflow invocation
 * ```typescript
 * import { invokeWorkflow } from "@/lib/n8n";
 *
 * const result = await invokeWorkflow("break_script_into_scenes", {
 *   script_content: "...",
 *   project_id: "123",
 *   user_id: "456"
 * });
 * ```
 *
 * @example Workflow discovery
 * ```typescript
 * import { discoverWorkflows, getWorkflowByName } from "@/lib/n8n";
 *
 * const workflows = await discoverWorkflows({ activeOnly: true });
 * const parseWorkflow = await getWorkflowByName("break_script_into_scenes");
 * ```
 *
 * @example Convenience functions
 * ```typescript
 * import { parseScreenplay, generateBibleImage } from "@/lib/n8n";
 *
 * const parseResult = await parseScreenplay({
 *   script_content: "...",
 *   project_id: "123",
 *   user_id: "456",
 *   is_pdf: false
 * });
 *
 * const imageResult = await generateBibleImage({
 *   asset_type: "character",
 *   asset_id: "abc",
 *   prompt: "...",
 *   model: "seedream-4.5-text-to-image"
 * });
 * ```
 */

// ============================================================================
// MCP Client Exports
// ============================================================================

export {
  discoverWorkflows,
  getWorkflowByName,
  invokeWorkflow,
  getJobStatus,
  pollJobStatus,
  parseScreenplay,
  generateBible,
  generateScenes,
  generateImage,
  generateBibleImage,
  generateVideoSimple,
  enhanceImageWithFlux,
} from "./mcp-client";

// Alias for backward compatibility
export { parseScreenplay as parseScript } from "./mcp-client";

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Workflow Discovery
  WorkflowInfo,
  DiscoverWorkflowsOptions,

  // Workflow Invocation
  WorkflowExecutionMode,
  InvokeWorkflowOptions,
  WorkflowInvocationResult,
  ApiKeys,

  // Job Status
  JobStatus,
  JobStatusResult,

  // Workflow Payloads
  ParseScriptPayload,
  NanoBananaPayload,
  FluxEnhancementPayload,
  ImageToVideoPayload,
  AudioGenerationPayload,
  AssemblyPayload,

  // Webhook Callbacks
  WebhookCallback,
  SceneParseCallback,
  ImageGenerationCallback,
  VideoGenerationCallback,
  AudioGenerationCallback,
  AssemblyProgressCallback,
  AssemblyCompleteCallback,

  // Bible Data Types
  BibleCharacter,
  BibleLocation,
  BibleProp,
  BibleData,
  ParseScriptResult,

  // Split Workflow Types
  GenerateBiblePayload,
  GenerateBibleResult,
  GenerateScenesPayload,
  GenerateScenesResult,

  // Errors
  N8nWorkflowError,
  N8nDiscoveryError,
} from "./types";
