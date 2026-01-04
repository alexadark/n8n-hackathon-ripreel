# n8n Workflows Documentation

**Base URL:** `https://n8n.cutzai.com`

## Available Workflows

### 1. Script to Scenes (`break_script_into_scenes`)

**Workflow ID:** `1TA6wjxa1CZ3uAEk`

**Description:** Ingests a movie script (PDF or raw text) and a visual style. Processes the text to generate two parallel structured outputs: a Visual Bible (consistent image prompts for characters/locations) and a technical Scene Breakdown (shot-by-shot camera angles and lighting).

**Webhook Endpoint:**
- **Production:** `POST https://n8n.cutzai.com/webhook/movie-script-breakdown`
- **Test:** `POST https://n8n.cutzai.com/webhook-test/movie-script-breakdown`

**Input Format:**
```json
{
  "script_content": "string (URL to PDF or raw text)",
  "visual_style": "string (neo-noir | classic-noir | thriller)",
  "is_pdf": "boolean"
}
```

**Output Format:**
```json
{
  "characters": [
    {
      "name": "CHARACTER NAME",
      "role": "Lead | Supporting | Villain",
      "img_portrait_prompt": "Extreme close-up keywords...",
      "img_three_quarter_prompt": "Medium shot keywords...",
      "img_full_body_prompt": "Full body keywords..."
    }
  ],
  "locations": [
    {
      "name": "LOCATION NAME",
      "visual_dna": "Architecture style, key furniture, textures..."
    }
  ],
  "props": [
    {
      "name": "PROP NAME",
      "visual_dna": "Object focus, material type, condition..."
    }
  ],
  "scenes": [
    {
      "scene_number": 1,
      "slugline": "INT. OFFICE - NIGHT",
      "location_ref": "OFFICE",
      "time_of_day": "NIGHT",
      "characters_present": ["LENA", "TECH"],
      "main_subject_ref": "LENA",
      "action_summary": "Lena discovers the conspiracy",
      "shot_type": "Close-Up | Medium Shot | Wide Establishing Shot | etc.",
      "composition_instruction": "Focus on USB drive in hand, blurred background...",
      "visual_atmosphere": "Sodium vapor lighting, deep shadows, high contrast...",
      "audio_requirements": {
        "sfx": "keyboard typing, door creaking",
        "music": "tension building, electronic ambience"
      }
    }
  ]
}
```

**Visual Style Definitions:**
- `neo-noir`: Fincher-esque, sodium vapor amber, cold fluorescent greens, wet pavement, 35mm
- `classic-noir`: 1940s B&W, Rembrandt lighting, venetian blinds, Dutch angles
- `thriller`: Desaturated earth tones, handheld, 16mm grain, bleach bypass

**AI Models Used:**
- Claude Sonnet 4.5 (via Anthropic)
- Backup: OpenRouter API

---

### 2. Image Generation Orchestrator (`image_generation_orchestrator`)

**Workflow ID:** `jDyejkSUkUFy39Dk`

**Description:** Asynchronous image generator. Submits prompts to KIE.ai (supporting various models like SeeDream/Flux), returns a taskId immediately, and handles callbacks to fetch the final image URL via recordInfo.

**Webhook Endpoints:**

#### Request Webhook
- **Production:** `POST https://n8n.cutzai.com/webhook/image-generation-request`
- **Test:** `POST https://n8n.cutzai.com/webhook-test/image-generation-request`

**Input Format:**
```json
{
  "prompt": "string (detailed image description)",
  "model": "string (e.g., seedream, flux)",
  "aspect_ratio": "string (1:1 | 16:9 | 9:16 | 4:3 | 3:4)",
  "quality": "string (low | medium | high)"
}
```

**Response Format:**
```json
{
  "success": true,
  "taskId": "string (KIE.ai task ID)",
  "message": "Image generation task submitted successfully"
}
```

#### Callback Webhook
- **Production:** `POST https://n8n.cutzai.com/webhook/kie-callback`
- **Test:** `POST https://n8n.cutzai.com/webhook-test/kie-callback`

**Callback Input (from KIE.ai):**
```json
{
  "taskId": "string"
}
```

**Callback Response:**
```json
{
  "taskId": "string",
  "status": "completed | failed",
  "imageUrl": "string (final generated image URL)",
  "metadata": {}
}
```

