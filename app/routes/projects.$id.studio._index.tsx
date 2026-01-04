/**
 * Studio Index Route
 *
 * Redirects to the Bible page (Bible-First Architecture).
 * The studio index automatically takes users to the first step.
 *
 * Route: /projects/:id/studio
 */

import { redirect } from "react-router";
import type { Route } from "./+types/projects.$id.studio._index";

export function loader({ params }: Route.LoaderArgs) {
  // Redirect to Bible page under studio layout (Bible-First Architecture)
  return redirect(`/projects/${params.id}/studio/bible`);
}

// This component should never render due to the redirect,
// but React Router requires a default export
export default function StudioIndex() {
  return null;
}
