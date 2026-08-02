# Protected production release checklist

## Source evidence completed locally

- [x] Uploaded ZIP treated as the only source.
- [x] 309 Node/API/source-contract tests pass with no failure or skip.
- [x] General and declared strict TypeScript checks pass.
- [x] Source syntax, custom lint and static source-security checks pass.
- [x] Full-project coverage configuration enumerates all executable source/API files.
- [x] Build provenance and SHA-256 generation exist.
- [x] Supabase reset/pgTAP workflow runs three times in CI.
- [x] Payment/refund/return/inventory concurrency tests exist.
- [x] Full B2B database lifecycle test exists.
- [x] E2E, accessibility, visual, PWA, Lighthouse and Google PageSpeed gates exist.
- [x] Live Supabase/Formspree/malware/payment/signature verification exists.
- [x] Catalog, factory, provider, Arabic and visual-approval gates fail closed.

## Mandatory connected-environment evidence

- [ ] Official ESLint and Prettier pass after clean `npm ci`.
- [ ] Strict TypeScript migration reaches 100% of source/API files.
- [ ] Full-project coverage reports every executable file at 100% lines/branches/functions/statements.
- [ ] Vite production build passes and dist provenance is attested.
- [ ] All migrations and pgTAP/RLS suites pass three clean runs.
- [ ] Playwright E2E passes with zero skipped tests.
- [ ] Accessibility and visual regression pass with approved baselines.
- [ ] PWA two-version upgrade test passes.
- [ ] Lighthouse and PageSpeed mobile/desktop thresholds pass on public staging.
- [ ] npm advisory audit, OSV, CodeQL and CycloneDX SBOM pass.
- [ ] Supabase, SMTP, Formspree, malware, payment and signature providers pass live/sandbox verification.
- [ ] Every sellable variant has approved SKU, cost, price, barcode, warehouse, stock, dimensions, weight, HS code, origin and media.
- [ ] Ready to Ship is enabled only for physically verified Libya stock.
- [ ] Manufacturer approves graded patterns, seams, ICC/Pantone/Delta-E and Tech Pack outputs.
- [ ] Arabic commercial/legal/RTL review and visual-baseline review are signed and tied to the release commit.
