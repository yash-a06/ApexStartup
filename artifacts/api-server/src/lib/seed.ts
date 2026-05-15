import { db, problemsTable, usersTable, submissionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SEED_PROBLEMS, SEED_USERS } from "./seed-data";
import { logger } from "./logger";

const PASS_LIMITS = {
  soqlQueries: 2,
  soqlQueryRows: 30,
  dmlStatements: 2,
  dmlRows: 60,
  cpuTimeMs: 320,
  heapSizeBytes: 18000,
};

const FAIL_LIMITS = {
  soqlQueries: 4,
  soqlQueryRows: 80,
  dmlStatements: 3,
  dmlRows: 90,
  cpuTimeMs: 540,
  heapSizeBytes: 22000,
};

export async function seedDatabase(): Promise<void> {
  // Idempotent: check if any problems exist already
  const existing = await db.select().from(problemsTable).limit(1);
  if (existing.length > 0) {
    logger.info("Seed data already present — skipping");
    return;
  }

  logger.info("Seeding problems...");
  for (const p of SEED_PROBLEMS) {
    await db
      .insert(problemsTable)
      .values({
        slug: p.slug,
        title: p.title,
        category: p.category,
        difficulty: p.difficulty,
        kind: p.kind,
        tags: p.tags,
        statement: p.statement,
        hints: p.hints,
        starterCode: p.starterCode,
        tests: p.tests,
        featuredOrder: p.featuredOrder ?? null,
      })
      .onConflictDoNothing();
  }

  logger.info("Seeding users + submissions...");
  for (const u of SEED_USERS) {
    await db
      .insert(usersTable)
      .values({ id: u.id, username: u.username })
      .onConflictDoNothing();

    for (const sub of u.submissions ?? []) {
      const limits = sub.status === "accepted" ? PASS_LIMITS : FAIL_LIMITS;
      const problem = SEED_PROBLEMS.find((p) => p.slug === sub.problemSlug);
      if (!problem) continue;
      const results = problem.tests.map((t, i) => ({
        name: t.name,
        passed: i < sub.passedCount,
        message: i < sub.passedCount ? "Passed" : "Failed",
        hidden: t.hidden,
        executionTimeMs: 5 + Math.floor(Math.random() * 25),
      }));
      await db.insert(submissionsTable).values({
        userId: u.id,
        problemSlug: sub.problemSlug,
        code: problem.starterCode,
        status: sub.status,
        passedCount: sub.passedCount,
        totalCount: sub.totalCount,
        results,
        debugLog: [
          `Execute Anonymous compiled in ${limits.cpuTimeMs}ms`,
          `SOQL queries used: ${limits.soqlQueries}/100`,
        ],
        compileError: null,
        runtimeError: null,
        governorLimits: limits,
      });
    }
  }
  logger.info("Seeding complete");
}

export async function ensureProblemSeed(slug: string): Promise<void> {
  const found = await db
    .select()
    .from(problemsTable)
    .where(eq(problemsTable.slug, slug))
    .limit(1);
  if (found.length === 0) {
    const p = SEED_PROBLEMS.find((sp) => sp.slug === slug);
    if (p) {
      await db
        .insert(problemsTable)
        .values({
          slug: p.slug,
          title: p.title,
          category: p.category,
          difficulty: p.difficulty,
          kind: p.kind,
          tags: p.tags,
          statement: p.statement,
          hints: p.hints,
          starterCode: p.starterCode,
          tests: p.tests,
          featuredOrder: p.featuredOrder ?? null,
        })
        .onConflictDoNothing();
    }
  }
}
