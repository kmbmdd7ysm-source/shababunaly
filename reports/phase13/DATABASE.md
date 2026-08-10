# Phase 13 — Database + RLS live test

## Result: BLOCKED (external tooling)

- `supabase` CLI is not installed in this environment (`supabase: command not found`).
- Cannot honestly run `supabase start` / `db reset` / `supabase test db` / pgTAP from a clean state here.
- Migrations remain in `supabase/migrations` (31 files) and are not modified to bypass RLS.

## Required to unblock

1. Install Supabase CLI + Docker-capable host
2. `supabase start`
3. `supabase db reset`
4. `supabase test db` (or project `npm run test:db`)
5. Capture pgTAP + JWT role fixture evidence under `reports/database/`

Until then: **DATABASE LIVE TEST = BLOCKED** (not assumed pass).
