# Official editorial media sources

The storefront's non-product editorial layer intentionally uses official first-party basketball media as remote references. Product photography remains tied to the actual product record and is never replaced with unrelated lifestyle imagery.

## Nike
- Kobe: https://www.nike.com/kobe
- Winning Isn't for Everyone campaign: https://about.nike.com/en/newsroom/releases/winning-isnt-for-everyone-campaign
- Kobe newsroom assets are referenced from `static.nike.com` / `nmp.about.nike.com`.

## New Balance
- Basketball: https://www.newbalance.com/basketball/
- Roster/editorial images are referenced from New Balance's own Demandware CDN.

## Spalding
- Basketball: https://www.spalding.com/c/basketball
- Product/editorial images are referenced from Spalding's official `assets.fotlinc.com` CDN.

## Motion behavior
- `/api/official-media` resolves motion only from allowlisted Nike and New Balance first-party pages.
- It prefers direct MP4, then WebM, then HLS; when an official YouTube embed is present it can use `youtube-nocookie.com`.
- Every video placement has an official image fallback and respects reduced-motion preferences.
- No generated slideshow MP4s are bundled as brand campaign video.

## Rights
All third-party marks, photographs, campaign films and product media remain the property of their respective owners and are subject to the source site's terms. Their inclusion here is a technical source reference, not a statement of sponsorship or affiliation.
