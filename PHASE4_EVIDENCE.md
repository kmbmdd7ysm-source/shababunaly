# Phase 4 — Customize Studio

Branch `cursor/shababuna-redesign-master-plan-dc14`. Rollback: revert the Phase 4
commit, or restore the `DesignPreview` import in `src/pages/CustomizePage.jsx`.

## Baseline

Tree clean at the Phase 3 commit. `typecheck` 76 (the count includes two
pre-existing `rows="4"` errors in `CustomizePage.jsx` that predate this phase).
`verify:source` green. `/customize` carried **1 axe violation** in English —
`design-preview-disclaimer` at 2.35:1.

## The honest position, stated first

**No 3D model exists in this repository.** There is no `.glb`, no
`public/models/`, no factory profile that is `approved: true`, and
`validate-factory-readiness.mjs` reports all 12 custom product types blocked.

So Phase 4 does not ship a WebGL studio rendering nothing. It ships **the camera,
lighting, overlay and accuracy architecture that the 3D surface will inherit
unchanged**, driving the existing vector artboard, and it labels what that is.
Building a three.js scene with no geometry to load would have been a demo, not a
feature, and the brief explicitly forbids representing estimated geometry as
production-accurate.

## Scope delivered

`StudioStage` wraps the existing `DesignPreview` — which is **untouched**, so
proofs and production output still come from the same vector source — and adds:

- **Five garment-relative camera presets**: front, right, back, left, detail.
  Left and right are the _garment's_, not the screen's, so they do not swap in
  Arabic. Only the reading direction of "next" flips.
- **Three named lighting modes**: production, studio, arena.
- **Zoom** as a labelled slider with a numeric readout, `+`/`-` on the keyboard,
  and clamping.
- **Print-zone and safe-area overlay** drawn at the 12 mm safe inset and 5 mm
  bleed declared in `FACTORY_TEMPLATE_SPECS`.
- **Pointer / touch drag** stepping the same preset ring the buttons use, so
  gesture and keyboard can never disagree about the current view.
- **A live region** describing view, azimuth, zoom and lighting for anyone who
  cannot see the artboard.
- **The accuracy badge**, computed from the real `runProductionPreflight` result.

## Accuracy cannot be faked — enforced by test

The badge is _read_, never asserted, and the tests pin every way it could go
wrong:

| Input                                                           | Result              |
| --------------------------------------------------------------- | ------------------- |
| No preflight result at all                                      | **Concept preview** |
| `preflight_passed_pending_factory_proof`                        | **Concept preview** |
| `status: 'factory_approved'` but `readyForManufacturing: false` | **Concept preview** |
| `factory_approved` **and** `readyForManufacturing: true`        | Factory-accurate    |

Concept preview carries the sentence: _"Vector approximation, not a production
proof. Colours are screen-only and geometry is estimated until factory patterns
are supplied."_ — in both languages, as DOM text outside the artboard, so it
survives every fallback.

The two states differ in **wording, shape and colour** (hollow square vs filled
circle), not colour alone.

## Files created

- `src/components/custom/StudioStage.jsx`
- `src/styles/studio.css`
- `tests/ui/studioStage.test.jsx` — 16 tests, **100%** coverage
- `PHASE4_EVIDENCE.md`

## Files modified

- `src/pages/CustomizePage.jsx` — one import, one element. No logic.
- `src/styles/shell.css` — removed a wrong disclaimer rule (see below)
- `scripts/validate-design-tokens.mjs` — `studio.css` added to bridge layers

## Dependencies

**None added. None removed.** No three.js, because there is nothing to render.

## Tests

| Command                                   | Result                                            |
| ----------------------------------------- | ------------------------------------------------- |
| `test:node`                               | 321/322 — unchanged                               |
| `test:ui`                                 | 46/47 — same single pre-existing failure, +16 new |
| `typecheck`                               | **75** — one _below_ the 76 baseline, zero new    |
| `verify:source`                           | pass                                              |
| `lint-project` / `validate-design-tokens` | pass                                              |
| `build`                                   | pass                                              |

`StudioStage.jsx` at **100%** statements / branches / functions / lines.

### A real testing problem, solved honestly

jsdom implements no `PointerEvent`, so `fireEvent.pointerDown(el, {clientX})`
silently drops the coordinate and the drag could not be exercised at all. Two
things were done rather than deleting the test:

1. The swipe decision was extracted into a pure exported `resolveSwipe(travel,
dir)` and tested directly, including non-finite input and both directions.
2. The gesture itself is driven by hand-built events dispatched through the
   generic `fireEvent(node, event)` form, which still flushes the React update.

A `if (!node) return` guard was also removed rather than left uncovered: the
element is rendered unconditionally, so the branch could never fire. A guard
that cannot fire is dead code, not safety.

## Browser review

`/customize`, both locales, 390×844 and 1440×1000, with axe and keyboard:

**4 checks, 4 clean, 0 axe violations, 0 horizontal overflow, one h1, 82
focusables on mobile and 92 on desktop.**

- **Desktop:** dark masthead, four-step nav, studio stage with camera row,
  lighting row, zoom slider and print-zone toggle.
- **Mobile:** control rows scroll horizontally instead of wrapping into a wall
  of buttons; every control keeps a full touch target; no overflow.
- **Arabic / RTL:** complete. Left/right stay garment-relative; drag direction
  and arrow keys follow the reading direction.
- **Keyboard:** the artboard is focusable, arrows rotate, `+`/`-` zoom, and
  every capability has a DOM control.
- **Reduced motion:** stage and artboard transitions disabled via
  `data-reduced`.

## Regression found and fixed in this phase

`design-preview-disclaimer` measured 2.35:1. The Phase 2 fix had assumed a light
ground and set `--sh-ink-70`; the artboard is actually **#090909**, so that made
it dark-on-dark. Investigation with CDP showed the real winner all along was
`.section p { color:#4d4d4d }` at (0,1,1), which had been overriding the
artboard's own `#a9a9a3` long before this phase. Fixed with a two-class selector
and the inverse ink. This is the one line telling a customer their design is a
draft and not a production proof, so it mattered.

## Preserved

`DesignPreview.jsx`, `ProductionDesignEditor.jsx`, `productionPreflight.js`,
roster import and validation, versioning, sharing, proof generation, quote
submission, Turnstile, the B2B connection and every minimum are **untouched**.
`CustomizePage.jsx` changed by two lines.

## Known limitations

- The stage renders a **vector approximation**, not a 3D model, and says so.
- Camera "views" are honest transforms of that drawing (the back mirrors, the
  sides compress). They are not photographed or modelled faces.
- Lighting modes are presentation only and are never represented as measured
  colour.
- Panel-level colour, layer ordering, undo/redo and roster preview remain as the
  existing implementation provides them; this phase did not alter that logic.

## External blockers

Everything in `docs/CUSTOMIZE_STUDIO_CONTRACT.md` §"Factory contract": CAD
patterns, graded sizes, panel geometry, cut and stitch lines, seam allowances,
sublimation maps, fabric data, ICC profiles, Pantone references, factory
approvals and manufacturing test results. Plus the per-type 3D assets.

Until those exist, **every custom product can only ever be a concept preview**,
and the interface says so.
