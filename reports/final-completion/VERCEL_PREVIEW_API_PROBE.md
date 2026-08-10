# Vercel preview API probe

- Generated: 2026-08-10T02:32:30Z
- SHA: `ceba720d680d191b48e06873f7b851c9f57bad77`
- Preview: `https://shababunaly-git-cursor-shaba-b40f31-kmbmdd7ysm-sources-projects.vercel.app`

## Result
**BLOCKED — Vercel Deployment Protection (SSO)**

- `GET /` → HTTP 302 (auth redirect)
- `POST /api/public-quote-request` → HTTP **401** with `vercel_auth_enabled: true`
- Other `/api/*` probes redirect to auth

Automated quote/order/payment verification cannot complete from this agent
environment without a protection bypass token or a publicly reachable preview.

## Not a false pass
Do not treat local staging-safe quote UI as deployed API success.
