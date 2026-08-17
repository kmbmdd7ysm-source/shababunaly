# SHABABUNA Global Basketball Media Final Audit

## Runtime media architecture
- 9 independent hero systems: Home, Shop, Footwear, Clothing, Shoe Finder, Custom, Discover, Teams, Stories.
- Every hero has a local desktop MP4, local mobile MP4, local desktop poster and local mobile poster.
- No YouTube, iframe or runtime remote-media dependency is used by the hero/editorial layer.
- Editorial/category/custom media no longer points at SHABABUNA product photography.

## Hero technical QA
- 18/18 MP4 files: H.264, yuv420p, 24 fps.
- Desktop: 1600x900. Mobile: 900x1600.
- Duration: 6 seconds each.
- Exact duplicate video hashes: 0.
- Exact duplicate hero poster hashes: 0.
- All hero files are below the project's 4 MB launch-video budget.

## Editorial image QA
- 86 dedicated section/category/custom images under `public/media/official-brand/sections/`.
- Exact duplicate hashes: 0.
- All referenced editorial media files exist locally.

## Source/provenance
The external source imagery used to build the local hero/editorial library was gathered from global basketball brand editorial/newsroom material, including Nike Basketball official releases for A'ja Wilson and Sabrina Ionescu. The website uses local derivatives so playback and rendering do not depend on remote hosts.

Important: the locally encoded hero MP4 files are motion treatments built from the externally sourced official basketball imagery; they are not represented as verbatim copies of a brand's original campaign-film MP4. This avoids YouTube/hotlink dependencies and keeps the deployed site self-contained.

## Source validation
`npm run verify:source` — PASS.
Data validation — 0 errors / 0 warnings. Media validation — 0 errors (existing master-data warnings remain informational). Performance budget, static integrity, design tokens, final hardening and core smoke tests — PASS.

## Build note
A fresh Vite production build cannot be completed in this execution image because the archive does not contain an installed `vite` binary / complete `node_modules`. Source validation is complete; deployment should run the locked package install followed by `npm run build`.
