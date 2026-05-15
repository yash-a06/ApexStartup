import { Router, type IRouter } from "express";
import { eq, desc, inArray } from "drizzle-orm";
import {
  db,
  problemsTable,
  submissionsTable,
} from "@workspace/db";
import {
  CreateSubmissionResponse,
  RunCodeResponse,
  ListUserSubmissionsResponse,
  CreateSubmissionBody,
  RunCodeBody,
} from "@workspace/api-zod";
import { runProblem, deriveStatus } from "../lib/runner/engine";
import { getRunner } from "../lib/runner/registry";

const router: IRouter = Router();

router.post("/submissions/run", async (req, res): Promise<void> => {
  const parsed = RunCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const body = parsed.data;
  const runner = getRunner(body.problemSlug);
  if (!runner) {
    res.status(404).json({ error: "Unknown problem" });
    return;
  }

  const result = runProblem(runner, body.code, { onlyVisible: true });
  res.json(
    RunCodeResponse.parse({
      results: result.testResults,
      debugLog: result.debugLog,
      compileError: result.compileError,
      runtimeError: result.runtimeError,
      governorLimits: result.governorLimits,
    }),
  );
});

router.post("/submissions", async (req, res): Promise<void> => {
  const parsed = CreateSubmissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const body = parsed.data;

  const runner = getRunner(body.problemSlug);
  if (!runner) {
    res.status(404).json({ error: "Unknown problem" });
    return;
  }

  // Make sure the problem still exists in DB
  const [problem] = await db
    .select()
    .from(problemsTable)
    .where(eq(problemsTable.slug, body.problemSlug));
  if (!problem) {
    res.status(404).json({ error: "Unknown problem" });
    return;
  }

  const result = runProblem(runner, body.code, { onlyVisible: false });
  const { status, passedCount, totalCount } = deriveStatus(result);

  const [saved] = await db
    .insert(submissionsTable)
    .values({
      userId: body.userId,
      problemSlug: body.problemSlug,
      code: body.code,
      status,
      passedCount,
      totalCount,
      results: result.testResults,
      debugLog: result.debugLog,
      compileError: result.compileError,
      runtimeError: result.runtimeError,
      governorLimits: result.governorLimits,
    })
    .returning();

  if (!saved) {
    res.status(500).json({ error: "Failed to save submission" });
    return;
  }

  res.json(
    CreateSubmissionResponse.parse({
      id: saved.id,
      status: saved.status,
      passedCount: saved.passedCount,
      totalCount: saved.totalCount,
      results: saved.results,
      debugLog: saved.debugLog,
      compileError: saved.compileError,
      runtimeError: saved.runtimeError,
      governorLimits: saved.governorLimits,
      createdAt: saved.createdAt,
    }),
  );
});

router.get("/submissions/user/:userId", async (req, res): Promise<void> => {
  const userId = Array.isArray(req.params.userId)
    ? req.params.userId[0]
    : req.params.userId;
  if (!userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }

  const subs = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.userId, userId))
    .orderBy(desc(submissionsTable.createdAt))
    .limit(200);

  const slugs = Array.from(new Set(subs.map((s) => s.problemSlug)));
  const problems =
    slugs.length > 0
      ? await db
          .select()
          .from(problemsTable)
          .where(inArray(problemsTable.slug, slugs))
      : [];
  const problemMap = new Map(problems.map((p) => [p.slug, p]));

  const out = subs.map((s) => {
    const p = problemMap.get(s.problemSlug);
    return {
      id: s.id,
      problemSlug: s.problemSlug,
      problemTitle: p?.title ?? s.problemSlug,
      category: p?.category ?? "trigger",
      difficulty: p?.difficulty ?? "easy",
      status: s.status,
      passedCount: s.passedCount,
      totalCount: s.totalCount,
      createdAt: s.createdAt,
    };
  });

  res.json(ListUserSubmissionsResponse.parse(out));
});

export default router;
