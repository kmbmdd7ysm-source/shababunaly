# Global basketball media provenance

## Hero video host

All active hero motion URLs are direct MP4 assets from Under Armour's official Dynamic Media / Scene7 host:

- `https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6007670-419`
- `https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3027630-001`
- `https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3027646-600`
- `https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6017491-100`
- `https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6001587-102`
- `https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6012728-001`
- `https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3027627-004`
- `https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3027634-001`
- `https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3028459-016`

## Exact Nike category media

The runtime category model references source media for categories that should show a literal product rather than a generic editorial image:

- Nike Elite basketball socks — Nike product media (`static.nike.com`)
- Nike basketball bag — Nike-surfaced product media (`content.stylitics.com`)
- Ja Dri-FIT basketball arm sleeve — Nike product media (`static.nike.com`)
- Nike wrist support / wristband — Nike-surfaced product media
- Nike headband — Nike-surfaced product media
- Nike Cooling Towel — Nike product media (`static.nike.com`)
- Nike bottle — Nike-surfaced product media
- Nike head tie — Nike-surfaced product media
- Nike Playground basketball — Nike-surfaced product media
- Kobe basketball — Nike-surfaced product media

The exact URLs are centralized in `src/data/categories.ts`.

## Localized editorial source set

`assets/source/global-basketball-refresh/` contains the localized source set used to build optimized editorial posters/cards. The set includes basketball imagery representing Nike, adidas, Puma, Under Armour and New Balance. The site consumes optimized local WebP derivatives for these editorial placements so layout remains fast and stable.
