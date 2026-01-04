# n8n Integration Library

High-level TypeScript client for n8n workflow integration with type safety and clean APIs.

## Quick Start

### Basic Workflow Invocation

```typescript
import { invokeWorkflow } from "@/lib/n8n";

// Sync mode - returns data immediately
const result = await invokeWorkflow<ParseScriptResponse>(
  "break_script_into_scenes",
  {
    script_content: "INT. COFFEE SHOP - DAY...",
    project_id: "proj_123",
    user_id: "user_456",
    is_pdf: false,
  }
);

if (result.success && result.data) {
  console.log("Parsed scenes:", result.data);
} else {
  console.error("Error:", result.error);
}
```

### Async Mode with Callbacks

```typescript
import { invokeWorkflow } from "@/lib/n8n";

// Async mode - uses webhook callback
const result = await invokeWorkflow(
  "nano_banana_image_generation",
  {
    scene_image_id: "img_789",
    prompt: "A noir detective in the rain",
  },
  {
    mode: "async",
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n/nano-banana-complete`,
  }
);

if (result.success) {
  console.log("Image generation started:", result.executionId);
  // Results will come via webhook callback
}
```

### Convenience Functions

Pre-configured wrappers for common workflows:

```typescript
import {
  parseScreenplay,
  generateNanoBananaImage,
  enhanceImageWithFlux,
} from "@/lib/n8n";

// Parse screenplay
const parseResult = await parseScreenplay({
  script_content: "...",
  project_id: "proj_123",
  user_id: "user_456",
  is_pdf: false,
  visual_style: "neo-noir",
});

// Generate image (Phase 1 - Nano Banana)
const imageResult = await generateNanoBananaImage({
  scene_image_id: "img_789",
  prompt: "A noir detective in the rain",
  callback_url: "https://yourapp.com/api/webhooks/n8n/nano-banana-complete",
});

// Enhance image (Phase 2 - Flux)
const enhanceResult = await enhanceImageWithFlux({
  scene_image_id: "img_789",
  source_image_url: "https://storage.example.com/nano-output.jpg",
  enhancement_prompt: "Add cinematic lighting and depth of field",
  callback_url: "https://yourapp.com/api/webhooks/n8n/flux-complete",
});
```

### Workflow Discovery

```typescript
import { discoverWorkflows, getWorkflowByName } from "@/lib/n8n";

// List all workflows
const workflows = await discoverWorkflows();
console.log("Available workflows:", workflows.map((w) => w.name));

// Find specific workflow
const parseWorkflow = await getWorkflowByName("break_script_into_scenes");
if (parseWorkflow) {
  console.log("Webhook URL:", parseWorkflow.webhookUrl);
}

// Filter workflows
const activeWorkflows = await discoverWorkflows({ activeOnly: true });
const imageWorkflows = await discoverWorkflows({
  namePattern: "image",
});
```

## Architecture

### Files Structure

```
lib/n8n/
├── types.ts         # TypeScript type definitions
├── mcp-client.ts    # Core MCP client implementation
├── index.ts         # Public API exports
└── README.md        # This file
```

### Response Formats

The client handles multiple n8n response formats automatically:

**Format 1: Direct Array**
```json
[
  { "scene_number": 1, "slugline": "INT. COFFEE SHOP - DAY" },
  { "scene_number": 2, "slugline": "EXT. STREET - NIGHT" }
]
```

**Format 2: n8n Metadata Wrapper**
```json
[
  {
    "json": { "scene_number": 1, "slugline": "INT. COFFEE SHOP - DAY" },
    "pairedItem": { "item": 0 }
  }
]
```

**Format 3: Object with Data Property**
```json
{
  "data": [...],
  "execution_id": "exec_123"
}
```

## Error Handling

```typescript
import { invokeWorkflow, N8nWorkflowError } from "@/lib/n8n";

