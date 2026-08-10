# Phase 1 — Brand references + test failures

## Brand

- Canonical mark for square slots: `public/brand/shababuna-monogram.svg` (via `BRAND.mark` in `src/config/brand.js`).
- Canonical wordmarks: `shababuna-wordmark-{en,ar}-{black,white}.png`.
- Quarantined Logoman-derived `shababuna-mark-*.png` remain under `brand-quarantine/` and must not appear under `public/`.
- `tests/formsAndMedia.test.js` now asserts approved assets exist and quarantined mark PNGs are **absent** from `public/brand`.

## Node failures fixed

1. Brand derivatives existence — updated to monogram + wordmarks; forbids quarantined marks in public.
2. Supabase coverage branch — `getSupabase()` no longer silently succeeds when `@supabase/supabase-js` is installed; the test injects a rejecting client factory so the dynamic-import failure path is exercised as intended.

## “Duplicate assertion” investigation

`scripts/run-node-tests.mjs` enumerates each `tests/*.test.js` once and invokes a single `node --test` process. There is no double file execution.

TAP reports both the failing **subtest** (`not ok N - case`) and the parent **suite** (`not ok M - suite`) for the same root cause, which can look like the same assertion running twice. That is reporter structure, not a double runner.

## UI

- `tests/ui/common-components.test.jsx` LanguageContext mock restored `t.nav.home` and `t.a11y.breadcrumb` required by `Breadcrumbs`.