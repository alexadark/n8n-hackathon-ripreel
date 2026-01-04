/**
 * Legacy Bible Route
 *
 * Redirects to the new studio-integrated Bible page.
 * The Bible page is now part of the studio layout for consistent navigation.
 *
 * Route: /projects/:id/bible -> /projects/:id/studio/bible
 */

import { redirect } from "react-router";
import type { Route } from "./+types/projects.$id.bible";

export function loader({ params }: Route.LoaderArgs) {
  return redirect(`/projects/${params.id}/studio/bible`);
}

// This component should never render due to the redirect,
// but React Router requires a default export
export default function LegacyBiblePage() {
  return null;
}
