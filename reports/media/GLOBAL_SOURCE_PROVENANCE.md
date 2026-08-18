# Global basketball media provenance — current runtime

## Hero motion

`src/data/localHeroMedia.ts` contains 13 distinct direct MP4 renditions on `underarmour.scene7.com/is/content/Underarmour/`. The native `<video>` player is used; no iframe player is part of the current hero runtime.

The current direct video keys are:

- Curry 13 — `auto_dim7_6007670-419`
- Curry 12 Dub Nation — `auto_dim7_3027630-001`
- Lockdown 7 Low — `auto_dim7_3027646-600`
- D. Fox 2 x Sharpie — `auto_dim7_6017491-100`
- UA Jet 25 — `auto_dim7_6001587-102`
- D. Fox 2 At The Buzzer — `auto_dim7_6012728-001`
- Curry 3Z 24 — `auto_dim7_3027627-004`
- Curry 12 Wardell — `auto_dim7_3027634-001`
- Curry Splash 25 — `auto_dim7_3028459-016`
- D. Fox 2 — `auto_dim7_6000777-400`
- Curry 13 Grade School — `auto_dim7_6014870-419`
- Lockdown 8 Patches Grade School — `auto_dim7_6015212-361`
- Curry 12 Team — `auto_dim7_6000736-103`

These are direct remote MP4 references, not first-party stored video files. The project does not describe them as self-hosted.

## Local still media

Editorial stills selected for active storefront mappings are localized under `public/media/localized-brand/`, `public/media/official-brand/` and existing local product image folders. Runtime category/custom/story mappings no longer require external static-image hotlinks.

## Verification

The current source truth is generated/checked by:

- `npm run validate:phase2-systems`
- `npm run validate:media`
- `npm run validate:final-hardening`

Historical media reports that described the old YouTube or nine-video architecture are stored under `reports/archive/phase2-pre-native-video/` and are not current release evidence.
