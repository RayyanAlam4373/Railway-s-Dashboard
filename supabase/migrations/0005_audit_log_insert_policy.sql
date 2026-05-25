-- Phase 2 — audit_log was created in 0001 with a SELECT policy only.
-- Authenticated users need to INSERT rows when they perform CRUD via the
-- app's server actions. Enforce that the inserted row attributes the
-- action to the calling user (no spoofing other users' actions).

create policy "audit_log_insert_authenticated"
  on public.audit_log
  for insert
  to authenticated
  with check (auth.uid() = user_id);
