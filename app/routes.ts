import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  // Home page
  index("routes/_index.tsx"),

  // Projects
  route("projects", "routes/projects._index.tsx"),
  route("projects/new", "routes/projects.new.tsx"),

  // Project Studio (nested layout with sidebar)
  route("projects/:id/studio", "routes/projects.$id.studio.tsx", [
    index("routes/projects.$id.studio._index.tsx"),
    route("bible", "routes/projects.$id.studio.bible.tsx"),
    route("scenes", "routes/projects.$id.studio.scenes.tsx"),
    route("images", "routes/projects.$id.studio.images.tsx"),
    route("video", "routes/projects.$id.studio.video.tsx"),
    route("timeline", "routes/projects.$id.studio.timeline.tsx"),
    route("export", "routes/projects.$id.studio.export.tsx"),
  ]),

  // Legacy redirects
  route("projects/:id/bible", "routes/projects.$id.bible.tsx"),
  route("projects/:id/scenes", "routes/projects.$id.scenes.tsx"),

  // Settings
  route("settings", "routes/settings.tsx"),

  // Legal pages
  route("terms", "routes/terms.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("cookies", "routes/cookies.tsx"),

  // API RPC endpoint for server actions from client components
  route("api/rpc", "routes/api.rpc.tsx"),

  // API Resource Routes (webhooks from n8n)
  route(
    "api/webhooks/n8n/scene-image-variant",
    "routes/api.webhooks.n8n.scene-image-variant.tsx"
  ),
  route(
    "api/webhooks/n8n/video-generated",
    "routes/api.webhooks.n8n.video-generated.tsx"
  ),
  route(
    "api/webhooks/n8n/bible-parsed",
    "routes/api.webhooks.n8n.bible-parsed.tsx"
  ),
  route(
    "api/webhooks/n8n/bible/character-image",
    "routes/api.webhooks.n8n.bible.character-image.tsx"
  ),
  route(
    "api/webhooks/n8n/bible/location-image",
    "routes/api.webhooks.n8n.bible.location-image.tsx"
  ),
  route(
    "api/webhooks/n8n/bible/prop-image",
    "routes/api.webhooks.n8n.bible.prop-image.tsx"
  ),
  route(
    "api/webhooks/n8n/nano-banana-complete",
    "routes/api.webhooks.n8n.nano-banana-complete.tsx"
  ),
  route(
    "api/webhooks/n8n/flux-complete",
    "routes/api.webhooks.n8n.flux-complete.tsx"
  ),
  route("api/projects/:projectId/status", "routes/api.projects.$projectId.status.tsx"),
  route("api/bible/reset", "routes/api.bible.reset.tsx"),
  route("api/bible/cleanup", "routes/api.bible.cleanup.tsx"),

  // 404 catch-all
  route("*", "routes/$.tsx"),
] satisfies RouteConfig;
