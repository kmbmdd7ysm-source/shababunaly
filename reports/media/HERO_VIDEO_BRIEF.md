# Shababuna first-party hero film — future ownership brief

Status: the runtime already uses native `<video>` with static local posters. Current hero MP4 payloads are direct remote brand-media URLs. This brief defines the future first-party/licensed replacement if Shababuna wants deletion-proof video ownership.

## Delivery target

- Desktop master: 16:9, 1920×1080 minimum (4K master preferred).
- Mobile master: 9:16, 1080×1920.
- 10–16 second seamless loop.
- H.264 MP4 + WebM/AV1 optional derivative.
- Muted autoplay-safe visual storytelling.
- Desktop initial video budget target ≤ 4 MB; mobile ≤ 2 MB.
- Static WebP/AVIF poster per crop.

## Runtime contract

The final owned films drop into `src/data/localHeroMedia.ts`. No page/component redesign is required. Reduced-motion and data-saver users continue to receive a static poster only.

## Ownership requirement

Only media that Shababuna is licensed to self-host should be copied into first-party storage. Until those files are supplied/approved, the source must continue to describe the current direct MP4s as externally hosted.
