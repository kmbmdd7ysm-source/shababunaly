# SHABABUNA — Global Basketball Media Final Audit

Date: 2026-08-17

## Current storefront media contract

### Real hero motion
The storefront no longer uses locally generated moving-still MP4 files. Nine hero routes now use nine distinct real basketball MP4 assets from Under Armour's official Scene7 media host, with local WebP posters as fallback:

1. Home — Curry 13
2. Shop — Curry 12 Dub Nation
3. Footwear — Lockdown 7 Low
4. Clothing — D. Fox 2 x Sharpie
5. Basketball Shoe Finder — Jet '25
6. Custom — D. Fox 2 At The Buzzer
7. Discover — Curry 3Z 24
8. Teams & Wholesale — Curry 12 Wardell Mode
9. Stories / Our Work — Curry Splash 25

The exact HTTPS sources are in `src/data/localHeroMedia.ts`. The approved host is enforced by `scripts/validate-final-hardening.mjs`.

### Global brand image set
The visible editorial/category system is basketball-first and uses sourced imagery from Nike, adidas, Puma, Under Armour and New Balance. A dedicated Nike teamwear source was added for team/uniform contexts.

Exact Nike product media is used at runtime for accessory categories where a generic editorial crop would be misleading: socks, bags, arm sleeve, wrist support, headwear, towel, bottle, training accessory, main basketball and custom basketball.

### Repetition and placement
- 86 section/category/custom WebP files reviewed and independently composed.
- Exact duplicate section hashes: 0.
- 18 local hero posters reviewed and independently composed.
- Exact duplicate hero-poster hashes: 0.
- Malformed baked-in text/banner artwork removed from Discover / Stories / lower-page cards.
- Footwear is shoe-first; clothing is apparel/teamwear-first; basketballs use ball/court/player media; equipment uses court/hoop context; Custom and Teams prioritize uniforms/teamwear.

### Removed legacy media
- Old locally generated pseudo-motion hero MP4s: removed from `public/media/heroes/`.
- Old refresh generator that could recreate pseudo-motion videos: removed.
- Runtime hero video sources are HTTPS MP4s, not YouTube embeds or iframe players.

## QA
`npm run verify:source` — PASS.

The full source gate completed successfully, including data, commerce, brand, media, SEO, cloud source-readiness, architecture, performance budget, static integrity, design tokens, hardening, catalog/factory/provider structural checks, localization structure, visual baseline metadata, action pinning and core smoke tests.

`npm run validate:media` — 0 errors / 44 warnings. The 44 warnings are existing catalog placeholder references and are not hero/section-media failures.

Public media image integrity — 0 corrupt images.

A fresh Vite production build cannot be executed from this extracted archive because the uploaded package does not include the Vite binary / complete dependency installation. Source validation and core smoke tests do pass; deployment should run the locked dependency install before `npm run build`.
