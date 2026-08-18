# SHABABUNA media — page-by-page review and correction

## What was reviewed

Home, Shop, Footwear, Clothing, Shoe Finder, Custom, Discover, Teams & Wholesale, Stories / Our Work, category tiles and subcategory media.

## Corrections applied

### Home
- Rebuilt the poster around basketball footwear, court and athlete imagery rather than one repeated portrait.
- Runtime hero motion now uses a real official Under Armour basketball MP4 instead of a generated moving still.
- Home campaign, performance, court and story imagery were re-composed without the old text-image banner artifact.

### Shop
- Rebuilt the opening poster with actual basketball footwear imagery.
- Uses a distinct real official basketball product video.
- Footwear, apparel, basketball, accessories and equipment category tiles now use category-specific visual families.

### Footwear + Shoe Finder
- Kept these pages shoe-first.
- Removed player/apparel imagery from primary footwear cards where it was visually misleading.
- Hero posters use separate shoe combinations; runtime videos are real official basketball product MP4 sources.

### Clothing
- Reassigned game jerseys, shorts, full sets, practice gear, tees, hoodies, pants, tracksuits and compression to apparel/player/teamwear visuals.
- Socks use a real Nike Elite sock image from Nike's product media instead of an unrelated court/shoe crop.
- Clothing hero motion uses a real official basketball product MP4.

### Accessories
- Replaced runtime imagery for bags, socks, sleeves, supports, headwear, towels, bottles and training accessories with relevant Nike product media surfaced from Nike product pages.
- Removed shoe-case imagery from accessory cards.
- Local fallback/editorial assets now remain basketball/player/teamwear context rather than random footwear.

### Basketballs
- Main basketball tile uses a real Nike basketball product image.
- Custom basketball tile uses a separate Nike basketball product image.
- Indoor/outdoor supporting art stays ball/player/court specific.

### Equipment
- Removed shoe-first imagery from hoops, rims, court equipment and equipment cards.
- Replaced with court, hoop and active basketball context from global basketball sources.

### Custom
- Reoriented game set, jersey, shorts, practice set, hoodie, team pants, tracksuit, sleeve, ball and hoop-padding visuals toward teamwear and basketball use.
- Uses a distinct real official basketball MP4 for hero motion.

### Discover
- Removed the malformed baked-in text banner that was appearing as partial lettering.
- Trending, dropped, new, best, performance, court, ready and selects are now individually composed.
- Uses a real official basketball MP4 for hero motion.

### Teams & Wholesale
- Added a dedicated Nike teamwear source and prioritized team/uniform/training imagery.
- Uniform, training, teamwear and equipment cards are separate compositions.
- Uses a real official basketball MP4 for hero motion.

### Stories / Our Work
- Removed the malformed text-image overlay.
- Separated game, footwear, culture and design imagery.
- Uses a real official basketball MP4 for hero motion.

## Repetition pass

All 86 local section WebP files are independently composed and the exact-file duplicate count is zero. All 18 hero posters are also unique at the file level.

## Hero video correction

The previous locally generated motion MP4 files were removed. `src/data/localHeroMedia.ts` now points to nine distinct real MP4 assets on Under Armour's official Scene7 basketball media host. Posters remain local so the page still has a reliable fallback.
