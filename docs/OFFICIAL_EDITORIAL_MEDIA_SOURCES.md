# Basketball editorial media source policy

The storefront's active static editorial layer uses local project assets. Hero motion is rendered through native HTML `<video>` using the 13 direct MP4 references declared in `src/data/localHeroMedia.ts`.

## Runtime rules

- No YouTube/Vimeo iframe player is used for hero playback.
- No third-party player branding or controls are overlaid in the hero.
- Local static posters are the reduced-motion/error fallback.
- Runtime category, Custom, Teams and Stories still-image mappings do not hotlink external image CDNs.
- A video URL is not described as self-hosted unless the MP4/WebM bytes are stored on Shababuna-controlled storage/CDN.

## Rights boundary

Third-party media remains the property of its respective owner and is subject to the source owner's terms. A technical source reference does not imply sponsorship, affiliation or a right to redistribute the media. First-party hosting must only be used for files Shababuna is licensed to store and serve.

For the current machine-checked runtime state see `reports/phase2/phase2-systems-audit.json` and `docs/HERO_MEDIA_MANIFEST.md`.
