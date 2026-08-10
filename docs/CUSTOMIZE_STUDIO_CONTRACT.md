# Customize Studio — data and asset contract for the 3D phase

Phase 2 prepares the ground for the full 3D Customize Studio. It does not build
it. This document is the contract the later dedicated phase implements against,
and it is written so that the boundary between a **cinematic preview** and a
**factory-approved production output** can never blur.

## The rule that governs everything here

> A cinematic approximation is never presented as a factory-accurate production
> model, and no production claim is ever generated from estimated geometry.

The repository already distinguishes these. `runProductionPreflight()` returns
`readyForQuote` and `readyForManufacturing` as **separate** booleans and a
`status` of `blocked` | `preflight_passed_pending_factory_proof` |
`factory_approved`. The Studio's job is to surface that distinction, not to
invent it.

Today `factory-profiles/generic-production-v2.json` is `approved: false` with
`productTypes: []`, and `validate-factory-readiness.mjs` reports **all 12
product types blocked**. So at present **every** custom product can only ever be
shown as a cinematic approximation.

## Supported product types (12) and their declared production geometry

Read directly from `PRODUCT_DIMENSIONS` in `src/services/productionPreflight.js`.
These panel names are the contract between the 3D model and the preflight
engine; a model whose panels do not match them cannot be validated.

| Key              | Min | Roster | Panels                                                      | mm (W×H) |
| ---------------- | --: | :----: | ----------------------------------------------------------- | -------- |
| `game-set`       |  10 |   ✅   | jersey-front, jersey-back, shorts-front, shorts-back        | 620×780  |
| `game-jersey`    |  10 |   ✅   | jersey-front, jersey-back                                   | 620×780  |
| `game-shorts`    |  10 |   ✅   | shorts-front, shorts-back                                   | 620×520  |
| `practice-set`   |  10 |   ✅   | top-front, top-back, shorts-front, shorts-back              | 620×780  |
| `shooting-shirt` |  10 |   ✅   | shirt-front, shirt-back, sleeves                            | 680×800  |
| `hoodie`         |  10 |   ✖    | body-front, body-back, sleeves, hood                        | 760×860  |
| `team-pants`     |  10 |   ✖    | left-leg, right-leg, waistband                              | 520×1040 |
| `tracksuit`      |  10 |   ✖    | jacket-front, jacket-back, sleeves, pants-left, pants-right | 760×1040 |
| `team-bag`       |  10 |   ✖    | front-panel, back-panel, gusset                             | 680×420  |
| `sleeve`         |  10 |   ✖    | sleeve-panel                                                | 190×520  |
| `basketball`     |   6 |   ✖    | ball-panel-layout                                           | 750×750  |
| `hoop-padding`   |   1 |   ✖    | post-pad, base-pad                                          | 1100×650 |

Shared production values already declared: bleed 5 mm, safe inset 12 mm, seam
allowance 10 mm, minimum raster 300 DPI, colour profile CMYK.

### Requested types that do not exist yet

Reversible training uniforms, compression products and t-shirts are **not**
custom product types today; warm-up tops map to `shooting-shirt` and backpacks
to `team-bag`. Adding any of them is a product and factory decision, and each
requires: a `CUSTOM_PRODUCT_TYPES` entry, a matching `PRODUCT_DIMENSIONS` entry
(**omitting this makes `widthMm` NaN and silently breaks every DPI calculation**),
a `preview` implementation in _both_ `DesignPreview.jsx` and
`ProductionDesignEditor.jsx`, Arabic labels, a minimum, and tests.

`design.variant` currently supports `home | away | third`. Training, warm-up and
staff variants are an additive enum change plus Arabic labels plus factory
confirmation that they use the same pattern.

## Camera standard

| Preset          | Azimuth | Elevation | Purpose                                                 |
| --------------- | ------- | --------- | ------------------------------------------------------- |
| `front`         | 0°      | 0°        | Default; matches the `front` production view            |
| `back`          | 180°    | 0°        | Matches the `back` production view                      |
| `left`          | −90°    | 0°        | Garment's own left, not the screen's                    |
| `right`         | +90°    | 0°        | Garment's own right                                     |
| `three-quarter` | 35°     | 10°       | Presentation only                                       |
| `detail`        | free    | free      | Macro; zoom clamped to the product's real mm dimensions |

Left and right are **relative to the garment** and are never swapped in Arabic —
a jersey's left sleeve is its left sleeve in both languages. Orbit direction
mirrors so dragging "forward" reads correctly in both, and preset transitions
ease over 480 ms along a spherical path so front-to-back rotation is continuous.

## Data contract

`custom_designs.design_data` is `jsonb`, so the entire 3D configuration persists
with **no migration, no new table, no new RPC, no API change and no RLS change**:

```jsonc
design_data.studio3d = {
  schemaVersion: 1,
  enabled: false,
  modelRef: null,               // "/models/custom/<type>/v1" — same-origin only
  modelVersion: null,
  accuracyTier: "cinematic",    // "cinematic" | "factory" — DISPLAY ONLY, never trusted
  factoryProfileId: null,
  panelColors: {},              // keys MUST be members of PRODUCT_DIMENSIONS[type].panels
  materialRef: null,
  environment: "production",    // "studio" | "arena" | "production"
  lighting: "production",       // "production" | "campaign"
  camera: { preset: "front", azimuth: 0, polar: 1.35, distance: 1 },
  sizePreview: null,            // non-null only when a graded pattern exists
  rosterPreviewIndex: null,     // transient view state, stripped before save
  compareVersionId: null,
  updatedAt: null
}
```

