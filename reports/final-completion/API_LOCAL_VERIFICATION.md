# Local API verification (Vite :3000)

Generated against running `npm run dev` (no Vercel serverless runtime).

| Endpoint | Method | Status | Notes |
| --- | --- | --- | --- |
| `/api/public-config` | GET | 200 | Served |
| `/api/geo` | GET | 200 | Served |
| `/api/readiness` | GET | 200 | Served |
| `/api/public-quote-request` | GET | 200 | May be static/dev shim |
| `/api/public-quote-request` | POST | **404** | Vercel function not proxied by Vite |

## Classification
Full commerce quote/order/payment API verification is **BLOCKED** in local staging-safe mode without Vercel/`vercel dev` or deployed preview + credentials.

Source implementations exist under `api/*.ts`.
