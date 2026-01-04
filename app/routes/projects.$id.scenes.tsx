/**
 * Legacy Scenes Route
 *
 * Redirects to the new studio-integrated Scenes page.
 * The Scenes page is now part of the studio layout for consistent navigation.
 *
 * Route: /projects/:id/scenes -> /projects/:id/studio/scenes
 */

import { redirect } from "react-router";
import type { Route } from "./+types/projects.$id.scenes";

export function loader({ params }: Route.LoaderArgs) {
  return redirect(`/projects/${params.id}/studio/scenes`);
}

// This component should never render due to the redirect,
// but React Router requires a default export
export default function LegacyScenesPage() {
  return null;
}
