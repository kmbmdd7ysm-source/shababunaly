# SHABABUNA Media Source Provenance

## Current hero video source of truth

`src/data/localHeroMedia.ts` now references 13 distinct, self-hosted MP4 files under `public/media/hero-videos/`. These are the replacement basketball videos supplied by the user on 2026-08-19. The runtime uses native muted autoplay `<video>` elements with local poster fallbacks. No external hero-video host is required.

Current hero slots:

- Home — `/media/hero-videos/home.mp4`
- Shop — `/media/hero-videos/shop.mp4`
- Footwear — `/media/hero-videos/footwear.mp4`
- Clothing — `/media/hero-videos/clothing.mp4`
- Accessories — `/media/hero-videos/accessories.mp4`
- Basketballs — `/media/hero-videos/basketballs.mp4`
- Equipment — `/media/hero-videos/equipment.mp4`
- Shoe Finder — `/media/hero-videos/shoe-finder.mp4`
- Custom — `/media/hero-videos/custom.mp4`
- Discover — `/media/hero-videos/discover.mp4`
- Teams — `/media/hero-videos/teams.mp4`
- Stories — `/media/hero-videos/stories.mp4`
- Releases — `/media/hero-videos/releases.mp4`

All corresponding first-paint posters are local under `public/media/hero-posters/`. Editorial and campaign stills are local under `public/media/localized-brand/`.
