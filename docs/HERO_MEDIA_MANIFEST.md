# Hero and campaign media manifest

The runtime architecture for these assets is **built and shipping**. The assets
themselves **do not exist**. `public/media/hero/` contains two poster images and
nothing else; there is no video file anywhere in the repository.

Nothing in the product pretends otherwise: with no source configured the hero is
a deliberate poster composition with the court plan drawn over it, and it never
requests a file that is not there.

## How a final asset is installed

Two supported routes, no code change either way:

1. **Environment** — set `VITE_HERO_VIDEO_URL` and `VITE_HERO_MOBILE_VIDEO_URL`.
2. **Operations** — set `desktopVideoUrl` / `mobileVideoUrl` on the
   `home_hero` record via the existing site-content CMS, which overrides the
   environment values at runtime.

Both are validated: only `https://` sources are accepted, matching the
`media-src 'self' blob: https:` directive already in the CSP. A file over 4 MB
must not be committed to `public/` — `validate-performance-budget.mjs` rejects
it — so final video is hosted externally and referenced by URL.

## Playback rules already enforced in code

| Condition                       | Behaviour                                                             |
| ------------------------------- | --------------------------------------------------------------------- |
| No source configured            | Poster only; no request is ever issued                                |
| `prefers-reduced-motion`        | Poster only                                                           |
| `navigator.connection.saveData` | Poster only                                                           |
| Device capability tier B or C   | Poster only                                                           |
| Before user intent              | Poster only — the film waits for pointer, key or scroll               |
| Video error                     | Falls back to the poster permanently, no retry                        |
| Audio                           | `muted` always; there is no autoplay-audio path in the code           |
| Layout                          | Explicit `width`/`height` on poster and film, so no CLS               |
| Content                         | Every word and every call to action is in the DOM, never in the video |

## Required — homepage hero

| Field        | Desktop master                                                                                              | Mobile master                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Purpose      | The opening sequence: the ground being made ready                                                           | Vertical-first recut, not a centre crop           |
| Aspect ratio | 16:9                                                                                                        | 9:16                                              |
| Tablet       | 4:3 centre-safe crop from the desktop master                                                                | —                                                 |
| Duration     | 12 s seamless loop                                                                                          | 8 s seamless loop                                 |
| Resolution   | 1920×1080                                                                                                   | 1080×1920                                         |
| Frame rate   | 24 fps                                                                                                      | 24 fps                                            |
| Codec        | AV1 primary, H.264 fallback                                                                                 | AV1 primary, H.264 fallback                       |
| Target size  | **≤ 3.2 MB**                                                                                                | **≤ 1.4 MB**                                      |
| Poster frame | The frame the film loops on, exported to replace `shababuna-hero-poster.webp` (**≤ 40 KB**)                 | `shababuna-hero-poster-mobile.webp` (**≤ 30 KB**) |
| Loop point   | On a dark frame so the seam is invisible                                                                    | Same                                              |
| Grade        | Low saturation, held highlights, one warm sodium note, blacks lifted to ~4 IRE so mobile codecs do not band | Same                                              |
| Sound        | None in the loop                                                                                            | None                                              |

**Content direction.** Court preparation shot from above — chalk, tape, paint,
a roller, a line snapping — match-cut to the same act at product scale: a seam
being sewn, a number pressed, a ball inflated. It ends the moment a floodlight
strikes. The film is about making the ground ready, which is what the business
does.

## Required — production dependencies

| Dependency                     | Needed for                                                                                                               | Status               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| Principal shoot (2–3 days)     | Court preparation, workshop, dusk floodlight                                                                             | **Missing**          |
| Drone / overhead footage       | Top-down and orthographic court passes, dawn and dusk. **Requires permits in Tripoli**                                   | **Missing**          |
| Athlete footage                | Feet, hands and silhouette direction reduces rights complexity. **Signed releases required**                             | **Missing**          |
| 100 mm macro package           | Stitch, seam, mesh, press, inflation, number application                                                                 | **Missing**          |
| Product photography            | 44 products with no photography; 24 more with a single image (see `PRODUCT_VIEWER_MATRIX.md`)                            | **Missing**          |
| Turntable capture              | 24–36 frames per product to unlock Level B                                                                               | **Missing**          |
| CGI / 3D rendering             | Only as a fallback if a physical shoot is impossible. Must not depict facilities or capabilities Shababuna does not have | **Not commissioned** |
| Music licence and audio design | Campaign master only — the site loop is silent                                                                           | **Missing**          |
| Client approvals               | Real case studies on `/our-work`                                                                                         | **Missing**          |

## Secondary media, same architecture

| Asset                                            | Ratio                     | Duration  | Target   | Status                                         |
| ------------------------------------------------ | ------------------------- | --------- | -------- | ---------------------------------------------- |
| Collection films (clothing, footwear, equipment) | 21:9 desktop / 4:5 mobile | 10 s loop | ≤ 2 MB   | Missing                                        |
| Product detail loop (fabric, seam)               | 4:5                       | 5 s loop  | ≤ 700 KB | Missing                                        |
| Product macro (stitch, mesh, grain)              | 1:1                       | 4 s loop  | ≤ 500 KB | Missing                                        |
| Customize Studio explainer                       | 16:9 / 9:16               | 20 s      | ≤ 3 MB   | Missing — **captions and transcript required** |
| Teams / B2B presentation                         | 16:9 / 9:16               | 45 s      | ≤ 6 MB   | Missing — captions and transcript required     |
| Our Work showcase                                | 16:9 / 9:16               | 30 s      | ≤ 5 MB   | **Blocked on client approval**                 |
| Brand story                                      | 16:9 / 9:16               | 60 s      | ≤ 8 MB   | Missing — documentary shoot                    |
| Transition clips                                 | any                       | 1.5 s     | **0 KB** | **Not required — done in CSS/SVG**             |

## Accessibility obligations that travel with each asset

Captions wherever speech exists. A transcript wherever the clip carries
narrative meaning. Audio description considered for the brand story. An
accessible play/pause control on anything longer than 5 s. No audio ever without
explicit consent. And in every case a text equivalent, because no essential
content may live only inside a video.
