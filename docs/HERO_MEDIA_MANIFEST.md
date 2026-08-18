# Hero and campaign media manifest

## Current runtime architecture

The site uses **local optimized WebP posters** for fast first paint and fallback, plus **real basketball MP4 sources hosted by Under Armour's official Scene7 media service** for hero motion. Locally generated pseudo-motion/slideshow MP4 files are not bundled or referenced.

The CSP permits HTTPS media through `media-src 'self' blob: https:`. If a remote video cannot load, the hero falls back to its local poster without blocking navigation or content.

## Active hero video map

| Route / world | Runtime video |
| --- | --- |
| Home | Curry 13 official product video |
| Shop | Curry 12 Dub Nation official product video |
| Footwear | Lockdown 7 Low official product video |
| Clothing | D. Fox 2 x Sharpie official product video |
| Accessories | D. Fox 2 official product video |
| Basketballs | UA Jet '25 official product video |
| Equipment | Lockdown 8 official product video |
| Shoe Finder | UA Jet '25 Grade School official product video |
| Custom | D. Fox 2 At The Buzzer official product video |
| Discover | Curry 3Z 24 official product video |
| Teams | Curry 12 Wardell Mode official product video |
| Stories | Curry Splash 25 official product video |

The exact URLs live in `src/data/localHeroMedia.ts` and are restricted by `validate-final-hardening.mjs` to the approved `underarmour.scene7.com/is/content/Underarmour/` path.

## Playback and fallback rules

- Muted autoplay only.
- `playsInline` and looping are preserved.
- Reduced-motion and data-saver users get the poster instead of motion.
- Video errors fall back to the poster for the current render.
- No YouTube iframe or third-party player UI is used.
- Local hero poster files are exact-hash unique.

## Image sourcing

Hero posters and editorial section art use individual basketball images rather than multi-image collages in the active Phase 3 page configuration. High-resolution single-image sources are stored under `public/media/official-brand/clean/` and existing optimized brand/product directories.
