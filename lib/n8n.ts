/**
 * n8n Integration - Legacy Entry Point
 *
 * This file re-exports everything from the new n8n module structure
 * for backward compatibility with existing imports.
 *
 * @deprecated Import from "@/lib/n8n" which now resolves to lib/n8n/index.ts
 */

// Re-export everything from the new n8n module
export * from "./n8n/index";
export * from "./n8n/types";
