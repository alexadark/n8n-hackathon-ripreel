import { pgTable, uuid, text, boolean, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { projectStatusEnum } from "./enums";
import { visualStyles } from "./visual-styles";
import type { InferSelectModel } from "drizzle-orm";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    screenplay_filename: text("screenplay_filename").notNull(),
    screenplay_storage_path: text("screenplay_storage_path").notNull(),
    // Style slug (text) - matches visual_styles.slug or custom identifier
    visual_style: text("visual_style").default("classic-noir").notNull(),
    // New: FK to visual_styles table with full style config
    visual_style_id: uuid("visual_style_id").references(() => visualStyles.id),
    style_locked: boolean("style_locked").default(false).notNull(),
    // Auto mode: generates Bible assets (portraits + locations) automatically after parsing
    auto_mode: boolean("auto_mode").default(false).notNull(),
    status: projectStatusEnum("status").default("parsing").notNull(),
    n8n_parse_job_id: text("n8n_parse_job_id"),
    total_duration_seconds: integer("total_duration_seconds"),
    scene_order: jsonb("scene_order"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("project_status_idx").on(t.status),
    index("project_created_at_idx").on(t.created_at),
  ]
);

export type Project = InferSelectModel<typeof projects>;
export type NewProject = typeof projects.$inferInsert;




