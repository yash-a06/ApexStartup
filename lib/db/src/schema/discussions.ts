import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const discussionsTable = pgTable("discussions", {
  id: serial("id").primaryKey(),
  problemSlug: text("problem_slug").notNull(),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Discussion = typeof discussionsTable.$inferSelect;
