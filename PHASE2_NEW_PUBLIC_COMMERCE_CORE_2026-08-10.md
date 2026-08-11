# SHABABUNA — Phase 2: New Public Commerce Core

Date: 2026-08-10
Scope: Phase 2 only. Phase 3 has **not** started.

## Objective

Replace the old public-facing visual/composition system for the commerce core with a new media-first, product-first experience while preserving catalog, variants, cart, checkout, auth, shipping, inventory, localization, and other established business logic.

This phase deliberately does **not** perform the Phase 3 deep rebuild of PDP intelligence, the full Custom Studio, Teams workspace, Account/Checkout internals, or final media ingestion.

## Implemented in this phase

### Global public shell
- Rebuilt primary navigation around New, Shop, Footwear, Apparel, Custom, Discover, and Releases.
- Moved Teams & Wholesale to a secondary role instead of making it a primary retail pillar.
- Rebuilt `MainHeader` with a calmer desktop navigation, Shop mega menu, utility actions, responsive full-screen mobile menu, focus trap, Escape handling, focus return, locale/currency controls, and scroll-aware transparent/solid behavior.
- Added a dedicated mobile bottom dock for Home, Shop, Discover, Search, and Bag.
- Rebuilt `GlobalChrome` around the new header/dock architecture.
- Rebuilt the public footer with reduced copy and clearer commerce/discovery/company/help hierarchy.
- Preserved announcement behavior while allowing the transparent header to visually overlay cinematic Home media instead of pushing the opening visual down.

### Home
- Removed the old Journey/Chapter/Floor-led composition from the Home route.
- Wired the existing cinematic media capability into the Home opening experience.
- Added a media-first sequence for Trending, New Arrivals, featured campaign space, visual categories, performance discovery, conditional Ready Now, Custom teaser, Stories teaser, and one secondary Teams block.
- Ready Now is rendered only when verified stock exists; no inventory is fabricated.

### Discover
- Added `/discover` and `/discover/:slug`.
- Added the discovery families: Trending Now, Just Dropped, New This Week, Best Sellers, Performance Picks, Court Essentials, Ready Now, and Shababuna Selects.
- Discovery pages are driven by real/current catalog state where possible and do not invent scarcity, popularity telemetry, release data, or stock.
- Ready Now is suppressed from the discovery landing page while verified ready-to-ship stock is zero.

### Releases foundation
- Added `/releases`.
- The route is intentionally honest with current data: if there are no verified release dates, it does not fabricate a release calendar.
- Existing recently-added products may be shown separately and are not mislabeled as verified scheduled releases.

### Shop / PLP
- Rebuilt the Shop composition while preserving existing query, filtering, sorting, pagination/data, variant, and availability logic.
- Replaced the old technical catalogue presentation with a product-first structure.
- Added cleaner department/category navigation, a visual Shop entry, a sticky merchandising toolbar, filters in a drawer/bottom-sheet pattern, sorting, featured rail, product grid, honest Ready-to-Ship state, and special-request entry.
- Added keyboard/focus behavior to the filter dialog.

### Product cards / Quick Add
- Rebuilt public cards around 4:5 media with no generic boxed shell.
- Preserved real variant/cart/quote/availability behavior.
- Added real secondary-image hover only where a second source exists.
- Reduced badges to meaningful states.
- Changed favorite/quick actions to a consistent lightweight visual family instead of mixed square/round controls.
- Removed generic compare clutter from every card while preserving compare functionality elsewhere in the product/basketball system.

### Search
- Rebuilt the global Search overlay as a full-screen discovery experience.
- Added current products, pages, shortcuts, recent searches, and discovery-oriented suggestions.
- Corrected overlay navigation history so selecting a result does not force an unnecessary second Back action.
- Rebuilt the `/search` page with a cleaner product-first result structure and optional brand filtering.

### Design foundation for Phase 2 routes
Added scoped Phase 2 visual layers:
- `src/styles/design/phase2-chrome.css`
- `src/styles/design/phase2-commerce.css`
- `src/styles/design/phase2-home.css`
- `src/styles/design/phase2-shop.css`
- `src/styles/design/phase2-discovery.css`
- `src/styles/design/phase2-search.css`

These layers use the established Shababuna token system rather than raw repeated colors. They are also included in the project design-token/logical-direction validator so they are not outside quality checks.

### Merchandising/data architecture
- Added `src/data/merchandising.ts` for home/category/discovery configuration rather than hardcoding all merchandising composition directly into page components.
- Current atmosphere assets are treated as temporary/current media inputs. No fake final product/campaign photography is claimed.

### Routing / SEO / static discovery
Added or integrated:
- `/discover`
- `/discover/trending-now`
- `/discover/just-dropped`
- `/discover/new-this-week`
- `/discover/best-sellers`
- `/discover/performance-picks`
- `/discover/court-essentials`
- `/discover/shababuna-selects`
- `/releases`
- `/new` redirects to `/discover/new-this-week`

The static-page generator and architecture validator were updated accordingly. `/discover/ready-now` is intentionally not promoted as a static current collection while verified stock remains zero.

## Preserved business/technical state

- Catalog structure remains intact.
- Source verification reports 69 products.
- Source verification reports 982 variants.
- Ready-to-ship verified stock remains 0; no stock was invented.
- Existing cart/checkout/auth/shipping/inventory/Supabase/viewer business layers were not replaced as part of this visual-core phase.
- Vercel dependency compatibility fix remains unchanged:
  - Node: `22.x`
  - `three`: `0.163.0`
  - `@google/model-viewer`: `^3.5.0`
  - `@react-three/fiber`: `^8.17.10`
- `package.json` and `package-lock.json` remain byte-for-byte identical to the Phase 2 input ZIP.

## Verification performed

### Passed
- TypeScript syntax transpile of all Phase 2 changed TS/TSX files: 0 syntax failures.
- CSS parser pass for all six new Phase 2 CSS files: 0 parse failures.
- Navigation/brand unit test: passed.
- Core utilities tests: passed.
- Core smoke tests: passed.
- World-class architecture validator: passed.
- Full source verification command: passed, including data, commerce, brand, media rules, SEO, cloud source readiness, architecture, media budgets, static integrity, design tokens, product-viewer matrix, hardening, catalog/factory readiness reporting, Arabic structure, provider readiness, baseline metadata and core smoke checks.
- Phase 2 design styles are now included in design-token/logical-direction validation.

### Runtime limitation of this environment
A fresh dependency installation could not be completed in the execution environment because the environment could not reach the npm registry (`EAI_AGAIN`) for uncached tarballs. Therefore this package does **not** claim a fresh local Vite production build, Playwright pass, or Lighthouse run after Phase 2.

This is not presented as a passed runtime check. The partial `node_modules` tree created by the failed install attempt was removed before packaging.

## Phase boundary

Phase 2 ends here.

The following intentionally remain for Phase 3 after the user re-uploads this ZIP:
- full PDP recomposition and basketball intelligence;
- product media-mode orchestration at final UX level;
- Shoe Finder / performance compare;
- full Custom Studio redesign and deep 3D/custom workflow;
- Teams & Wholesale deep redesign/workspace separation;
- Stories editorial system expansion;
- Cart/Checkout/Account/support-route visual replacement beyond the new global shell;
- supporting commerce journeys and deep functional E2E.

Final hero/product/editorial photography, final video, real product spinsets, and production 3D assets remain later media inputs and are not fabricated in this phase.
