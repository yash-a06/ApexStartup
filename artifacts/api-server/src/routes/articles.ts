import { Router, type IRouter } from "express";
import { db, articlesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const ARTICLE_PROMPT = (topicName: string, roadmapTitle: string) => `
Create a complete, beginner-to-advanced learning article for a Salesforce learning platform.

Topic: ${topicName}
Salesforce Designation Context: ${roadmapTitle}

Generate the article using EXACTLY this structure (use Markdown):

# ${topicName}

## Introduction
- What this topic is
- Why it matters in Salesforce
- Real-world usage scenarios (2-3 concrete examples)

## Prerequisites
- Bullet list of what the reader should know first

## Core Concepts
Explain every important concept in detail. Use sub-headings, tables, and bullet points.

## Architecture / How It Works
Explain how this feature works internally in Salesforce. Include a flow description or diagram in text form.

## Step-by-Step Implementation
Walk through a real-world scenario end-to-end.

## Code Examples

\`\`\`apex
// Add well-commented, production-quality Apex code
\`\`\`

If relevant, include:
- Trigger code
- Async Apex (Batch / Queueable / Future / Scheduled)
- SOQL examples
- Test class with full coverage

## Best Practices
- Governor limits considerations
- Bulkification patterns
- Security best practices
- Performance optimization tips

## Common Mistakes
List 5–8 mistakes beginners commonly make, with the correct approach.

## Interview Questions

### Beginner
1. ...

### Intermediate
1. ...

### Scenario-Based
1. ...

## Practice Problems

| Level | Problem |
|-------|---------|
| Easy | ... |
| Medium | ... |
| Hard | ... |

## Assignment
One real-world mini-project assignment.

## Quiz
10 multiple-choice questions with answers.

| # | Question | A | B | C | D | Answer |
|---|----------|---|---|---|---|--------|

## Summary
Concise bullet-point revision notes covering all key points.

## Related Topics
Suggest 4–6 next topics to learn, with a one-line description each.

---

Requirements:
- Content must be original, detailed, and production-focused
- All code must be well-commented and follow Salesforce best practices
- Explanations must be practical and interview-focused
- Difficulty should range from beginner to advanced within the article
- Style should match premium docs like Trailhead, LeetCode Learn, or GeeksforGeeks
`;

router.get("/articles/:topicId", async (req, res): Promise<void> => {
  const { topicId } = req.params;
  const article = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.topicId, topicId))
    .limit(1);

  if (article.length === 0) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  res.json(article[0]);
});

router.post("/articles/:topicId/generate", async (req, res): Promise<void> => {
  const { topicId } = req.params;
  const { topicName, roadmapId, roadmapTitle } = req.body as {
    topicName: string;
    roadmapId: string;
    roadmapTitle: string;
  };

  if (!topicName || !roadmapId) {
    res.status(400).json({ error: "topicName and roadmapId are required" });
    return;
  }

  const existing = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.topicId, topicId))
    .limit(1);

  if (existing.length > 0) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write(`data: ${JSON.stringify({ content: existing[0].content, done: true, cached: true })}\n\n`);
    res.end();
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullContent = "";

  const stream = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: [
      {
        role: "system",
        content:
          "You are an expert Salesforce technical educator. Write comprehensive, accurate, and practical articles. Always include real Apex code examples with comments. Follow production-level standards.",
      },
      {
        role: "user",
        content: ARTICLE_PROMPT(topicName, roadmapTitle),
      },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullContent += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  const id = `${roadmapId}-${topicId}-${Date.now()}`;
  await db.insert(articlesTable).values({
    id,
    topicId,
    topicName,
    roadmapId,
    content: fullContent,
  });

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

router.delete("/articles/:topicId", async (req, res): Promise<void> => {
  const { topicId } = req.params;
  await db.delete(articlesTable).where(eq(articlesTable.topicId, topicId));
  res.status(204).end();
});

export default router;
