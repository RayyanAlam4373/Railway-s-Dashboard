# Supabase

Migrations and seed scripts for the Pakistan Railways Freight Intelligence Platform.

## Layout

```
supabase/
  migrations/   SQL migrations, applied in lexical order.
  seed/         Idempotent seed scripts (lookup tables, demo data).
```

## Applying migrations

The SQL files here can be applied through any of:

- **Supabase Studio** — paste the file contents into the SQL editor.
- **Supabase CLI** — `supabase db push` (after `supabase link`).
- **Direct psql** — `psql "$SUPABASE_DB_URL" -f migrations/0001_profiles_and_rbac.sql`.

## Conventions

- File names: `NNNN_<short_snake_case_description>.sql` — 4-digit zero-padded sequence.
- One topical change per file. Never edit a migration once it has been run against a shared environment; add a new one.
- All tables enable RLS. Policies live in the same migration as the table they protect.
- Lookup tables are seeded by scripts in `seed/`, not by migrations, so they can be re-run safely.

## Phase status

- Phase 0 — `0001_profiles_and_rbac.sql` (this directory).
- Phase 1 — commodity / cargo express / coal party / container party / budget / comparative tables (TODO).
