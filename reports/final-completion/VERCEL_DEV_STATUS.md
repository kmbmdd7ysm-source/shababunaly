# Vercel dev local API status

Attempted `npx vercel dev --listen 3001` during continuous execution.

## Result
**BLOCKED** — CLI requires interactive OAuth login (`No existing credentials found`).
Cannot start serverless `api/` runtime in this environment without credentials.

Local Vite continues to serve storefront; POST `/api/public-quote-request` remains 404
without Vercel runtime (see API_LOCAL_VERIFICATION.md).
