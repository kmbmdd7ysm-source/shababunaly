# Verified test report

Generated: 2026-08-02 UTC

## Executed locally

- Node/API/source-contract suite: **309 passed, 0 failed, 0 skipped, 0 todo**.
- General TypeScript check: passed.
- Strict-critical TypeScript check: passed.
- Declared production-scope TypeScript check: passed.
- Source syntax and custom source/security lint: passed.
- Source verification and core smoke checks: passed.
- Static source/configuration security scan: 0 blocking findings.

Evidence is under `reports/local-verification/` and the generated JSON reports.

## Not certified locally

- Full-project Vitest/V8 coverage: official packages unavailable.
- Official ESLint/Prettier: binaries unavailable.
- Vite build: `vite` unavailable from the sandbox registry.
- Supabase reset/pgTAP: CLI package unavailable from the sandbox registry.
- Playwright E2E/accessibility/visual/PWA: production build and browsers unavailable.
- Lighthouse/PageSpeed: no public deployed staging URL and PageSpeed key.
- npm advisory audit/SBOM: audit endpoint and CycloneDX binary unavailable.

The production-release gate records these as failures; it does not convert them to passes.
