import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const articlesTable = pgTable("articles", {
  id: text("id").primaryKey(),
  topicId: text("topic_id").notNull().unique(),
  topicName: text("topic_name").notNull(),
  roadmapId: text("roadmap_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Article = typeof articlesTable.$inferSelect;
export type InsertArticle = typeof articlesTable.$inferInsert;
