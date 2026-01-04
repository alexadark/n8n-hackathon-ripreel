"use server";

import { db } from "@/lib/drizzle/db.server";
import { visualStyles, type VisualStyle, type StyleConfig } from "@/lib/drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Get all available visual styles (system + custom)
 */
export async function getVisualStyles(): Promise<VisualStyle[]> {
  const styles = await db
    .select()
    .from(visualStyles)
    .orderBy(desc(visualStyles.is_system), visualStyles.name);

  return styles;
}

/**
 * Get only system styles (predefined)
 */
export async function getSystemStyles(): Promise<VisualStyle[]> {
  const styles = await db
    .select()
    .from(visualStyles)
    .where(eq(visualStyles.is_system, true))
    .orderBy(visualStyles.name);

  return styles;
}

/**
 * Get only custom styles (user-created)
 */
export async function getCustomStyles(): Promise<VisualStyle[]> {
  const styles = await db
    .select()
    .from(visualStyles)
    .where(eq(visualStyles.is_system, false))
    .orderBy(desc(visualStyles.created_at));

  return styles;
}

/**
 * Get a single visual style by ID
 */
export async function getVisualStyleById(id: string): Promise<VisualStyle | null> {
  const [style] = await db
    .select()
    .from(visualStyles)
    .where(eq(visualStyles.id, id))
    .limit(1);

  return style || null;
}

/**
 * Get a visual style by slug
 */
export async function getVisualStyleBySlug(slug: string): Promise<VisualStyle | null> {
  const [style] = await db
    .select()
    .from(visualStyles)
    .where(eq(visualStyles.slug, slug))
    .limit(1);

  return style || null;
}

/**
 * Create a new custom style
 */
export async function createCustomStyle(data: {
  name: string;
  description: string;
  style_config: StyleConfig;
}): Promise<{ success: boolean; styleId?: string; error?: string }> {
  try {
    // Generate a URL-safe slug from the name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50);

    // Check for existing slug
    const existing = await getVisualStyleBySlug(slug);
    if (existing) {
      return {
        success: false,
        error: `A style with slug "${slug}" already exists`,
      };
    }

    const [newStyle] = await db
      .insert(visualStyles)
      .values({
        slug,
        name: data.name,
        description: data.description,
        is_system: false,
        style_config: data.style_config,
      })
      .returning({ id: visualStyles.id });

    return { success: true, styleId: newStyle.id };
  } catch (error) {
    console.error("Failed to create custom style:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create custom style",
    };
  }
}

/**
 * Update an existing custom style (only non-system styles can be updated)
 */
export async function updateCustomStyle(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    style_config: StyleConfig;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    // First check that it's not a system style
    const existing = await getVisualStyleById(id);
    if (!existing) {
      return { success: false, error: "Style not found" };
    }
    if (existing.is_system) {
      return { success: false, error: "Cannot modify system styles" };
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (data.name !== undefined) {
      updateData.name = data.name;
      // Update slug if name changed
      updateData.slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 50);
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.style_config !== undefined) {
      updateData.style_config = data.style_config;
    }

    await db
      .update(visualStyles)
      .set(updateData)
      .where(and(eq(visualStyles.id, id), eq(visualStyles.is_system, false)));

    return { success: true };
  } catch (error) {
    console.error("Failed to update custom style:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update custom style",
    };
  }
}

/**
 * Delete a custom style (only non-system styles can be deleted)
 */
export async function deleteCustomStyle(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First check that it's not a system style
    const existing = await getVisualStyleById(id);
    if (!existing) {
      return { success: false, error: "Style not found" };
    }
    if (existing.is_system) {
      return { success: false, error: "Cannot delete system styles" };
    }

    await db.delete(visualStyles).where(and(eq(visualStyles.id, id), eq(visualStyles.is_system, false)));

    return { success: true };
  } catch (error) {
    console.error("Failed to delete custom style:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete custom style",
    };
  }
}

/**
 * Duplicate a style as a custom style (for "start from" functionality)
 */
export async function duplicateStyle(
  sourceId: string,
  newName: string,
  description?: string
): Promise<{ success: boolean; styleId?: string; error?: string }> {
  try {
    const source = await getVisualStyleById(sourceId);
    if (!source) {
      return { success: false, error: "Source style not found" };
    }

    return createCustomStyle({
      name: newName,
      description: description || `Custom style based on ${source.name}`,
      style_config: source.style_config,
    });
  } catch (error) {
    console.error("Failed to duplicate style:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to duplicate style",
    };
  }
}