**Flow:**
1. Client sends image generation request
2. n8n submits to KIE.ai and returns taskId immediately
3. Client polls or waits for callback
4. KIE.ai calls callback webhook when image is ready
5. n8n fetches final image URL from KIE.ai recordInfo endpoint

---

### 3. Image Enhancement Flux (`image_enhancement_flux`)

**Workflow ID:** `LC5VLGYa1Z82045s`

**Description:** Image enhancement workflow (currently minimal implementation).

**Webhook Endpoint:**
- **Production:** `POST https://n8n.cutzai.com/webhook/flux-image-enhancement`
- **Test:** `POST https://n8n.cutzai.com/webhook-test/flux-image-enhancement`

**Status:** Active but minimal implementation (single webhook node)

---

### 4. Local Leads GHL (`local leads GHL`)

**Workflow ID:** `j8nQmd2IEbFt5nW5`

**Description:** Local business lead generation workflow using Google Maps scraping and email enrichment.

**Webhook Endpoint:**
- **Production:** `POST https://n8n.cutzai.com/webhook/4e44da92-f00e-4810-8df5-132343ce632a`
- **Test:** `POST https://n8n.cutzai.com/webhook-test/4e44da92-f00e-4810-8df5-132343ce632a`

**Input Format:**
```json
{
  "query": "string (business type, e.g., plumber, dentist)",
  "city": "string (target city, e.g., New York City)",
  "country code": "string (optional, two-letter country code, e.g., us, fr)",
  "number": "integer (optional, max results to scrape)"
}
```

**Output Format:**
```json
[
  {
    "title": "Business Name",
    "address": "Full address",
    "neighborhood": "Area name",
    "website": "https://example.com",
    "phone": "+1234567890",
    "totalScore": 4.5,
    "subTitle": "Business category",
    "categories": "category1,category2",
    "city": "City name",
    "countryCode": "us",
    "postalCode": "12345",
    "placeId": "Google Place ID",
    "date": "dd/mm/yyyy",
    "domain": "example.com",
    "emails": "email1@example.com,email2@example.com",
    "email_status": "verified | unverified"
  }
]
```

**External APIs Used:**
- Apify Google Maps Scraper
- AnyMailFinder Email Discovery

---

## Integration Pattern

### Using the MCP Client

```typescript
import { discoverWorkflows, invokeWorkflow } from '@/lib/n8n/mcp-client';

// Discover workflows by name
const workflow = await discoverWorkflows('break_script_into_scenes');

// Invoke workflow
const result = await invokeWorkflow('break_script_into_scenes', {
  script_content: 'https://example.com/script.pdf',
  visual_style: 'neo-noir',
  is_pdf: true
});
```

### Direct Webhook Calls

```typescript
// Using fetch
const response = await fetch('https://n8n.cutzai.com/webhook/movie-script-breakdown', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    script_content: 'https://example.com/script.pdf',
    visual_style: 'neo-noir',
    is_pdf: true
  })
});

const data = await response.json();
```

---

## Workflow Status

| Workflow | Status | Purpose | Priority |
|----------|--------|---------|----------|
| `break_script_into_scenes` | ✅ Active | Script parsing & Bible generation | **High** (Core feature) |
| `image_generation_orchestrator` | ✅ Active | Async image generation via KIE.ai | **High** (Core feature) |
| `image_enhancement_flux` | ⚠️ Minimal | Image enhancement | **Low** (Placeholder) |
| `local leads GHL` | ✅ Active | Lead generation (non-ripreel) | **Low** (Side project) |

---

## Missing Workflows (From CLAUDE.md)

According to the project documentation, the following workflows are planned but **not yet implemented**:

1. **Prompt Refinement Agent** - Iterative image improvement + Midjourney prompt optimization
2. **Image to Video** - Approved image → motion generation (Runway ML / Pika / Kling AI)
3. **Audio Asset Generation** - Parallel VO/SFX/Music creation per scene (ElevenLabs, AI Sound Gen)
4. **Assembly Line** - JSON timeline → programmatic video editor → MP4 export

**Next Steps:**
- Implement missing workflows to complete the ripreel.io production pipeline
- Add callback webhooks for Next.js to receive completion notifications
- Set up database webhooks from CLAUDE.md (`/api/webhooks/n8n/*`)
