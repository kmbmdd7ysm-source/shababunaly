# Phase 3 — TypeScript migration checkpoint

## Done

- Removed broad fake module shims for React / Router / Supabase / Playwright / Vitest / Testing Library from `types/project-shims.d.ts`.
- Official `@types/*` + package types are used.
- `tsconfig.json` enables full strict suite:
  - `strict`, `noImplicitAny`, `strictNullChecks`, `useUnknownInCatchVariables`
  - `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `skipLibCheck: false`
- Typecheck scope is real TypeScript (`src/**/*.ts(x)`, `api/**/*.ts`) — not fake `checkJs` with silent `any` shims.
- Canonical domain types in `src/domain/types.ts` + availability helpers in `src/domain/availability.ts`.
- Migrated critical business modules to TypeScript:
  - `commerce`, `shipping`, `money`, `integrations`
  - `productEligibility`, `orderStatus`, `fulfillment`, `safeReturnPath`
  - `payments`, `scrollLock`
- Node tests use `--experimental-strip-types` for `.ts` imports.
- Shipping rule normalized: free threshold **70 USD → 630 LYD** at rate 9 (not 500 LYD).
- Formspree unified to `https://formspree.io/f/mqerbqvd` (client + server fallback).

## Evidence

| Check | Result |
| --- | --- |
| `npm run typecheck` | **0 errors** |
| `npm run typecheck:strict-critical` | **0** |
| `npm run typecheck:production` | **0** |
| `npm run test:node` | **322 pass** |
| `npm run test:ui` | **63 pass** |
| `npm run build` | **0** |

## Coverage honesty

`node scripts/audit-typescript-strictness.mjs` reports TypeScript file count vs total `src`+`api` executables. Remaining `.js`/`.jsx` continue migrating in later phases (component splits, Customize, Operations). Do not treat percentage as “done” until legacy list is empty.