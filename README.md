# Pakistan Railways — Freight Intelligence Platform

Phased build for the Karachi Division freight operations platform. See
[`pakistan_railways_project_overview.md`](pakistan_railways_project_overview.md) and
[`pakistan_railways_technical_detailed_plan.md`](pakistan_railways_technical_detailed_plan.md)
for the product and technical spec, and the approved implementation plan at
`~/.claude/plans/i-want-you-to-parsed-sundae.md`.

## Repository layout

```
apps/web/         Next.js 16 (App Router) — UI, server actions, Supabase clients
apps/web/scripts/ One-shot ingestion (xlsx → Supabase) and verification scripts
supabase/         SQL migrations
.github/          CI workflows (typecheck + lint)
render.yaml       Render deployment manifest
```

The original client deliverables live at the repo root: the three `pakistan_railways_*.md`
specs and the six `*.xlsx` data files.

## Getting started (local)

1. Create a Supabase project. Copy the URL, anon key, and service-role key.
2. `cp .env.example apps/web/.env.local` and fill in the values.
3. In the Supabase **SQL Editor**, run the migrations in order:
   - `supabase/migrations/0001_profiles_and_rbac.sql`
   - `supabase/migrations/0002_lookup_tables.sql`
   - `supabase/migrations/0003_fact_tables.sql`
   - `supabase/migrations/0004_views.sql`
4. Install deps:

   ```sh
   cd apps/web
   pnpm install
   ```

5. Seed lookup tables and ingest the six client xlsx files (one-time):

   ```sh
   pnpm seed:lookups   # commodities, parties, cargo express routes
   pnpm ingest         # all 6 xlsx → fact tables; prints warning report
   pnpm verify:ingest  # reconciles totals against analysis MD
   ```

6. Run the app:

   ```sh
   pnpm dev
   ```

7. Visit `http://localhost:3000`. Sign up, confirm via the Supabase Auth email,
   then sign in. (For local dev, you can disable email confirmation in the
   Supabase dashboard under Auth → Providers.)
8. The first user signs up as `auditor` (read-only). To promote yourself to
   `admin`, run this in the Supabase SQL editor once:

   ```sql
   update public.profiles set role = 'admin' where email = 'your@email.com';
   ```

## Deployment

Push to `main`. Render reads `render.yaml` and builds `apps/web`. Set
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` in the Render dashboard.

## Status

- [x] Phase 0 — Foundations
- [x] Phase 1 — Schema & ingestion
- [x] Phase 2 — CRUD pages per dataset
- [x] Phase 3 — Executive overview dashboard
- [x] Phase 4 — Commodity / container / coal dashboards
- [x] Phase 5 — Customer & comparative dashboards
- [x] Phase 6 — Reporting engine (xlsx export + browser-print PDF; scheduled email deferred — needs Supabase Edge Function + email provider)
- [x] Phase 7 — Alerts & notifications (in-app bell + manual evaluator; email delivery + cron scheduling deferred — needs Edge Function + email provider)
- [ ] Phase 8 — AI layer
