# Phase 0 — Safe Checkpoint + Complete Baseline

Recorded before intentional source fixes for Phases 1+.

## Identity

| Field | Value |
| --- | --- |
| Branch | `cursor/shababuna-redesign-master-plan-dc14` |
| HEAD SHA | `9838f9c1b823b16dee1ac3aa7f129a6b4b8e274a` |
| main SHA | `508c07c6d30ab51ba19d4a2ad1fad2848bec9f87` |
| UTC | `2026-08-07T03:47:40Z` (identity capture) |
| Working tree at capture | only untracked `reports/phase0/` |

## Catalogue / platform counts

| Metric | Observed | Notes |
| --- | --- | --- |
| Products | **69** | Matches audited expectation |
| Approx variants | **982** | sizes×colors style expansion |
| Migrations | **31** | `supabase/migrations` |
| Route `path=` lines in `src/App.jsx` | **41** | Major customer/staff routes present |
| Source files (`src`+`api` js/jsx/ts/tsx) | **234** | |
| CSS files under `src` | **37** | |
| `tests/*.test.js` | **48** | Plus UI vitest suite |

## Brand inventory (`public/brand`)

Present (verified / authorized for ship):

- `shababuna-monogram.svg` (interim typographic mark)
- `shababuna-wordmark-{black,white}.png`
- `shababuna-wordmark-ar-{black,white}.png`
- `shababuna-social.png`
- LHA marks/wordmarks + README

**Absent from public (intentionally quarantined under `brand-quarantine/`):**

- `shababuna-mark-black.png`
- `shababuna-mark-white.png`
- full-mark / legacy favicon / social-legacy variants

`npm run validate:brand` → **0 errors** (quarantine gate healthy).

## Command matrix (exact exits)

| Command | Exit | Summary |
| --- | --- | --- |
| `npm ci` | **0** | 94 runtime packages from lockfile |
| `NPM_CONFIG_FORCE=true npm run quality:install` | **0** | 645 additional quality tools (not persisted via normal `npm ci` alone — Phase 2) |
| `npm run format:check` | **2** | Prettier drift across many files (~251 warnings) |
| `npm run lint` | **2** | ESLint crash: `TypeError: Queue is not a constructor` (vendor `yocto-queue` / `p-limit`) |
| `npm run typecheck` | **1** | **77** `error TS*` (mostly `string` vs `number` on form `maxLength` / unused imports / catch unknown) |
| `npm run test:node` | **1** | **320 pass / 2 fail / 322 tests** |
| `npm run test:ui` | **1** | **62 pass / 1 fail** (`Breadcrumbs` → `t.nav.home` undefined) |
| `npm run coverage:project` | **1** | Same UI Breadcrumbs failure blocks coverage gate |
| `npm run build` | **0** | Vite build + 95 prerendered pages; dist SHA-256 `0bdf735fe062b7a197cfdee3700080616f1d56a52b74176280f03bdfaab64ed3` |
| `npm run validate:brand` | **0** | |
| `npm run validate:design-tokens` | **0** | |

Raw logs: `reports/phase0/cmd/*.log` and `*.exit`.

## Exact Node test failures (2)

1. **`formsAndMedia.test.js` → `ships the approved brand derivatives`**
   - Asserts existence of `public/brand/shababuna-mark-black.png` and `...-white.png`.
   - Those files are quarantined (NBA Logoman-derived) and must not ship.
   - Fix direction (Phase 1): assert approved assets (`shababuna-monogram.svg` + wordmarks), never reintroduce quarantined marks.

2. **`absoluteCoverageClosure.test.js` → `executes Supabase runtime aliases, fallback signal, dynamic import and auth null branches`**
   - Assertion `false !== true` via `test-api.js` `toBe`.
   - Separate from brand; must be diagnosed and fixed honestly in Phase 1 (not deleted).

### “Same assertion twice” note

TAP reports both the failing subtest (`not ok N - …`) and the parent suite (`not ok M - suite name`). That can look like a duplicated failure for one root cause. `scripts/run-node-tests.mjs` lists each `tests/*.test.js` once and runs `node --test` once — **no double file execution** observed in the runner.

## Known config conflicts (recorded; fix in later phases)

- Formspree hardcoded fallbacks still use `https://formspree.io/f/mvzenjgv` in `src/config/integrations.js`, `ProductionReadinessGate.jsx`, `api/formspree-files.js`. Required canonical: `mqerbqvd`.
- Libya free shipping threshold still `{ amount: 500, currency: 'LYD' }` in `src/config/shipping.js`. Required: **70 USD ≡ 630 LYD** at `fallbackUsdToLydRate: 9`.
- `src/styles/sysbanner.css` malformed tokens: extra `)` on `var(--sh-…)` (lines 17, 103, 154).
- `StudioStage` pointercancel registered with anonymous arrow; cleanup cannot remove same handler.

## Phase 0 quality gate

- [x] Baseline captured
- [x] Current branch known
- [x] Current SHA known
- [x] Working tree protected (no accidental deletes)
- [x] Complete baseline failure list known

Phase 0 does **not** fix the failures above — that begins immediately in Phase 1.