import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export type SubmissionStatus =
  | "accepted"
  | "wrong_answer"
  | "runtime_error"
  | "compile_error"
  | "time_limit_exceeded"
  | "governor_limit_exceeded";

export interface StoredTestResult {
  name: string;
  passed: boolean;
  message: string;
  hidden: boolean;
  executionTimeMs: number;
}

export interface StoredGovernorLimits {
  soqlQueries: number;
  soqlQueryRows: number;
  dmlStatements: number;
  dmlRows: number;
  cpuTimeMs: number;
  heapSizeBytes: number;
}

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  problemSlug: text("problem_slug").notNull(),
  code: text("code").notNull(),
  status: text("status").$type<SubmissionStatus>().notNull(),
  passedCount: integer("passed_count").notNull(),
  totalCount: integer("total_count").notNull(),
  results: jsonb("results").$type<StoredTestResult[]>().notNull().default([]),
  debugLog: jsonb("debug_log").$type<string[]>().notNull().default([]),
  compileError: text("compile_error"),
  runtimeError: text("runtime_error"),
  governorLimits: jsonb("governor_limits")
    .$type<StoredGovernorLimits>()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Submission = typeof submissionsTable.$inferSelect;
