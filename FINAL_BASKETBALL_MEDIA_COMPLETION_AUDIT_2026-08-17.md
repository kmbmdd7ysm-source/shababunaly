# SHABABUNA — Basketball Media Completion Audit

Date: 2026-08-17

## Final storefront media contract

### Dedicated hero motion
- Home: `nike-only-basketball`
- Shop: `adidas-basketball-is-everything`
- Footwear: `adidas-ant-20-foot-hoop`
- Clothing: `newbalance-quiet-noise`
- Basketball Shoe Finder: `under-armour-curry-make-that-old`
- Custom: `jordan-too-easy`

All six hero sources are different and are restricted to the basketball-only allowlist used by the project.

### Discover
Unique motion is assigned to four Discover stories:
- Trending now: `footlocker-hoops-lives-here`
- Just dropped: `nike-kobe-conductor`
- New this week: `footlocker-ant-adidas`
- Best sellers: `footlocker-melo-puma`

The remaining Discover collections use dedicated basketball still imagery instead of replaying those videos.

### Home lower-page media
The lower Home merchandising areas use dedicated stills instead of replaying hero videos. The audit found 9/9 unique lower-page still assignments before product rails. The Home editorial campaign is separate from the Shop hero campaign.

### Custom product choices
All 12 custom product types have explicit reference images and no reference image constant is repeated:
1. Full Game Set
2. Game Jersey
3. Game Shorts
4. Practice Set
5. Shooting Shirt
6. Team Hoodie
7. Team Pants
8. Team Tracksuit
9. Team Bag
10. Player Sleeve
11. Basketball
12. Hoop Padding

The reference set uses basketball-specific imagery from Nike/Jordan, New Balance Basketball and Spalding sources.

## Technical safeguards checked
- `youtube-nocookie.com` is allowed by the production `frame-src` CSP.
- The official-media API allowlist returns a valid HTTPS media/embed URL for every source currently assigned to the storefront.
- Legacy multisport source entries are not assigned to any storefront UI placement.
- Every motion component preserves a still-image fallback and reduced-motion behavior.

## Verification performed
- Basketball media placement audit: PASS
- 10/10 assigned video sources resolved through `/api/official-media`: PASS
- Custom image coverage 12/12 unique: PASS
- Home lower-page still uniqueness 9/9: PASS
- Catalogue data validation: 0 errors, 0 warnings
- Commerce validation: PASS
- Brand validation: 0 errors
- Media validation: 0 errors; 44 existing catalogue placeholder-reference warnings (the validator intentionally counts concept artwork as warnings until final product photography is supplied)
- SEO validation: PASS
- Source architecture validation: PASS
- Static integrity validation: PASS
- Final source hardening validation: PASS
- Source check: PASS
- Project custom lint checks: PASS
- TypeScript syntax/transpile checks with `--noCheck` for standard, production and strict-critical configs: PASS

## Build environment note
A fresh Vite production bundle was not generated in this execution environment because the project dependencies are not installed here and the container cannot reach the npm registry. This is an environment limitation rather than a source validation failure. The project source and deployment configuration were verified with the checks listed above.
