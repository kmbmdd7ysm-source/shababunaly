# CSS extinction — FINAL SOURCE STATUS

## Live source
- Foundation + route/component sheets only.
- No live imports of the retired `journey.css`, `ledger.css`, `colophon.css`, `geometry.css`, `runs.css`, `spine.css`, or `catalogue.css` files.
- `RouteMasthead` and `Dossier` are absent from the live source tree.
- The dead Route Masthead/Dossier selector blocks were removed from `composition.css`.

## Removed from the release package
- The inactive `src/styles/_archive/` directory was removed after verifying it had no runtime imports.

## Important note
The remaining stylesheet system still contains historical bridge/compatibility rules, including `!important` usage. Those rules were not mass-rewritten without browser-level regression evidence; a blind specificity rewrite would be riskier than retaining verified behavior.
