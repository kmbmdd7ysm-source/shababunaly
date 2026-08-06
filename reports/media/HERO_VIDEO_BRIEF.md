# Shababuna Hero Film — Production Brief

Status: architecture and motion-poster fallbacks ship in the current review build.
This brief is for an external production pass. The current site must not claim this film exists.

## Purpose
Cinematic opening for `/` that establishes Shababuna as basketball retail, custom manufacturing, club supply and wholesale — without copying any third-party brand language.

## Versions
| Version | Aspect | Resolution | Notes |
|---|---|---|---|
| Desktop hero | 16:9 | 1920×1080 (master 3840×2160) | Full-bleed under floating header |
| Tablet | 4:3 crop | 1600×1200 | Rebalanced safe title area |
| Mobile | 9:16 | 1080×1920 | Type anchored at foot; light from upper third |

## Duration / tech
- Duration: 12–16s loopable cold open + 4s hold for CTA
- Frame rate: 24fps cinematic / 30fps mobile encode
- Codecs: H.265/HEVC primary, H.264 fallback, optional AV1
- Audio: muted autoplay; optional bed under user gesture only
- File-size budgets: desktop ≤ 4MB, mobile ≤ 2MB (initial), progressive enhancement for higher quality
- Poster: match `arena-atmosphere-wide` / `arena-atmosphere-tall` compositions already in `public/media/atmosphere/`

## Scene list
1. Overhead night court — empty hardwood, single flood pool (establish)
2. Slow push along the three-point arc — light dust in beam
3. Macro fabric / mesh — performance knit, raking light
4. Silhouette of a jersey on a lit stage (no brand marks of other companies)
5. Hands adjusting a roster sheet / number — human craft, not celebrity
6. Wide return to court + brand wordmark resolve

## Camera
- Mostly locked-off or 5–8% drift; no whip-pans
- One crane-like rise in scene 1 (or digital equivalent)
- Macro slider on fabric (scene 3)

## Accessibility / product behavior
- `prefers-reduced-motion`: poster only
- Slow network: poster + CSS parallax already in journey
- Pause when offscreen / tab hidden
- Never required for navigation — CTAs remain in DOM text

## Delivery package
- Master ProRes or DNxHR
- Encoded MP4/WebM set per version
- Poster PNG/WebP at 1x/2x
- Shot log with timecodes matching this brief
