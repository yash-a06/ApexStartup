import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, discussionsTable } from "@workspace/db";
import {
  CreateDiscussionBody,
  CreateDiscussionResponse,
  ListDiscussionsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/discussions/:problemSlug", async (req, res): Promise<void> => {
  const problemSlug = Array.isArray(req.params.problemSlug)
    ? req.params.problemSlug[0]
    : req.params.problemSlug;

  if (!problemSlug) {
    res.status(400).json({ error: "problemSlug required" });
    return;
  }

  const rows = await db
    .select()
    .from(discussionsTable)
    .where(eq(discussionsTable.problemSlug, problemSlug))
    .orderBy(desc(discussionsTable.createdAt))
    .limit(100);

  const out = rows.map((r) => ({
    id: r.id,
    problemSlug: r.problemSlug,
    userId: r.userId,
    username: r.username,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
  }));

  res.json(ListDiscussionsResponse.parse(out));
});

router.post("/discussions", async (req, res): Promise<void> => {
  const parsed = CreateDiscussionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { problemSlug, userId, username, body } = parsed.data;

  const [saved] = await db
    .insert(discussionsTable)
    .values({ problemSlug, userId, username, body })
    .returning();

  if (!saved) {
    res.status(500).json({ error: "Failed to save discussion" });
    return;
  }

  res.json(
    CreateDiscussionResponse.parse({
      id: saved.id,
      problemSlug: saved.problemSlug,
      userId: saved.userId,
      username: saved.username,
      body: saved.body,
      createdAt: saved.createdAt.toISOString(),
    }),
  );
});

router.delete("/discussions/:id", async (req, res): Promise<void> => {
  const id = parseInt(
    Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
    10,
  );
  const userId =
    typeof req.query.userId === "string" ? req.query.userId : undefined;

  if (isNaN(id)) {
    res.status(400).json({ error: "id must be a number" });
    return;
  }
  if (!userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }

  const [existing] = await db
    .select()
    .from(discussionsTable)
    .where(eq(discussionsTable.id, id));

  if (!existing) {
    res.status(404).json({ error: "Discussion not found" });
    return;
  }

  if (existing.userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db
    .delete(discussionsTable)
    .where(and(eq(discussionsTable.id, id), eq(discussionsTable.userId, userId)));

  res.status(204).send();
});

export default router;
