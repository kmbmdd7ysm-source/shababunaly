# Phase 0 — Starting State (freeze)

| Field | Value |
| --- | --- |
| Branch | `cursor/shababuna-redesign-master-plan-dc14` |
| HEAD SHA | `f4fe6a6ed2cdc659ea26f07451545e5575d29749` |
| UTC | `2026-08-09T01:40:17Z` |
| Dirty files | 1 (this `reports/final-completion/` tree only) |
| Node | v22.14.0 |
| npm | 10.9.7 |
| Registry | `https://registry.npmjs.org/` |
| Products | **69** |
| Variants | **982** |
| Migrations | **31** |
| App route `path=` lines | **41** |
| Executable source (src+api) | **258** |
| Node test files | **48** |
| UI test files | **10** |
| Strict TS coverage | **15/258 (5.81%)** |
| CSS files under src | **37** |
| `!important` count | **435** |
| global.css lines | **7252** |
| shababuna.css lines | **3551** |
| premium.css lines | **2029** |

## Known mandatory defects at freeze

1. Checkout still hardcodes “Free from 500 LYD” (`src/pages/CheckoutPage.jsx` ~1123–1124) despite shipping config at 70 USD / 630 LYD.
2. Strict TypeScript migration ~5.81% of executable source.
3. Legacy CSS stack still global and large.
4. Build provenance may lag HEAD (must be reconciled).
5. Database live tests blocked without Docker historically.
6. Full E2E / visual baselines / release verdict incomplete.

No valid user work discarded. Phase 0 does not modify application source.
