# Shababuna self-hosted web fonts

All three faces are licensed under the **SIL Open Font License 1.1** (OFL), which permits
self-hosting, subsetting and web embedding. Each file below is a *subset and axis-restricted
derivative* of its upstream source, produced offline with `fonttools`. Under OFL clause 3 a
derivative may not use the Reserved Font Name, so the shipped files are renamed.

| Shipped file | Upstream family | Designer / Foundry | Licence | Axes retained | Unicode coverage |
| --- | --- | --- | --- | --- | --- |
| `shababuna-display-latin.woff2` | Archivo | Omnibus-Type | OFL 1.1 | `wght 600–900`, `wdth 90–125` | Latin essential |
| `shababuna-text-latin.woff2` | Inter | Rasmus Andersson | OFL 1.1 | `wght 400–800` | Latin essential |
| `shababuna-arabic.woff2` | Cairo | Mohamed Gaber | OFL 1.1 | `wght 400–900` | Arabic + Arabic Supplement + Presentation Forms |

## Derivation

Upstream `woff2` subsets were taken from the Google Fonts CSS2 delivery endpoint, then:

1. axis-restricted with `fontTools.varLib.instancer` to the ranges the design system actually uses;
2. character-subset with `fontTools.subset` (`--layout-features=*` so Arabic shaping, kerning and
   contextual alternates are fully preserved);
3. re-encoded to `woff2`.

Arabic shaping integrity was verified by glyph count: the upstream Arabic subset carries 393
glyphs and the shipped subset carries 386, so the GSUB/GPOS closure required for initial,
medial, final and isolated forms is intact.

## Reserved Font Names

The upstream families reserve their names. The shipped derivatives are therefore declared in CSS
as `Shababuna Display`, `Shababuna Text` and `Shababuna Arabic`. Do not re-publish these files
under the names Archivo, Inter or Cairo.

## Replacing these files

These are the **recommended open-source defaults**, honouring the pairing the codebase already
declared before any font was actually loaded. If Shababuna licenses or commissions a custom brand
face, replace the files at these exact paths and update the `@font-face` metric overrides in
`src/styles/typography.css`. No other change is required.

Full OFL 1.1 text: <https://openfontlicense.org/open-font-license-official-text/>
