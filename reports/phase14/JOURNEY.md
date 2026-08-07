# Phase 14 — Journey smoke (partial)

Playwright against `vite preview` production build:

- Routes HTTP 200: `/`, `/shop`, `/shop/ready-to-ship`, product PDP, `/customize`, `/teams-wholesale`, `/cart`, `/programs`, `/events`, `/online-training`, `/coaches`, `/about`
- Arabic shop: `documentElement.dir` + CSS `direction` = `rtl`
- No page errors

Not yet a substitute for full Playwright e2e matrix (auth/checkout/COD/MFA/visual baselines/PWA upgrade). Those remain next when fixtures allow.
