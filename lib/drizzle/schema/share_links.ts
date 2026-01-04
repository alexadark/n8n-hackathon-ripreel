import { pgTable, uuid, text, boolean, integer, timestamp, index } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import type { InferSelectModel } from "drizzle-orm";

export const share_links = pgTable(
  "share_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    project_id: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    share_id: text("share_id").notNull().unique(),
    title: text("title").notNull(),
    is_active: boolean("is_active").default(true).notNull(),
    view_count: integer("view_count").default(0).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [
    index("share_link_share_id_idx").on(t.share_id),
    index("share_link_project_id_idx").on(t.project_id),
    index("share_link_is_active_idx").on(t.is_active),
  ]
);

export type ShareLink = InferSelectModel<typeof share_links>;
export type NewShareLink = typeof share_links.$inferInsert;




