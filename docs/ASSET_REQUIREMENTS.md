# Assets Shababuna must supply

Measured against the repository, not estimated. Every count below was produced
by reading `src/data/products.js`, `public/` and `factory-profiles/`.

> **Nothing in the redesign invents an asset.** Where something is missing, the
> design has a designed static state and says so in words. The site is complete
> without every item on this list — it simply gets better as they arrive.

---

## 1. Blocking the next phase

| #   | Item                                 | Why it blocks                                                                                                                                                                                                                                                             |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **A named visual-baseline reviewer** | `scripts/validate-visual-baselines.mjs` requires `reviewer`, `reviewedAt`, `sourceCommit` and a per-file SHA-256 map. `visual-baselines.json` is currently empty, so there is nothing to regress against and every visual phase is unreviewable until a person owns this. |
| 2   | **A typography decision**            | Phase 1 ships the recommended open-source defaults (see §2). If Shababuna wants a licensed or commissioned brand face instead, that decision should land before the type system is adopted site-wide, because it changes every rendered page.                             |

---

## 2. Typography — supplied in Phase 1, replaceable

Phase 1 self-hosts three OFL faces, subset and axis-restricted offline. They
honour the pairing the codebase already declared before any font was actually
loaded.

| Shipped                         | Upstream | Licence | Size    |
| ------------------------------- | -------- | ------- | ------- |
| `shababuna-display-latin.woff2` | Archivo  | OFL 1.1 | 36.1 KB |
| `shababuna-text-latin.woff2`    | Inter    | OFL 1.1 | 22.3 KB |
| `shababuna-arabic.woff2`        | Cairo    | OFL 1.1 | 21.2 KB |

**Alternatives, if Shababuna prefers a different voice:**

- **Arabic, more technical:** IBM Plex Sans Arabic (OFL). Costs ~59 KB for two
  static weights versus 21.2 KB for one Cairo variable file, so it is a
  deliberate trade of bytes for character.
- **Arabic, geometric Kufi display:** Noto Kufi Arabic (OFL). Excellent for
  headlines but ~107 KB subset, which does not fit the first-paint budget as
  the only Arabic face.
- **A licensed or custom brand face.** Replace the files at the same paths and
  update the metric overrides in `src/styles/fonts.css`. Nothing else changes.

To replace: drop the new `.woff2` at the same three paths, re-measure
`ascent`/`descent`/`lineGap`/`xHeight`, update the fallback `@font-face`
overrides, run `node scripts/validate-design-tokens.mjs`.

---

## 3. Product photography — the largest gap

| Measurement                                                   | Value         |
| ------------------------------------------------------------- | ------------- |
| Active products                                               | **69**        |
| Products using a generic category SVG instead of a photograph | **44 (64 %)** |
| Products with real photography                                | 25            |
| Products with more than one image (a gallery)                 | **1**         |
| Products with a hover/second image                            | **1**         |
| Products verified as Ready-to-Ship                            | **0**         |

Required, in priority order:

1. **Studio product shoot — 44 missing products.** Four angles plus a macro and
   a scale reference each. Shot on a chalk-white sweep with neutral studio
   light so the results match the GROUNDWORK production view.
2. **Additional angles for the 68 products that have no gallery.**
3. **Colourway photography.** Several products declare multiple colours and
   reuse one image for all of them.
4. **Material macro shots** for every apparel line.
5. **Turntable sequences** — 36 frames at 1200 px for the 12 highest-margin
   products. This is the recommended first 3D investment: it converts better
   per pound than a WebGL scene and carries none of the CSP, coverage or device
   risk.
6. **Verified Libya stock data.** Ready-to-Ship is the single strongest local
   differentiator and it is currently invisible because nothing is verified.

---

## 4. Video — nothing exists

There is **no video file anywhere in the repository**. `public/media/hero/`
contains two poster images and nothing else, so the "cinematic hero" is
currently a still image with text over it.

Sixteen assets are specified in the master plan (purpose, shot list, camera,
lens, lighting, duration, per-device aspect, codec, target size, poster,
loading, autoplay rules, accessibility, fallbacks). The production
dependencies behind them:

- Principal shoot, 2–3 days: court preparation, workshop/factory, dusk floodlight.
- Drone footage: top-down and orthographic court passes, dawn and dusk.
  **Requires permits in Tripoli.**
- Athlete footage with signed usage rights. A feet/hands/silhouette-first
  direction reduces rights complexity considerably.
- 100 mm macro package: stitch, seam, mesh, press, inflation, number application.
- Music licence and audio design — for the campaign master only. **The site
  loop is silent, and no audio ever plays without explicit consent.**

---

## 5. `Our Work` — blocked on client approval

The page currently publishes capabilities only, and the copy correctly states
that client names and project photography appear only after approval. Real case
studies need: client name, permission, and photography with usage rights.

Until then the page stays honest rather than filled with invented projects.

---

## 6. Custom products — no 3D and no factory data

| Category                                                                | Status                                         |
| ----------------------------------------------------------------------- | ---------------------------------------------- |
| Custom product types supported                                          | 12                                             |
| Types with enough data for an accurate 3D model                         | **0**                                          |
| Types that could carry a clearly-labelled cinematic approximation today | 12                                             |
| Types requiring new professional 3D modelling                           | 12                                             |
| Types requiring factory CAD patterns                                    | 12                                             |
| Types requiring graded patterns per size                                | 9 (3 are one-size and need a dimensional spec) |
| Types that can be manufacturing-accurate today                          | **0**                                          |

`factory-profiles/generic-production-v2.json` is `approved: false` with
`productTypes: []`, `gradedPatterns: {}` and `materialProfiles: {}`, and
`scripts/validate-factory-readiness.mjs` reports every type blocked.

**Per approved manufacturer:** legal identity, contact, dated and named
approval certificate (file + SHA-256), ICC profile (file + SHA-256), Pantone
library + version + SHA-256, ΔE tolerance ≤ 2 with formula, measurement
instrument / illuminant / observer.

**Per product type:** cut-piece CAD for every named panel, seam geometry and
allowances, stitch-line paths, graded patterns for every produced size
(≥ 2 sizes, hashed), fabric code with stretch % and shrinkage %, sublimation
panel mapping, template artifact (file + SHA-256), and a passed dated
manufacturer test run with a hashed report.

**3D assets, none of which exist:** base meshes, panel separation matching the
declared `PRODUCT_DIMENSIONS` panels, UV maps, AO bakes, normal maps, roughness
maps, material scans, desktop and mobile LODs, environment maps, `model.json`
sidecars.

**Also absent:** any photography of a custom product at all — they are made to
order and none has been photographed.

**Arabic jersey lettering** additionally needs written factory confirmation that
the chosen Arabic display face is embeddable and printable, because it changes
production output. Today `DesignPreview` hard-codes `Impact`/`Arial Black`, so
Arabic club names — the norm in Libya — cannot be rendered on any product.

---

## 7. Product decisions, not engineering decisions

- Should reversible practice sets, compression products and t-shirts become
  custom product types? None exists today.
- Should backpacks split out of `team-bag`?
- Should `design.variant` extend beyond `home | away | third` to include
  `training`, `warmup` and `staff`?

Each requires a matching `PRODUCT_DIMENSIONS` entry, a `preview` implementation
in two components, Arabic labels, a minimum quantity and factory confirmation.
