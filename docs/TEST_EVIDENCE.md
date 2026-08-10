# SHABABUNA Test Evidence

## Executed source checks

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run coverage
npm run coverage:critical
npm run verify:release
node scripts/security-audit.mjs
```

Current evidence:

- 69 total catalog records.
- 25 verified published LHA products with retained prices.
- 44 unverified Shababuna records held as drafts.
- Zero fabricated Ready to Ship products.
- 12 supported customization product types.
- 24 ordered database migrations.
- 166 tests passed; zero failed/skipped/todo.
- Overall coverage: 92.24% lines, 81.71% branches, 89.70% functions.
- Critical commerce coverage: 100% lines, 100% branches, 100% functions.
- Static security audit: 318 files, 0 blocking findings.

The executable tests cover catalog publication safety, trusted checkout API, payment provider normalization, file signatures/quarantine, Special Request API, secure design sharing, readiness checks, shipping/currency rules, returns architecture, search, CSV/XLSX roster parsing, vector artwork ZIP and PDF generation.

## Included connected-runtime suites

The repository also includes pgTAP database/RLS tests, Playwright E2E, Axe accessibility without disabled contrast rules, Arabic/English visual regression across mobile/tablet/desktop and Lighthouse gates. These are release blockers in GitHub Actions.

They require installed npm dependencies and/or connected Supabase/provider services. The delivery sandbox could not fetch the pinned Vite package, so the related reports remain truthfully `not_run`.
