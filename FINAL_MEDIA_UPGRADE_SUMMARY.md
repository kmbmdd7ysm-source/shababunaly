# SHABABUNA — Official Global Media Upgrade

Final source-of-truth update based only on the latest supplied project.

## Storefront media
- Home hero: official Nike imagery with runtime official Nike campaign motion resolver.
- Shop / Discover / Category heroes: official Nike / New Balance / Spalding imagery with first-party motion resolver where applicable.
- Stories / Teams / Customize / Shoe Finder: no internal product photos are reused as generic editorial backgrounds.
- Generated slideshow MP4/WebM files are not bundled as campaign footage.
- Reduced-motion users retain official static image fallbacks.

## Products
- Product cards use `object-fit: contain` so the full item remains visible rather than cropped/over-zoomed.
- Master placeholder records remain preserved for operations/history but are excluded from live storefront product results until real media exists.
- Static base: 75 real-media catalogue records + 4 official Spalding additions = 79 real-media storefront products before dynamic GOAT/StockX expansion.
- Official Spalding additions fill Basketballs and Equipment with real products and multi-angle galleries where first-party galleries were available.

## Validation
- `npm run verify:source`: PASS.
- Data validation: 0 errors / 0 warnings.
- Brand validation: 0 errors.
- Media validation: 0 errors; 44 warnings correspond to retained master placeholder records that are excluded from the live storefront.
- Commerce, SEO, cloud source readiness, performance budget, static integrity, design tokens, hardening and core smoke tests: PASS.
- TypeScript syntax-class scan: no syntax-class errors. Full project typecheck/build requires the package dependencies, which are not bundled in this ZIP.

## External media behavior
Third-party editorial media remains referenced/embedded from official first-party sources and is subject to those owners' availability and rights. The project does not claim affiliation or ownership of those assets.
