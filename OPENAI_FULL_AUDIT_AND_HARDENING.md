# Shababuna — Full Source Audit & Hardening Handoff

Date: 2026-08-10
Basis: the uploaded ZIP only. The package contained no `.git` directory, so no new Git SHA is fabricated in this handoff.

## Scope reviewed

The full extracted package was traversed across application source, API handlers, route/page architecture, styles, data/catalogue, product media, Customize, product viewer, checkout, account, operations, Supabase migrations/functions, PWA, tests, scripts, reports, brand assets and visual-baseline evidence.

Current package snapshot after hardening:

- ~1.1k files total.
- 69 active catalogue products / 982 variants.
- 172 TSX files; no JS/JSX application files under `src/` or `api/`.
- 342 image/media assets in the package.
- 23 real-multi-angle products, 0 real photographic spinsets, 0 real catalogue 3D models; the software keeps those states honest.
- Verified Ready-to-Ship stock remains 0 until real inventory is entered.

## High-impact defects found and corrected

### 1. Final visual layer / public experience

Added `src/styles/worldclass-polish.css`, loaded last, to give public routes a consistent premium visual grammar without rewriting business logic:

- pill primary/secondary CTAs rather than repetitive rectangular controls;
- circular icon-only actions and consistent 44px touch targets;
- announcement dismiss controls that cannot overlap the copy/brand;
- calmer translucent header, stronger mobile navigation geometry;
- larger cinematic Shop entrance and visual department gates;
- borderless image-first product cards;
- more theatrical Product media stage;
- stage-led Customize desktop layout and bottom-sheet-like mobile layout;
- cleaner Teams sales experience;
- quieter Cart/Checkout presentation;
- Arabic tracking normalization;
- desktop/tablet/mobile density rules;
- reduced-motion preservation.

Public copy was shortened where it was unnecessarily technical or verbose. Product-family helper copy and repeated team package descriptions were removed from visual selectors.

### 2. Inconsistent square icon controls

Normalized known icon-only controls (`gw-tool`, `icon-btn`, modal/nav closes, compare controls, product actions, etc.) to circular geometry with consistent target sizes. Normal text actions remain pills/text links rather than being forced into circles.

### 3. CSP violation hidden by formatting

`ShopPage.tsx` used multiline JSX `style={...}` custom properties while the production CSP specifies `style-src-attr 'none'`. The old lint regex only detected `style={{` on a single line, so it missed these inline style attributes.

Fixed by:

- removing all JSX inline `style=` usage from `src/`;
- moving department art selection to CSP-safe `data-dept` stylesheet rules;
- hardening `scripts/lint-project.mjs` so *any* JSX style prop is rejected going forward.

Current source scan: **0 JSX inline style attributes** under `src/`.

### 4. Customize “3D” was not a real 3D garment

The weak concept fixture was replaced with a genuine WebGL/Three.js / React Three Fiber concept stage:

- actual extruded jersey geometry;
- actual shorts geometry;
- orbit/drag camera;
- zoom;
- front/back/left/right/detail presets;
- live primary/accent colour;
- live pattern concept layer;
- live team/player/number artwork;
- uploaded logo preview on the front concept layer;
- separate front/back artwork;
- lighting and floor stage;
- clear `CONCEPT 3D` labeling.

This is **not** called factory geometry and is not attached to real catalogue SKUs as if it were their model. Real factory GLB/GLTF remains an external factual asset.

The obsolete CSS pseudo-3D component was removed and obsolete pseudo-3D CSS selectors were deleted.

### 5. Placeholder product media looked generic

`PremiumPlaceholderStage` now has category-aware concept silhouettes for clothing, footwear, basketballs, accessories and equipment. This improves visual integrity without pretending that concept artwork is photography.

### 6. Weak department art diversity

`departmentArtDirection.ts` was strengthened to use available supplied category imagery where it exists (notably Clothing and Accessories) and to keep distinct atmosphere assets per department. The CSS department-art mapping is also responsive and CSP-safe.

### 7. Stale source validators

Fixed validators that still referenced removed/renamed architecture:

- `validate-brand.mjs` now reads `src/config.ts` rather than removed `src/config.js`.
- `validate-seo.mjs` now reads `src/config.ts`.
- `validate-static-integrity.mjs` correctly resolves TS/TSX lazy-route targets.
- `validate-final-hardening.mjs` validates the current `AnnouncementStack` ownership rather than obsolete direct banner ownership.
- `validate-cloud-readiness.mjs` checks the order-first checkout invariant semantically instead of relying on one exact formatting string.

### 8. Design-token violations

