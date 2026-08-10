# Payment architecture verification

- SHA: `046264b47cdeaa4ee3890290e3cf7b06f969f280`
- Adapter registry present via `api/payments`
- States supported in software: MOCK / SANDBOX / LIVE (unconfigured ≠ LIVE)
- Live credentials: **not present** in this environment (expected)
- Mock/path verification: see `npm run test:integrations` / provider readiness scripts

Do not mark LIVE_VERIFIED without real provider credentials.
