import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import {
  db,
  usersTable,
  submissionsTable,
  problemsTable,
} from "@workspace/db";
import {
  GetPlatformStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const CATEGORIES = ["trigger", "async_apex", "classes", "soql"] as const;
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

router.get("/stats/platform", async (_req, res): Promise<void> => {
  const [problems, [submissionsCount], [usersCount]] = await Promise.all([
    db.select().from(problemsTable),
    db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(submissionsTable),
    db.select({ c: sql<number>`COUNT(*)::int` }).from(usersTable),
  ]);

  res.json(
    GetPlatformStatsResponse.parse({
      totalProblems: problems.length,
      totalSubmissions: submissionsCount?.c ?? 0,
      totalUsers: usersCount?.c ?? 0,
      byCategory: CATEGORIES.map((category) => ({
        category,
        count: problems.filter((p) => p.category === category).length,
      })),
      byDifficulty: DIFFICULTIES.map((difficulty) => ({
        difficulty,
        count: problems.filter((p) => p.difficulty === difficulty).length,
      })),
    }),
  );
});

export default router;