Raw colour literals found in active audited sheets (`studio.css`, `catalogue.css`, `product-card.css`, `shell.nav.css`, `runs.css`) were moved to central `--sh-*` tokens.

The validator now also checks the new final-polish, WebGL garment and placeholder-stage stylesheets for raw colours and RTL-unsafe physical properties.

### 9. Type-quality API casts

The API security boundaries used repeated `req as never` / `res as never` casts. Request/response structural types in `_request-security.ts` and authorization boundary typing in `_staff-auth.ts` were corrected so endpoint handlers can call security helpers without those casts.

Current `as never` count under `src/` + `api/`: **0**.

### 10. Visual baseline validator pointed at an empty legacy folder

`visual-baselines.json` referenced `e2e/visual.spec.js-snapshots` even though the package contains 48 captured current-candidate screenshots under `reports/visual/baselines/784bf...`.

The manifest now points to the actual captured baseline directory. Human approval remains intentionally blank, so the validator correctly reports `review_required`, not a fabricated PASS.

### 11. False release evidence after source modification

The package contained a historical `SOFTWARE_VERIFIED_EXTERNAL_BLOCKERS` verdict tied to an earlier Git SHA. Any source edit invalidates that verdict.

Historical release evidence was preserved under:

`reports/archive/pre-openai-hardening/release/`

Current release evidence now conservatively says:

`RELEASE_BLOCKED_PENDING_FRESH_VERIFICATION`

until a clean Git commit can run the full install/build/E2E/visual/Lighthouse pipeline. This prevents stale evidence from being mistaken for proof of the modified handoff.

### 12. Stale root release hash manifest

The old root `RELEASE_MANIFEST.sha256` referenced files that no longer exist (for example `src/config.js`). It was archived and replaced with a current `PACKAGE_MANIFEST.sha256` for the source package.

## Source-level verification completed after changes

Dependency-free validators successfully run after the hardening include:

- Brand validation — PASS
- SEO validation — PASS
- Static integrity — PASS
- Source hardening — PASS
- Project source lint — PASS
- Source check — PASS
- Data validation — PASS (69 products / 15 brands / Ready to Ship 0 / 20 customizable / 59 wholesale / 25 LHA)
- Commerce validation — PASS
- Cloud source-readiness — PASS (explicitly not live cloud verification)
- Design-token/RTL safety validation — PASS
- Performance media budgets — PASS
- Architecture/world-class source validator — PASS (architecture only, not a visual certification)
- Product media validator — 0 errors, 44 missing-media warnings
- Product viewer matrix — A0 / B0 / C23 / D46
- Catalogue completeness audit — 982 variants, real commercial/media blockers remain
- Factory readiness audit — correctly blocked pending real manufacturer/factory evidence
- Arabic localization structure — 514 keys; human approval still required
- Provider readiness — code-ready, real provider selection/credentials still required
- Immutable GitHub Actions refs — PASS
- Visual baseline inventory — 48 screenshots detected; human review intentionally not fabricated

## Runtime verification that could not be repeated in this environment

A fresh dependency install could not be completed because the execution environment routed npm through its internal package mirror and returned 404 for `zod@3.25.76`. Because dependencies could not be installed, this handoff does **not** claim a fresh post-edit:

- Vite production build;
- Playwright browser E2E;
- new screenshots of the edited visual layer;
- Lighthouse;
- live Supabase RLS/database run;
- live provider/API verification.

The source has therefore been left with an honest release gate requiring fresh runtime verification rather than reusing old evidence.

## Genuine external blockers intentionally not fabricated

- Real final product photography for placeholder-heavy products.
- Real photographic 360 spinsets (Tier B remains zero until supplied).
- Real catalogue GLB/GLTF models (Tier A remains zero until supplied).
- Factory CAD/pattern/UV/material/Pantone/manufacturer approvals.
- Verified physical inventory quantities.
- Missing supplier/commercial product fields.
- Live payment provider credentials and provider verification.
- Live Supabase/Vercel protected-preview credentials where required.
- Human Arabic review approval.
- Final campaign/Hero footage and photography.

The code should accept those inputs later; it must not invent them now.

## Handoff instruction

After importing this package into the normal development environment:

1. restore normal npm registry/dependency access;
2. run `npm ci`;
3. run the complete repository validation/test suite;
4. run a fresh production build;
5. open the current preview on desktop, tablet and phone in EN and AR;
6. capture fresh visual baselines;
7. run E2E/accessibility/PWA/Lighthouse;
8. commit the resulting verified source in Git;
9. regenerate release evidence from that **single clean SHA**.

Do not promote the archived historical verdict as verification of this modified handoff.
