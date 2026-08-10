# Teams quote submit — local staging evidence

## Observed (Playwright, local Vite `:3000`)
- Form fills Name / Organization / Email / Requirements
- Submit posts to `POST /api/public-quote-request`
- Response: **404** (Vite has no `/api` proxy; Vercel serverless lives in `api/` for deploy)
- UI message (honest, not fabricated success):
  > The request could not be saved securely. No quote was created. Check the form and try again.

## Classification
**BLOCKED in local staging-safe mode** without Vercel API / Supabase.
Implementation exists: `api/public-quote-request.ts` + client `src/services/publicQuotes.ts`.
Must be verified on a deployed preview with credentials.

