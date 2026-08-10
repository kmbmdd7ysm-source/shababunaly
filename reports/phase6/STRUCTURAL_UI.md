# Phase 6 — Structural UI rebuild (+ Phase 7 Ready-to-Ship honesty)

## Structural JSX changes

- **Account**: capsule tabs (no decorative `01` indexes); soft summary cards instead of bordered `account-grid` boxes.
- **Teams & Wholesale**: package selection rebuilt as soft `gw-package-card` buttons (not numbered bordered boxes); stage marks stripped of decorative numbers; primary CTAs use `gw-btn`.
- **Cart empty**: Ready-to-Ship always offered; category gates no longer number-decorated / Libya-filtered.
- **Product cards**: availability badges driven by `resolveAvailabilityState` — no fake “In Stock”.
- Hero/media slots untouched.

## Ready to Ship (Phase 7 overlap)

- Shop entrance gate, console link, homepage path/floor/chapter always visible (not Libya-gated).
- Collection keeps honest verified inventory rules (`readyToShip` + `inventoryVerified` + `inventoryTracking`).
- Non-Libya visitors see `/shop/ready-to-ship` with an international confirmation note.
- Empty verified stock shows honest copy — no fabricated SKUs.

## Evidence

- Build PASS
- Node 322 / UI 63 PASS
- Playwright `STRUCTURE_SMOKE_PASS` (home ready links, shop ready note, teams package cards, AR + mobile)