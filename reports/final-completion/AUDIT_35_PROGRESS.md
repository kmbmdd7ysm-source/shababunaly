# 35-problem-group progress (living) — NOT FINAL COMPLETE

SHA at write: see git HEAD. Regenerated during continuous execution.

## Verified solvable in-repo
| Area | Status | Evidence |
| --- | --- | --- |
| TypeScript migration | **98.98%** / 3 legacy left | reports/typescript/strictness.json |
| Catalog data TS | DONE | products/lhaProducts/translations TS |
| B2B service TS | DONE | src/services/b2b.ts |
| simplePdf / designExports TS | DONE | src/utils/*.ts |
| Ready-to-Ship UI + honesty | DONE | ShopPage eligibility + empty copy |
| Quick-add variants sheet | DONE | QuickAddSheet screenshots |
| PDP Configure & buy | DONE | ProductPage stage CTA |
| Cart Libya free-ship gate | DONE | CartPage / CartDrawer |
| Dismiss sentence-case 44px | DONE | sysbanner.css |
| Empty states no emoji | DONE | EmptyState SVG |
| EN/AR RTL mobile/tablet | TECH PASS | MOBILE_AR_RTL.md TABLET_EN.md |
| E2E shop→bag→checkout | DONE | e2e-*.png artifacts |
| Customize review path | DONE | e2e-customize-review.png |
| Local API GET config/geo/readiness | DONE | API_LOCAL_VERIFICATION.md |
| Production build | GREEN | dist provenance |

## BLOCKED (external)
| Area | Reason |
| --- | --- |
| Ready-to-Ship count > 0 | Needs verified inventory / Supabase |
| Teams/quote POST | Vite has no Vercel `/api` proxy |
| Live payments / Formspree delivery | Credentials |
| Full RLS/DB e2e | Supabase stack optional |
| ARABIC_HUMAN_REVIEW | Requires human |

## Remaining code migrations
- orders.js, operations.js (recipes in reports/continuation/)
- Realtime3DEngine.jsx ambient (model-viewer types)

## Gate
FINAL COMPLETE only after: remaining solvable migrations OR documented BLOCKED, deployed API verify where possible, full audit regenerated from final SHA.
