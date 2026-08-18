# Shababuna Phase 3 media review — final correction pass

## Corrected in this pass

- Removed all locally generated hero MP4 slideshow/pseudo-motion files from `public/media/heroes/`.
- Restored direct official basketball MP4 runtime sources on the approved Under Armour Scene7 host.
- Expanded the runtime map to 12 distinct video URLs so Home, Shop, Footwear, Clothing, Accessories, Basketballs, Equipment, Shoe Finder, Custom, Discover, Teams, and Stories do not point to the same video URL.
- Rebuilt the duplicated Teams and Shoe Finder poster files from separate single-image sources.
- Hero poster exact-hash duplicates are now zero.
- Replaced several repeated/low-resolution editorial placements with separate single-image global basketball sources.
- Kept the application logic, commerce, forms, catalog, checkout, account, shipping, and operations behavior unchanged.

## Verification

- `npm run verify:source`: PASS.
- `validate:data`: 0 errors, 0 warnings.
- `validate:brand`: 0 errors.
- `validate:media`: 0 errors. Existing warnings are catalog placeholder warnings already tracked by the project.
- `validate:static-integrity`: PASS.
- `validate:design-tokens`: PASS.
- `validate:final-hardening`: PASS.
- `test:core`: PASS.
- 12 official remote hero video URLs are unique.
- 0 local hero MP4 pseudo-motion files remain.
- 0 exact duplicate hashes among local hero WebP poster files.

Production release gates that require external providers, a fresh dependency install/build, live database, browser run, factory evidence, or human visual approval remain separate from this source/media correction pass.
