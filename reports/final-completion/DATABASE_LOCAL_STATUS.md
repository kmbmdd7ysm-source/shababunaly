# Database / RLS local status

Local Supabase stack is **not required** for storefront staging-safe mode
(see AGENTS.md). Attempted probe of `http://127.0.0.1:54321` during this run.

## Classification
Full RLS / live inventory / trusted order e2e is **BLOCKED** without local
Supabase (Docker) or cloud credentials. CI workflow
`.github/workflows/world-class-quality.yml` exercises the stack when available.

Application code and migrations under `supabase/` remain the source of truth.
