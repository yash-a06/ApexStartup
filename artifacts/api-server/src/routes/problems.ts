import { Router, type IRouter } from "express";
import { eq, asc, sql } from "drizzle-orm";
import {
  db,
  problemsTable,
  submissionsTable,
} from "@workspace/db";
import {
  ListProblemsResponse,
  GetProblemResponse,
  ListFeaturedProblemsResponse,
  ListTagsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

interface ProblemAggregate {
  total: number;
  accepted: number;
}

async function getAggregates(): Promise<Record<string, ProblemAggregate>> {
  const rows = await db
    .select({
      problemSlug: submissionsTable.problemSlug,
      total: sql<number>`COUNT(*)::int`,
      accepted: sql<number>`SUM(CASE WHEN ${submissionsTable.status} = 'accepted' THEN 1 ELSE 0 END)::int`,
    })
    .from(submissionsTable)
    .groupBy(submissionsTable.problemSlug);

  const out: Record<string, ProblemAggregate> = {};
  for (const r of rows) {
    out[r.problemSlug] = { total: r.total ?? 0, accepted: r.accepted ?? 0 };
  }
  return out;
}

async function getSolvedSlugs(userId: string): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({ slug: submissionsTable.problemSlug })
    .from(submissionsTable)
    .where(
      sql`${submissionsTable.userId} = ${userId} AND ${submissionsTable.status} = 'accepted'`,
    );
  return new Set(rows.map((r) => r.slug));
}

router.get("/problems", async (req, res): Promise<void> => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const difficulty = typeof req.query.difficulty === "string" ? req.query.difficulty : undefined;
  const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
  const search = typeof req.query.search === "string" ? req.query.search.toLowerCase() : undefined;
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;

  let problems = await db.select().from(problemsTable).orderBy(asc(problemsTable.id));
  if (category) problems = problems.filter((p) => p.category === category);
  if (difficulty) problems = problems.filter((p) => p.difficulty === difficulty);
  if (tag) problems = problems.filter((p) => p.tags.includes(tag));
  if (search)
    problems = problems.filter(
      (p) =>
        p.title.toLowerCase().includes(search) ||
        p.tags.some((t) => t.toLowerCase().includes(search)),
    );

  const aggregates = await getAggregates();
  const solved = userId ? await getSolvedSlugs(userId) : new Set<string>();

  const out = problems.map((p) => {
    const agg = aggregates[p.slug] ?? { total: 0, accepted: 0 };
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      category: p.category,
      difficulty: p.difficulty,
      kind: p.kind,
      tags: p.tags,
      acceptanceRate: agg.total > 0 ? Math.round((agg.accepted / agg.total) * 1000) / 10 : 0,
      totalSubmissions: agg.total,
      solved: userId ? solved.has(p.slug) : undefined,
    };
  });

  res.json(ListProblemsResponse.parse(out));
});

router.get("/problems/featured", async (_req, res): Promise<void> => {
  const problems = await db
    .select()
    .from(problemsTable)
    .where(sql`${problemsTable.featuredOrder} IS NOT NULL`)
    .orderBy(asc(problemsTable.featuredOrder));

  const aggregates = await getAggregates();

  const out = problems.map((p) => {
    const agg = aggregates[p.slug] ?? { total: 0, accepted: 0 };
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      category: p.category,
      difficulty: p.difficulty,
      kind: p.kind,
      tags: p.tags,
      acceptanceRate: agg.total > 0 ? Math.round((agg.accepted / agg.total) * 1000) / 10 : 0,
      totalSubmissions: agg.total,
    };
  });

  res.json(ListFeaturedProblemsResponse.parse(out));
});

router.get("/problems/tags", async (_req, res): Promise<void> => {
  const problems = await db.select().from(problemsTable);
  const counts = new Map<string, number>();
  for (const p of problems) {
    for (const tag of p.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  const out = Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
  res.json(ListTagsResponse.parse(out));
});

router.get("/problems/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  if (!slug) {
    res.status(400).json({ error: "slug required" });
    return;
  }

  const [problem] = await db
    .select()
    .from(problemsTable)
    .where(eq(problemsTable.slug, slug));

  if (!problem) {
    res.status(404).json({ error: "Problem not found" });
    return;
  }

  const aggregates = await getAggregates();
  const agg = aggregates[problem.slug] ?? { total: 0, accepted: 0 };

  const sampleTests = problem.tests
    .filter((t) => !t.hidden)
    .map((t) => ({
      name: t.name,
      description: t.description,
      hidden: false,
    }));
  const hiddenTestCount = problem.tests.filter((t) => t.hidden).length;

  res.json(
    GetProblemResponse.parse({
      id: problem.id,
      slug: problem.slug,
      title: problem.title,
      category: problem.category,
      difficulty: problem.difficulty,
      kind: problem.kind,
      tags: problem.tags,
      statement: problem.statement,
      hints: problem.hints,
      starterCode: problem.starterCode,
      sampleTests,
      hiddenTestCount,
      acceptanceRate:
        agg.total > 0 ? Math.round((agg.accepted / agg.total) * 1000) / 10 : 0,
      totalSubmissions: agg.total,
    }),
  );
});

export default router;
