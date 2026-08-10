# Phase 8 — Operations, admin, security and business intelligence

Branch `cursor/shababuna-redesign-master-plan-dc14`. Rollback: revert the Phase 8
commit, or delete the `operations.css` import in `src/main.jsx`.

## Baseline

Tree clean at the Phase 7 commit. `/operations` rendered its access-controlled
state with 0 axe violations after the earlier layers.

## Scope — explicitly not cinematic

`src/styles/operations.css` treats Operations as what it is: an internal control
system used all day, on a laptop, under time pressure. It optimises for scan
speed and density, not impression.

- **A denser rhythm than the storefront.** The layer locally overrides
  `--sh-s-4` and `--sh-s-5` inside `.operations-page`, so the whole module
  tightens without touching the storefront scale.
- **Sticky table headers** with `max-block-size: 70vh`, so column meaning
  survives a long list.
- **Tabular figures everywhere** a number appears — tables, stats, rates, prices.
- **A statistic is a figure first**: large tabular number, small uppercase label.
- **Status differs in glyph as well as colour** (`✓` / `✕`), because an operator
  scanning fifty rows must not depend on hue.
- **Zero decorative motion.** `animation: none !important` inside
  `.operations-page`, with transitions capped at the 120ms state-feedback token.
  Nothing in Operations should ever move for effect.
- **Mobile-tolerant, not mobile-first.** On a phone tables scroll, cards stack,
  the toolbar goes vertical, and nothing overflows.

## Business intelligence honesty

The layer provides a `[data-quality='partial']` treatment — a maple leading-edge
rule with explanatory text — so a figure computed from incomplete event coverage
is visibly marked as such. **No analytics were fabricated and no new metric was
invented**; this is presentation for data the module already computes.

## Architecture verified, not assumed

**Route-level lazy loading** — measured in the bundle report:

| Chunk                     | Size (gzip) |
| ------------------------- | ----------: |
| `OperationsDashboardPage` |     20.7 KB |
| `OperationsPage`          |      8.1 KB |
| `OperationsSectionView`   |      0.9 KB |

All three are separate chunks. **No Operations code is in the entry bundle**, so
a customer browsing the shop never downloads it.

**Authorization is server-backed, not UI-only.** `OperationsDashboardPage`
imports `isStaffUser`, `getStaffRole` and `loadOperationsDashboard` from
`src/services/operations`. That service file — like every file under
`src/services/` — was **not opened in this entire redesign**. The staff guard,
role checks, AAL2 requirements, audit logging and RLS remain exactly as they
were; this phase changed only how the resulting screens look.

## Files created

- `src/styles/operations.css`
- `PHASE8_EVIDENCE.md`

## Files modified

- `src/main.jsx` — one import
- `scripts/validate-design-tokens.mjs` — bridge layer registration

## Dependencies

**None added. None removed.**

## Tests

| Command                  | Result              |
| ------------------------ | ------------------- |
| `test:node`              | 321/322 — unchanged |
| `test:ui`                | 46/47 — unchanged   |
| `typecheck`              | 75 — unchanged      |
| `verify:source`          | pass                |
| `validate-design-tokens` | pass                |
| `build`                  | pass                |

## Browser review

**4 checks (`/operations` × 2 locales × 2 viewports): 4 clean, 0 axe violations,
0 horizontal overflow, one h1, 60 focusables on mobile and 70 on desktop.**

- **Desktop:** dense control centre, drawn section plates, sticky dark table
  headers.
- **Mobile:** toolbar stacks, tables scroll, no overflow.
- **Arabic / RTL:** table cells use `text-align: start`, so columns align
  correctly in both directions with no override.
- **Reduced motion:** trivially satisfied — the module has no animation at all.

## Known limitations

- `/operations` renders its **access-controlled state** in a static build, which
  is the correct behaviour without a staff session. The authenticated module
  views — dashboard, catalog, inventory, orders, payments, refunds, returns,
  quotes, B2B, media, shipping, users, security, analytics, content, settings —
  need a Supabase instance with a staff account and AAL2 to review visually.
  Their styling is verified by class coverage and structurally, not visually.
- This is a **presentation** phase. No module was split, no data request was
  rescoped, and no pagination was added, because doing so would mean editing the
  service layer this redesign has deliberately never touched. Any such change
  belongs in a backend-owned task with its own tests.
