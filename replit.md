# Apex Arena

A LeetCode-style coding practice platform for Salesforce Apex developers. Practice triggers, async Apex, classes, and SOQL with a real code editor, simulated execution engine with governor limits, and a leaderboard.

## Architecture

This is a pnpm monorepo with three workspace artifacts:

- `artifacts/apex-arena` — React + Vite frontend (the user-facing web app at `/`)
- `artifacts/api-server` — Express API server (mounted at `/api`, default port from `PORT`)
- `artifacts/mockup-sandbox` — Vite mockup sandbox for canvas previews (unused in production)

Shared libraries:

- `lib/api-spec` — OpenAPI 3.1 spec; runs Orval codegen for both `api-client-react` and `api-zod`
- `lib/api-client-react` — Generated React Query hooks (consumed by the frontend)
- `lib/api-zod` — Generated Zod schemas (used by the API server for request/response validation)
- `lib/db` — Drizzle ORM schema and database client (PostgreSQL via `DATABASE_URL`)

## Database

PostgreSQL via Replit-managed `DATABASE_URL`. Tables:

- `users(id, username, joined_at)`
- `problems(id, slug, title, category, difficulty, kind, tags, statement, hints, starter_code, tests, featured_order)`
- `submissions(id, user_id, problem_slug, code, status, passed_count, total_count, results, debug_log, compile_error, runtime_error, governor_limits, created_at)`

Schemas live in `lib/db/src/schema/`. Push changes with `pnpm --filter @workspace/db run push`.

## Simulated Execution Engine

The API server analyzes Apex source code statically (no real Salesforce environment). The engine in `artifacts/api-server/src/lib/runner/` does:

- Strips comments and string literals to enable safe regex checks.
- Estimates governor limits (SOQL count, DML count, CPU time, heap) from patterns in the source.
- Each problem has a runner (`registry.ts`) defining test specs that pattern-match the user's code.
- Hidden tests are only run on `/submissions` (Submit), not `/submissions/run` (Run).

The 20 problem runners cover the four Apex categories. Status derivation logic in `engine.ts#deriveStatus` translates pass counts into `accepted | wrong_answer | runtime_error | compile_error | governor_limit_exceeded`.

## Authentication

Replit-managed Clerk Auth (`@clerk/react` on frontend, `@clerk/express` on server). Keys auto-provisioned via `setupClerkWhitelabelAuth()`.

- `/sign-in` and `/sign-up` — Branded Clerk-hosted forms with dark theme, electric-cyan primary, and the Apex Arena logo (`public/logo.svg`).
- Navbar shows **Sign in / Sign up** buttons for anonymous visitors; switches to the user avatar + **Sign out** for authenticated users.
- `lib/user-context.tsx` uses Clerk's `user.id` as the system `userId` (replaces the old localStorage UUID). Username is derived from Clerk's `user.username`, full name, or email prefix, and synced to the DB via `upsertUser`.
- API server mounts `clerkProxyMiddleware` at `/api/__clerk` and `clerkMiddleware()` before all routes.
- Development uses `pk_test_*` keys; production automatically switches to live keys on deploy.

## Frontend

React + Vite + TanStack Query + wouter routing + shadcn/ui components + Monaco Editor + react-resizable-panels. Dark mode is forced via `class="dark"` on `<html>`. User identity is provided by Clerk Auth; the user record is upserted to the backend after sign-in.

Pages:

- `/` — Hero, platform stats, featured problems, leaderboard preview, category cards
- `/problems` — Filterable problem library
- `/problems/:slug` — Split-pane workspace: problem statement | Monaco editor + result tabs (Tests / Debug Log / Governor Limits)
- `/profile` — User stats with category/difficulty progress bars + recent activity, inline username edit
- `/leaderboard` — Top developers by problems solved

## Workflows

- `artifacts/api-server: API Server` — Express server (auto-seeds problems + sample users on startup)
- `artifacts/apex-arena: web` — Vite dev server
- `artifacts/mockup-sandbox: Component Preview Server` — Mockup preview (not used by Apex Arena)

## Notes

- Authentication is powered by Replit-managed Clerk. Development and production user stores are separate — accounts made in dev won't exist in production.
- Seed data inserts 20 problems and 5 sample users with realistic submissions on first server boot. Re-runs are idempotent.
- After editing the OpenAPI spec, run `pnpm --filter @workspace/api-spec run codegen` to regenerate hooks and Zod schemas.
