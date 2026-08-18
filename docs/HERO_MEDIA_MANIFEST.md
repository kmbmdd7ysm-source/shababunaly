# Hero and campaign media manifest

## Current runtime architecture

The site uses **local optimized WebP posters** for fast first paint and fallback, plus **real basketball MP4 sources hosted by Under Armour's official Scene7 media service** for hero motion. The old locally generated pseudo-motion MP4 files have been removed so they cannot be mistaken for real campaign video.

The CSP already permits HTTPS media through `media-src 'self' blob: https:`. If a remote video cannot load, every hero falls back to its local poster without blocking the page.

## Active hero video map

| Route | Official basketball video source |
| --- | --- |
| Home | Under Armour Curry 13 product video |
| Shop | Under Armour Curry 12 Dub Nation product video |
| Footwear | Under Armour Lockdown 7 Low product video |
| Clothing | Under Armour D. Fox 2 x Sharpie product video |
| Shoe Finder | Under Armour Jet '25 product video |
| Custom | Under Armour D. Fox 2 At The Buzzer product video |
| Discover | Under Armour Curry 3Z 24 product video |
| Teams | Under Armour Curry 12 Wardell Mode product video |
| Stories | Under Armour Curry Splash 25 product video |

The exact URLs live in `src/data/localHeroMedia.ts` and are restricted by `validate-final-hardening.mjs` to the official `underarmour.scene7.com/is/content/Underarmour/` host.

## Playback and fallback rules

- Muted autoplay only.
- `playsInline` and looping are preserved.
- Reduced-motion and data-saver users get the poster instead of motion.
- Video errors permanently fall back to the poster for the current render.
- Desktop and mobile keep independent local poster crops.
- No YouTube iframe or third-party player UI is used.

## Image sourcing

Hero posters and editorial section art are locally optimized from the global basketball source set in `assets/source/global-basketball-refresh/`, including Nike, adidas, Puma, Under Armour and New Balance basketball imagery. Exact Nike accessory/product imagery that is better served from the source page is referenced directly in `src/data/categories.ts`.
