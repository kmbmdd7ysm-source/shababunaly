# SHABABUNA Local Media Audit

- Source of Truth: `SHABABUNA_FINAL_BASKETBALL_MEDIA_COMPLETE_VERIFIED_20260817.zip`
- Hero videos: **18**
- Hero posters: **18**
- Critical media references checked: **102**
- Missing critical media files: **0**
- External critical-media violations: **0**
- Duplicate hero video hashes: **0**
- YouTube/external hero resolver removed: **True**
- Marketplace live gallery endpoint removed: **True**

## Hero matrix

| Hero | Desktop | Mobile |
|---|---:|---:|
| home | 1600×900 · 577 KB | 900×1600 · 88 KB |
| shop | 1600×900 · 925 KB | 900×1600 · 123 KB |
| footwear | 1600×900 · 872 KB | 900×1600 · 123 KB |
| clothing | 1600×900 · 897 KB | 900×1600 · 95 KB |
| shoe-finder | 1600×900 · 993 KB | 900×1600 · 138 KB |
| custom | 1600×900 · 545 KB | 900×1600 · 58 KB |
| discover | 1600×900 · 1077 KB | 900×1600 · 131 KB |
| teams | 1600×900 · 890 KB | 900×1600 · 119 KB |
| stories | 1600×900 · 386 KB | 900×1600 · 57 KB |

## Runtime rules

- Critical hero/editorial media is served from `/public` local files.
- No YouTube iframe or external hero resolver is used.
- Product detail pages no longer inject third-party marketplace gallery images at runtime.
- Marketplace catalog enrichment cannot add a new product whose primary image only exists on a remote marketplace CDN.
- Reduced-motion and Save-Data fallbacks remain enabled.