try {
  const result = await invokeWorkflow("my_workflow", payload);

  if (!result.success) {
    // Handle workflow failure
    console.error("Workflow failed:", result.error);
    return;
  }

  // Use result.data
  console.log("Success:", result.data);
} catch (error) {
  if (error instanceof N8nWorkflowError) {
    console.error("n8n error:", error.workflowName, error.executionId);
  }
  throw error;
}
```

## Type Safety

All workflow payloads and responses are fully typed:

```typescript
import type {
  ParseScriptPayload,
  NanoBananaPayload,
  FluxEnhancementPayload,
  WorkflowInvocationResult,
} from "@/lib/n8n";

// Type-safe payload
const payload: ParseScriptPayload = {
  script_content: "...",
  project_id: "proj_123",
  user_id: "user_456",
  is_pdf: false,
  visual_style: "neo-noir", // ✅ Autocomplete works!
};

// Type-safe response
interface SceneData {
  scene_number: number;
  slugline: string;
  action_description: string;
}

const result: WorkflowInvocationResult<SceneData[]> =
  await invokeWorkflow("break_script_into_scenes", payload);
```

## Webhook Callbacks

Handle async workflow results in your API routes:

```typescript
// app/api/webhooks/n8n/nano-banana-complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { ImageGenerationCallback } from "@/lib/n8n";

export async function POST(request: NextRequest) {
  const callback: ImageGenerationCallback = await request.json();

  if (callback.status === "ready" && callback.image_url) {
    // Update database with generated image
    await db.update(scene_images)
      .set({ image_url: callback.image_url, status: "ready" })
      .where(eq(scene_images.id, callback.scene_image_id));
  }

  return NextResponse.json({ success: true });
}
```

## Environment Variables

Required in `.env.local`:

```bash
# n8n Workflow Webhooks (discovered via MCP)
N8N_PARSE_SCREENPLAY_WEBHOOK="https://n8n.example.com/webhook/movie-script-breakdown"
N8N_NANO_BANANA_WEBHOOK="https://n8n.example.com/webhook/nano-banana-image-generation"
N8N_FLUX_ENHANCEMENT_WEBHOOK="https://n8n.example.com/webhook/flux-image-enhancement"
```

## Adding New Workflows

1. **Add webhook URL to `.env.local`:**
   ```bash
   N8N_MY_NEW_WORKFLOW_WEBHOOK="https://n8n.example.com/webhook/my-workflow"
   ```

2. **Add to `lib/env.ts` validation:**
   ```typescript
   N8N_MY_NEW_WORKFLOW_WEBHOOK: z.string().url(),
   ```

3. **Add to workflow registry in `mcp-client.ts`:**
   ```typescript
   {
     name: "my_new_workflow",
     id: "workflow_id_from_n8n",
     active: true,
     webhookUrl: env.N8N_MY_NEW_WORKFLOW_WEBHOOK,
     webhookMethod: "POST",
   }
   ```

4. **Create convenience function (optional):**
   ```typescript
   export async function myNewWorkflow(payload: MyPayload) {
     return invokeWorkflow("my_new_workflow", payload);
   }
   ```

## Migration from Old Code

**Before (lib/n8n.ts):**
```typescript
const response = await fetch(env.N8N_PARSE_SCREENPLAY_WEBHOOK, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
const data = await response.json();
```

**After (lib/n8n/mcp-client.ts):**
```typescript
import { parseScreenplay } from "@/lib/n8n";

const result = await parseScreenplay(payload);
if (result.success) {
  const data = result.data;
}
```

## Future Enhancements

- [ ] Dynamic workflow discovery via n8n API
- [ ] Job status polling via n8n API (currently webhook-only)
- [ ] Retry logic with exponential backoff
- [ ] Request caching for workflow discovery
- [ ] Metrics and monitoring integration

## Support

For issues or questions:
- Check n8n workflow logs at https://n8n.cutzai.com
- Review webhook callback logs in your API routes
- Use `console.log` in `mcp-client.ts` for debugging
