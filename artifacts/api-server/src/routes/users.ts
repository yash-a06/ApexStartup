import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import {
  db,
  usersTable,
  submissionsTable,
  problemsTable,
} from "@workspace/db";
import {
  GetUserResponse,
  GetUserStatsResponse,
  UpsertUserResponse,
  UpsertUserBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const CATEGORIES = ["trigger", "async_apex", "classes", "soql"] as const;
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

async function ensureUser(id: string, fallbackUsername?: string): Promise<{
  id: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  joinedAt: Date;
}> {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id));
  if (existing) return existing;
  const username =
    fallbackUsername && fallbackUsername.trim().length > 0
      ? fallbackUsername
      : `apex_dev_${id.slice(0, 6)}`;
  const [created] = await db
    .insert(usersTable)
    .values({ id, username })
    .returning();
  return created!;
}

async function userAggregates(userId: string): Promise<{
  solvedSlugs: Set<string>;
  totalSubmissions: number;
  totalAccepted: number;
}> {
  const acceptedRows = await db
    .selectDistinct({ slug: submissionsTable.problemSlug })
    .from(submissionsTable)
    .where(
      sql`${submissionsTable.userId} = ${userId} AND ${submissionsTable.status} = 'accepted'`,
    );

  const [counts] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      accepted: sql<number>`SUM(CASE WHEN ${submissionsTable.status} = 'accepted' THEN 1 ELSE 0 END)::int`,
    })
    .from(submissionsTable)
    .where(eq(submissionsTable.userId, userId));

  return {
    solvedSlugs: new Set(acceptedRows.map((r) => r.slug)),
    totalSubmissions: counts?.total ?? 0,
    totalAccepted: counts?.accepted ?? 0,
  };
}

router.get("/users/:userId", async (req, res): Promise<void> => {
  const userId = Array.isArray(req.params.userId)
    ? req.params.userId[0]
    : req.params.userId;
  if (!userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  const user = await ensureUser(userId);
  const { solvedSlugs, totalSubmissions } = await userAggregates(userId);

  res.json(
    GetUserResponse.parse({
      id: user.id,
      username: user.username,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      joinedAt: user.joinedAt,
      solvedCount: solvedSlugs.size,
      submissionCount: totalSubmissions,
    }),
  );
});

router.post("/users/upsert", async (req, res): Promise<void> => {
  const parsed = UpsertUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { id, username, bio, avatarUrl } = parsed.data;

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id));

  let user;
  const updateData: Record<string, unknown> = { username };
  if (bio !== undefined) updateData.bio = bio;
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

  if (existing) {
    [user] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, id))
      .returning();
  } else {
    [user] = await db
      .insert(usersTable)
      .values({ id, username, bio: bio ?? null, avatarUrl: avatarUrl ?? null })
      .returning();
  }

  if (!user) {
    res.status(500).json({ error: "Could not upsert user" });
    return;
  }

  const { solvedSlugs, totalSubmissions } = await userAggregates(user.id);

  res.json(
    UpsertUserResponse.parse({
      id: user.id,
      username: user.username,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      joinedAt: user.joinedAt,
      solvedCount: solvedSlugs.size,
      submissionCount: totalSubmissions,
    }),
  );
});

router.get("/users/:userId/stats", async (req, res): Promise<void> => {
  const userId = Array.isArray(req.params.userId)
    ? req.params.userId[0]
    : req.params.userId;
  if (!userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }

  const user = await ensureUser(userId);
  const { solvedSlugs, totalSubmissions, totalAccepted } =
    await userAggregates(userId);

  const allProblems = await db.select().from(problemsTable);

  const byCategory = CATEGORIES.map((category) => {
    const subset = allProblems.filter((p) => p.category === category);
    return {
      category,
      total: subset.length,
      solved: subset.filter((p) => solvedSlugs.has(p.slug)).length,
    };
  });
  const byDifficulty = DIFFICULTIES.map((difficulty) => {
    const subset = allProblems.filter((p) => p.difficulty === difficulty);
    return {
      difficulty,
      total: subset.length,
      solved: subset.filter((p) => solvedSlugs.has(p.slug)).length,
    };
  });

  const recentSubs = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.userId, userId))
    .orderBy(desc(submissionsTable.createdAt))
    .limit(20);
  const slugs = Array.from(new Set(recentSubs.map((s) => s.problemSlug)));
  const probMap = new Map(
    allProblems
      .filter((p) => slugs.includes(p.slug))
      .map((p) => [p.slug, p.title] as const),
  );

  // Streak: count consecutive days from today backwards with at least one submission
  const dayKeys = new Set<string>();
  for (const s of await db
    .select({ d: submissionsTable.createdAt })
    .from(submissionsTable)
    .where(eq(submissionsTable.userId, userId))) {
    const dt = s.d;
    if (dt) dayKeys.add(dt.toISOString().slice(0, 10));
  }
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (dayKeys.has(key)) streak++;
    else break;
  }

  res.json(
    GetUserStatsResponse.parse({
      userId: user.id,
      username: user.username,
      solvedCount: solvedSlugs.size,
      submissionCount: totalSubmissions,
      acceptanceRate:
        totalSubmissions > 0
          ? Math.round((totalAccepted / totalSubmissions) * 1000) / 10
          : 0,
      currentStreakDays: streak,
      byCategory,
      byDifficulty,
      recentActivity: recentSubs.map((s) => ({
        problemSlug: s.problemSlug,
        problemTitle: probMap.get(s.problemSlug) ?? s.problemSlug,
        status: s.status,
        createdAt: s.createdAt,
      })),
    }),
  );
});

export default router;
