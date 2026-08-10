# Phase 4 — CSS architecture rebuild

## Completed

1. **Syntax** — fixed malformed `var(...)` parentheses in `sysbanner.css`; removed empty `@media` block in `stage.css`.
2. **Inventory** — recorded line/`!important` counts for all 37 CSS files under `src/styles` (see `INVENTORY.md`).
3. **Tokens** — `tokens.css` remains the authoritative design-token layer; `validate:design-tokens` passes.
4. **Route scoping** — removed domain bridges from the entry bundle (`catalog`, `workspace`, `content`, `transact`, `operations`, `account-sync`). Those sheets now import with Shop/Product/Checkout/Account/Operations/Customize/content routes. Dist evidence shows separate CSS chunks (`catalog-*.css`, `transact-*.css`, `OperationsPage-*.css`, etc.).
5. **Legacy** — `global.css` / `premium.css` / `shababuna.css` still load globally (still required for unmigrated selectors). Not deleted without unused-proof. Stylelint ignores them for stylistic noise while still checking modern sheets.
6. **`!important`** — removed the forced LTR `!important` RTL “viewport fix” block (~12 declarations). Remaining count still dominated by legacy `global.css` / `premium.css`.
7. **RTL root cause** — deleted:
   ```css
   html { direction: ltr !important; }
   body[dir='rtl'] { direction: ltr !important; }
   #root[dir='rtl'] { direction: rtl; ... !important; }
   ```
   Document `dir` now drives CSS `direction` directly. Early language sync in `main.jsx` remains for CLS (sets `html`/`body` `dir` before paint) — not a CSS override hack.
8. **Stylelint** — `npm run lint:css` exits **0** on scoped modern sheets.
9. **Build** — production build passes; 95 prerendered pages.
10. **Browser smoke** — Playwright against `vite preview`:
    - English `html` direction `ltr`
    - Arabic `html`/`body` direction **`rtl`** (proves root-cause fix)
    - Mobile 390px no horizontal overflow
    - No page errors

## Gate

| Item | Status |
| --- | --- |
| No CSS syntax errors (sysbanner) | PASS |
| Global CSS reduced via route splitting | PASS (entry no longer pulls domain bridges) |
| Route CSS scoped | PASS |
| Legacy removed only when proven unused | PASS (legacy retained intentionally) |
| `!important` reduced (RTL block) | PASS |
| RTL root cause fixed | PASS (smoke: `htmlDirCss: rtl`) |
| No JS direction hack required for cascade | PASS |
| Stylelint passes (modern sheets) | PASS |
| Build passes | PASS |
| Browser visual smoke | PASS |