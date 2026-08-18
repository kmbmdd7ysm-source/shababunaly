# Hero media manifest — Phase 2 runtime

## Runtime architecture

All customer-facing hero motion is rendered with the native HTML `<video>` element. No YouTube/Vimeo iframe or third-party player chrome is used. Hero posters are local files under `public/media/hero-posters/` and remain static; there is no Ken Burns / fake image-motion fallback.

The current video payloads are **direct MP4 renditions on Under Armour's Scene7/Dynamic Media host**. They are not self-hosted bytes. This is intentionally stated in the source so a future licensed first-party MP4/WebM package can replace the URL map without changing page components.

## Active hero map

| Runtime key | Placement |
| --- | --- |
| `home` | Home |
| `shop` | Shop landing |
| `footwear` | Footwear category |
| `clothing` | Clothing category |
| `accessories` | Accessories category |
| `basketballs` | Basketballs category |
| `equipment` | Equipment category |
| `shoeFinder` | Shoe Finder |
| `custom` | Custom |
| `discover` | Discover landing / collection mapping |
| `teams` | Teams & Wholesale |
| `stories` | Stories |
| `releases` | Releases |

There are 13 distinct direct MP4 URLs in `src/data/localHeroMedia.ts`. `scripts/validate-phase2-systems.mjs` and `scripts/validate-final-hardening.mjs` fail if the native-video contract regresses.

## Playback / fallback contract

- `muted`, `autoPlay`, `loop`, `playsInline`.
- No controls or player branding.
- Reduced-motion / data-saver / lower-capability paths use the static local poster.
- Video load failure falls back to the local poster.
- The Home first-paint preload is local and matches the React hero geometry.
- Posters never animate to imitate video.

## Editorial stills

Active category, merchandising, Custom, Teams and Stories still-image maps use local project assets. The previous runtime static-image hotlinks were removed from those mappings.

## Source independence boundary

The poster/editorial still layer is local. The hero video bytes remain on the external direct MP4 host. Full deletion-proof video delivery requires licensed MP4/WebM files to be stored on Shababuna-controlled storage/CDN and then substituted in `src/data/localHeroMedia.ts`.
