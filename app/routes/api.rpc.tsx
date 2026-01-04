/**
 * RPC Route for Server Actions
 *
 * This route handles all server action calls from client components.
 * Client components use the useServerAction hook to call this endpoint.
 *
 * Route: POST /api/rpc
 */

import { data, type ActionFunctionArgs } from "react-router";

// Import all server action modules
import * as scenes from "@/app/actions/scenes.server";
import * as projects from "@/app/actions/projects.server";
import * as bible from "@/app/actions/bible.server";
import * as bibleThreeShot from "@/app/actions/bible-three-shot.server";
import * as sceneImages from "@/app/actions/scene-images.server";
import * as shotImages from "@/app/actions/shot-images.server";
import * as shots from "@/app/actions/shots.server";
import * as autoMode from "@/app/actions/auto-mode.server";
import * as timeline from "@/app/actions/timeline.server";
import * as assembly from "@/app/actions/assembly.server";
import * as images from "@/app/actions/images.server";
import * as visualStyles from "@/app/actions/visual-styles.server";

// Map of module names to their exports
const modules: Record<string, Record<string, Function>> = {
  scenes,
  projects,
  bible,
  bibleThreeShot,
  sceneImages,
  shotImages,
  shots,
  autoMode,
  timeline,
  assembly,
  images,
  visualStyles,
};

export async function action({ request }: ActionFunctionArgs) {
  try {
    const body = await request.json();
    const { module: moduleName, method, args = [] } = body;

    // Validate module exists
    const mod = modules[moduleName];
    if (!mod) {
      return data({ success: false, error: `Unknown module: ${moduleName}` }, { status: 400 });
    }

    // Validate method exists
    const fn = mod[method];
    if (typeof fn !== "function") {
      return data(
        { success: false, error: `Unknown method: ${moduleName}.${method}` },
        { status: 400 }
      );
    }

    // Call the server function
    const result = await fn(...args);
    return data(result);
  } catch (error) {
    console.error("[RPC Error]", error);
    return data(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
