# QUARANTINED BRAND ASSETS — DO NOT USE

These files were shipped in the repository as the Shababuna logo. They are not.
Each one contains a near-verbatim reproduction of the **NBA "Logoman"** silhouette
(the Jerry West figure in a rounded rectangle), which is a registered trademark of
NBA Properties, Inc.

They were wired into, among other places:

- `SITE.logo` / `SITE.logoLight` — the loading screen and the `Organization.logo`
  field of the site's structured data, i.e. the mark Google was being told is the
  Shababuna logo;
- `favicon.svg`, `favicon.png` and the web app manifest icons;
- `shababuna-social.png`, the Open Graph image served to every social platform;
- the homepage hero watermark.

They have been removed from every code path. They are kept here, out of `dist`,
only so the owner can confirm what was found and remove them deliberately.

## Files

| File                          | Contains                                      |
| ----------------------------- | --------------------------------------------- |
| `shababuna-mark-black.png`    | the silhouette alone                          |
| `shababuna-mark-white.png`    | the silhouette alone                          |
| `shababuna-full-en-black.png` | script wordmark + silhouette                  |
| `shababuna-full-en-white.png` | script wordmark + silhouette                  |
| `shababuna-full-ar-black.png` | Arabic wordmark + silhouette                  |
| `shababuna-full-ar-white.png` | Arabic wordmark + silhouette                  |
| `shababuna-social.png`        | OG card built around the lockup               |
| `favicon-legacy.svg`          | a hand-drawn approximation of the same figure |
| `favicon-legacy.png`          | raster of the same                            |

## What is genuine and still in use

`shababuna-wordmark-black.png`, `shababuna-wordmark-white.png`,
`shababuna-wordmark-ar-black.png`, `shababuna-wordmark-ar-white.png` — the
"Shababuna" script wordmark. This appears to be original artwork and is now the
only brand asset the site displays.

## What the owner still needs to supply

A real Shababuna **symbol**: a square/compact mark for the favicon, the app icon
and small UI slots, where a script wordmark is illegible. The interim mark now in
use (`shababuna-monogram.svg`) is a plain typographic "S" plate drawn from the
site's own display type. It is deliberately neutral and deliberately not a
pictorial mark, so it cannot be mistaken for anyone's logo — but it is a
placeholder, not an identity. It should be replaced by a designed symbol.
