"use server";

import { db } from '@/lib/drizzle/db.server';
import { scenes as scenesTable, projects } from '@/lib/drizzle/schema';
import { eq, and } from 'drizzle-orm';

export type ActionResult =
  | { success: true; approvedCount?: number }
  | { success: false; error: string };

/**
 * Approve a single scene
 * Sets validation_status to "approved" and approved_at timestamp
 * Checks if all project scenes are approved and updates project status
 */
export async function approveScene(sceneId: string): Promise<ActionResult> {
  try {
    console.log('✅ Approving scene:', sceneId);

    // Get the scene to find its project
    const [scene] = await db
      .select()
      .from(scenesTable)
      .where(eq(scenesTable.id, sceneId))
      .limit(1);

    if (!scene) {
      return {
        success: false,
        error: 'Scene not found',
      };
    }

    // Update scene to approved
    await db
      .update(scenesTable)
      .set({
        validation_status: 'approved',
        approved_at: new Date(),
      })
      .where(eq(scenesTable.id, sceneId));

    // Check if all scenes for this project are now approved
    const allScenes = await db
      .select()
      .from(scenesTable)
      .where(eq(scenesTable.project_id, scene.project_id));

    const allApproved = allScenes.every(
      (s) => s.validation_status === 'approved'
    );

    // If all scenes approved, update project status to asset_generation
    if (allApproved) {
      console.log(
        '🎉 All scenes approved for project:',
        scene.project_id,
        '- updating project status'
      );
      await db
        .update(projects)
        .set({ status: 'asset_generation' })
        .where(eq(projects.id, scene.project_id));
    }

    console.log('✅ Scene approved successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error approving scene:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve scene',
    };
  }
}

/**
 * Reset scene to pending status (reject/un-approve)
 * Useful if user wants to re-edit an approved scene
 */
export async function rejectScene(sceneId: string): Promise<ActionResult> {
  try {
    console.log('⏪ Resetting scene to pending:', sceneId);

    const [scene] = await db
      .select()
      .from(scenesTable)
      .where(eq(scenesTable.id, sceneId))
      .limit(1);

    if (!scene) {
      return {
        success: false,
        error: 'Scene not found',
      };
    }

    // Reset to pending
    await db
      .update(scenesTable)
      .set({
        validation_status: 'pending',
        approved_at: null,
      })
      .where(eq(scenesTable.id, sceneId));

    // Also reset project status if it was at asset_generation
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, scene.project_id))
      .limit(1);

    if (project && project.status === 'asset_generation') {
      await db
        .update(projects)
        .set({ status: 'scene_validation' })
        .where(eq(projects.id, scene.project_id));
    }

    console.log('✅ Scene reset to pending');
    return { success: true };
  } catch (error) {
    console.error('❌ Error rejecting scene:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject scene',
    };
  }
}

/**
 * Approve all pending scenes for a project at once
 * Batch operation with transaction-like behavior
 */
export async function approveAllScenes(
  projectId: string
): Promise<ActionResult> {
  try {
    console.log('✅ Approving all scenes for project:', projectId);

    // Get all pending scenes for this project
    const pendingScenes = await db
      .select()
      .from(scenesTable)
      .where(
        and(
          eq(scenesTable.project_id, projectId),
          eq(scenesTable.validation_status, 'pending')
        )
      );

    if (pendingScenes.length === 0) {
      return {
        success: true,
        approvedCount: 0,
      };
    }

    console.log(`📝 Approving ${pendingScenes.length} pending scenes`);

    // Update all pending scenes to approved
    await db
      .update(scenesTable)
      .set({
        validation_status: 'approved',
        approved_at: new Date(),
      })
      .where(
        and(
          eq(scenesTable.project_id, projectId),
          eq(scenesTable.validation_status, 'pending')
        )
      );

    // Update project status to asset_generation
    await db
      .update(projects)
      .set({ status: 'asset_generation' })
      .where(eq(projects.id, projectId));

    console.log(
      `✅ Approved ${pendingScenes.length} scenes and updated project status`
    );

    return {
      success: true,
      approvedCount: pendingScenes.length,
    };
  } catch (error) {
    console.error('❌ Error approving all scenes:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to approve all scenes',
    };
  }
}