Validation rules, mirroring the discipline `normalizeStudio` already applies:
unknown `panelColors` keys are dropped; values must match `/^#[0-9a-f]{6}$/i`;
`modelRef` must match `^/models/[a-z0-9/-]+$` because `connect-src 'self'`
forbids fetching a model from any other origin; `rosterPreviewIndex` is stripped
before save because it is a view, not a design; and **`accuracyTier` is
recomputed, never read**, whenever a production artefact is generated.

**Backward compatibility is mandatory:** the whole `studio3d` object is
optional, and a design saved without it must load, render and export
identically. That gets its own test.

## Asset contract, per product type

| Asset            | Requirement                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Base mesh        | Quad topology, modelled to the mm envelope above                                                                                 |
| Panel separation | **Must match the declared `panels` list exactly** — this is the contract with preflight                                          |
| UV layout        | Non-overlapping, print area on a predictable region, second channel for the AO bake                                              |
| Bakes            | Ambient occlusion / curvature                                                                                                    |
| LODs             | Desktop ≤ 60 k triangles, mobile ≤ 25 k                                                                                          |
| Format           | glTF 2.0 `.glb`, quantised with `gltf-transform` (**not** Draco — see below)                                                     |
| Textures         | WebP, ≤ 2048² desktop / ≤ 1024² mobile (**not** KTX2 — see below)                                                                |
| Sidecar          | `model.json`: panel→material map, print-area UV rect per panel, camera presets, physical scale, LOD availability, `accuracyTier` |
| Shared           | One fabric normal + ORM atlas across all garments; three small environment maps                                                  |

### Why not Draco or KTX2

The CSP has no `'wasm-unsafe-eval'`, so both WASM decoders are blocked, and it
declares no `worker-src`, so the blob-URL workers KTX2Loader spawns are blocked
too. Quantised GLB plus WebP textures needs neither. Adopting compression means
changing the security posture, which is its own reviewed decision.

## Factory contract — what unlocks Tier F

Every item below is already enforced by `validate-factory-readiness.mjs`. Tier F
adds no new trust mechanism; it consumes the one that exists.

**Per manufacturer:** legal identity, contact, dated and named approval
certificate (file + SHA-256), ICC profile (file + SHA-256), Pantone library +
version + SHA-256, ΔE tolerance ≤ 2 with formula, measurement instrument /
illuminant / observer.

**Per product type:** cut-piece CAD for every named panel, seam geometry and
allowances, stitch-line paths, graded patterns for every produced size (≥ 2,
hashed), fabric code with stretch % and shrinkage %, sublimation panel mapping,
template artifact (file + SHA-256), and a passed dated manufacturer test run
with a hashed report.

If **any** single item is missing or a hash fails, the product type falls back
to cinematic automatically. There is no partial Tier F.

## Three states, three sets of rights

|                                 | Prototype                            | Cinematic (Tier C)                                              | Factory-accurate (Tier F)                         |
| ------------------------------- | ------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------- |
| Geometry                        | Estimated, unreviewed                | Estimated, art-directed to the mm envelope                      | **Derived from factory CAD**                      |
| Colour                          | Screen only                          | Screen only, warning always shown                               | ICC + Pantone evidence, measured ΔE ≤ 2           |
| Sizes                           | None                                 | None — selector disabled with the reason stated                 | Graded pattern per produced size                  |
| Badge EN                        | `PROTOTYPE — internal only`          | `CONCEPT PREVIEW — not a production proof`                      | `FACTORY-ACCURATE — pattern {ref} · profile {id}` |
| Badge AR                        | `نموذج أولي — للاستخدام الداخلي فقط` | `معاينة تصورية — ليست بروفة إنتاج`                              | `مطابق لمواصفات المصنع`                           |
| Customer-visible                | **Never**                            | Yes                                                             | Yes                                               |
| In a proof PDF                  | **Never**                            | Watermarked page **after** the vector views, **off by default** | Yes                                               |
| In the production package       | **Never**                            | **Never**                                                       | Yes                                               |
| Can set `readyForManufacturing` | **Never**                            | **Never**                                                       | Only via the existing preflight gate              |

Enforced in three independent places so one mistake cannot cause a
misrepresentation: a DOM-rendered bilingual badge (never inside the canvas, so
it survives every fallback), an `accuracy` field travelling inside
`manifest.json` with burned-in watermarks on non-authoritative imagery, and a
build-time validator.

## Proofs stay vector

Proof PDFs and the production ZIP continue to come from `buildDesignViewSvg()`
and `buildProductionPackage()`. **A GPU render is non-deterministic across
drivers and must never become a contractual document.** The file names
`artwork/{front,back,side}.svg`, `manifest.json` and `roster.csv` are asserted
by the release gate and do not change.

## Mobile and desktop control architecture

Desktop: orbit with damping, six camera presets, panel list, layer rail, spec
panel. Mobile: full-height artboard, bottom-sheet tools at three detents, one
finger orbits, two fingers pinch and pan, double-tap resets, 44 px handles plus
numeric steppers as the accessible equivalent, one card per roster player.

Every 3D capability has a DOM control: camera presets are buttons, orbit has
numeric azimuth/elevation inputs, zoom is a slider with a text value, panel
colours are a labelled radiogroup with **accessible colour names**, and a live
region describes the current state. The canvas is `aria-hidden` and never
focusable — it is a rendering of state, never the state itself.

## What Phase 2 delivered toward this

- The homepage Customize presentation is now a tech-pack plate with the real
  minimums read from `data/customization.js` and a premium entry path.
- The `gw-*` system, `Stamp`, `SpecBlock` and `Chapter` are the primitives the
  Studio will be built from.
- `ProductViewer` establishes the tiered, fallback-first, accessibility-first
  viewer pattern that the 3D surface extends.
- This contract, so the later phase implements against a written spec rather
  than improvising.
