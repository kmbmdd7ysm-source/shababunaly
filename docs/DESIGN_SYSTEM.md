# SHABABUNA design system — GROUNDWORK «خَطّ الأرض»

> **Status: Phase 1 foundation.** The token, font, motion, geometry and layout
> layers exist and are proven on one isolated prototype at `/lab/home`.
> **The live site is unchanged and does not yet consume any of it.**

---

## 1. The idea

_Before anyone plays, someone draws the ground._

Every basketball court on earth begins as measured lines painted onto a
surface. Shababuna does the same thing for clubs: it measures, specifies,
proofs and manufactures. The interface therefore behaves like a **living
survey drawing** — a precise technical sheet that products and people are
placed onto.

The governing rule, so the system never becomes mush:

> **The system is measured and light. The film is lit and dark. They meet at a
> threshold, and they never blend.**

A dark chapter is always full-bleed, always bounded by a drawn rule, and always
exits back to the measured chalk field. There are no gradients between the two
worlds and no dark UI chrome.

---

## 2. Isolation contract (Phase 1)

This is what makes the foundation safe to land before anything adopts it.

| Rule                                                    | Why                                                                                                                                                                                                        | Verified by                                          |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Every token is namespaced `--sh-*`                      | Never redefines `--bg`, `--text`, `--accent`, `--font-body`, `--font-display`, `--space-*`, `--motion-*`, `--ink`, `--paper`, `--ease*`, `--radius*`, `--shadow*`, `--container`, `--gutter`, `--header-h` | grep of the built entry CSS                          |
| Font families are named `Shababuna Display/Text/Arabic` | `global.css` still asks for `Inter`/`Archivo`/`Noto Kufi Arabic`, which stay unloaded, so no live text matches a real face                                                                                 | 6 `@font-face` in the entry CSS, all Shababuna-named |
| Every _applied_ rule is scoped to `.lab-scope`          | Nothing can reach a selector the current site renders                                                                                                                                                      | 0 occurrences of `.lab-scope` in the entry CSS       |
| Only contracts are global                               | `tokens.css` + `fonts.css` in the entry; applied layers import from the route                                                                                                                              | entry CSS +1.99 KB gzip                              |

When a later phase adopts the system site-wide, the `.lab-scope ` prefix is
removed mechanically and the applied layers move up to the components that need
them. Nothing else has to change.

---

## 3. Files

```
src/styles/tokens.css       the --sh-* contract, capability tiers, contrast modes   GLOBAL
src/styles/fonts.css        six @font-face declarations                              GLOBAL
src/styles/typography.css   applied type scale, Latin + Arabic                       route chunk
src/styles/motion.css       easings, durations, scroll choreography, reduced motion  route chunk
src/styles/geometry.css     rules, ticks, leaders, registration, plates, stamps      route chunk
src/styles/layout.css       grid, regions, buttons, spec table, focus                route chunk
src/styles/lab-home.css     prototype-only composition                               route chunk
```

---

## 4. Colour

Three materials, one signal, one reserved semantic.

| Token                         | Value                             | Role                                                |
| ----------------------------- | --------------------------------- | --------------------------------------------------- |
| `--sh-chalk`                  | `#f7f5f0`                         | the ground                                          |
| `--sh-chalk-2` / `-3`         | `#efece5` / `#e4e0d7`             | recessed plane / inset field                        |
| `--sh-ink`                    | `#0b0b0c`                         | the line and the type                               |
| `--sh-ink-70` / `-50` / `-35` | `#4a4a4c` / `#6f6f72` / `#818184` | secondary / tertiary / non-text                     |
| `--sh-rule`                   | ink @ 12 %                        | **the most-used colour in the system**              |
| `--sh-rule-strong`            | ink @ 26 %                        | emphasis rule                                       |
| `--sh-maple`                  | `#965b25`                         | material warmth, text-safe                          |
| `--sh-maple-tint`             | `#f3e6d4`                         | maple surface                                       |
| `--sh-verified`               | `#0f773d`                         | **RESERVED: verified Ready-to-Ship inventory only** |
| `--sh-signal`                 | `#2440c4`                         | interactive / focus / selected — never decorative   |
| `--sh-signal-on-dark`         | `#687bd6`                         | the same role re-solved for a dark chapter          |
| `--sh-alert` / `--sh-warn`    | `#a4290b` / `#7a4708`             | error / warning                                     |
| `--sh-night` / `-2`           | `#0a0b0d` / `#14161a`             | dark chapter ground / plane                         |
| `--sh-sodium` / `--sh-moon`   | `#e39b3d` / `#9db7c4`             | film-world warm key / cool fill                     |

**Rules.** One accent may be active in a viewport. `--sh-verified` is never used
for anything but verified Libya stock. Colour is never the only signal: every
state also carries a glyph, a label or a rule.

**Contrast.** All 19 audited pairs pass WCAG (text ≥ 4.5:1, non-text ≥ 3:1).
The values were solved numerically, not chosen by eye — `ink-35`, `maple` and
`verified` were darkened and `signal-on-dark` was added specifically to clear
their thresholds. Re-run the audit after any palette edit.

---

## 5. Typography

| Face                | Upstream      | Axes shipped                      | Size    |
| ------------------- | ------------- | --------------------------------- | ------- |
| `Shababuna Display` | Archivo (OFL) | `wght 600–900`, **`wdth 90–125`** | 36.1 KB |
| `Shababuna Text`    | Inter (OFL)   | `wght 400–800`                    | 22.3 KB |
| `Shababuna Arabic`  | Cairo (OFL)   | `wght 400–900`                    | 21.2 KB |

**79.5 KB total** against a 110 KB budget. Per-locale first paint is one face:
36.1 KB (EN) or 21.2 KB (AR).

**The width axis is the identity.** Wide (`118–125`) for hero authority,
condensed (`92`) for spec labels and tick captions. Never fake it with
`transform: scaleX`.

**`unicode-range` does the locale split.** Each stack lists the Arabic face
straight after the Latin one, so the browser resolves per character: an English
visitor never downloads Arabic, and a mixed string like «طقم لعب 2XL» renders
Arabic in the Arabic face and `2XL` in the Latin face with no `dir` switching.

**Arabic is a native cut, never translated Latin.**

|                     | Latin                            | Arabic               |
| ------------------- | -------------------------------- | -------------------- |
| Optical size        | 1.0×                             | ~0.88×               |
| Body size           | 1rem                             | 1.0625rem            |
| Display line-height | 0.92–1.1                         | **never below 1.28** |
| Tracking            | −0.03em … +0.18em                | **always 0**         |
| `text-transform`    | `uppercase` for display and spec | **always `none`**    |
| Hierarchy from      | size + weight + width            | size + weight only   |

**CLS.** Every real face has a metric-matched fallback (`ascent-override`,
`descent-override`, `line-gap-override`, `size-adjust`) measured from the
shipped files, so `font-display: swap` changes glyphs without moving the line
box.

---

## 6. Space, grid, surfaces

- 8 px base with a court-derived long scale: `4 8 12 16 24 32 48 64 96 128 160 224`.
- 12 columns, `--sh-container` 1240 px, gutter `clamp(16px, 4vw, 40px)`.
- Three named regions on every page: **Baseline** (full-bleed), **Key** (8 of 12,
  the dense commercial block), **Arc** (10 of 12 offset, the editorial band).
- Four surfaces: Ground, Plane, Inset, Chapter.
- **Depth is drawn, not blurred.** Two shadows only (`--sh-lift`, `--sh-plate`).
  No `backdrop-filter` in UI. Blur is permitted only in the film.
- Radius is 0–4 px. This system does not have rounded corners.

---

## 7. Motion

One easing family, four durations:

```
--sh-d-1 120ms  state      --sh-e-draw     cubic-bezier(.2,.7,.2,1)
--sh-d-2 220ms  control    --sh-e-release  cubic-bezier(.34,.9,.22,1)
--sh-d-3 420ms  element
--sh-d-4 760ms  chapter
```

**Motion draws.** Lines extend from an origin, plates register into position
with one decisive snap. Nothing floats, bounces, drifts or loops.

`--sh-e-release` is the single ballistic curve and is used **exactly three
times in the whole product**: add-to-cart, proof approval, order confirmation.

**Why it is pure CSS.** `scripts/lint-project.mjs` fails the build on inline
style mutation anywhere in `src/`, and the CSP sets `style-src-attr 'none'`.
JavaScript cannot drive visuals here — which is a gift: CSS scroll-driven
animations run off the main thread, cost zero library bytes and keep TBT inside
the 150 ms mobile budget the Lighthouse gate enforces.

**Progressive enhancement.** Every choreographed element is authored in its
**finished** state. Motion is layered on only inside
`@supports (animation-timeline: view())`. No polyfill, and no possibility of a
permanent flash of hidden content.

**Reduced motion is a designed tier, not a kill switch.**

| Tier               | Behaviour                                                                    |
| ------------------ | ---------------------------------------------------------------------------- |
| 1 — removed        | choreography, threshold draw, chapter reveals                                |
| 2 — kept at 120 ms | state feedback that carries meaning (instant appearance harms comprehension) |
| 3 — never exists   | parallax, auto-rotation, looping media, floating elements — in **any** mode  |

---

## 8. Capability tiers

`useDeviceCapability` resolves once and writes `data-capability="a|b|c"` on
`<html>`; CSS reads it. No JavaScript style mutation, so nothing here can
violate the CSP or the lint gate.

| Tier | Trigger                                                                          | Effect                                                |
| ---- | -------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `a`  | default                                                                          | full experience                                       |
| `b`  | `deviceMemory` 4–7                                                               | heavy media withheld                                  |
| `c`  | `saveData`, `deviceMemory < 4`, `hardwareConcurrency < 4`, `effectiveType` 2g/3g | motion and heavy media withheld; court drawing hidden |

---

## 9. RTL

- **Logical properties only.** `layout.css` contains zero physical
  `left`/`right` declarations, so RTL needs no override.
- A basketball court is bilaterally symmetric, so mirroring a GROUNDWORK layout
  produces a **correct court**, not a broken composition.
- Directional drawing (tick origin, rule extension, court plan) mirrors through
  a single `[dir='rtl']` rule each.
- The `[dir='rtl']` override count is a **tracked, decreasing metric** across
  phases.

---

## 10. Strings the release gate asserts

Do not rename or remove these during any refactor —
`scripts/validate-world-class.mjs` and `scripts/validate-final-hardening.mjs`
match them as literals.

| File                                                                       | Required literals                                                                                                                                                   |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/App.jsx`                                                              | `/shop`, `/customize`, `/teams-wholesale`, `/lha-store`, `/our-work`, `/operations`, `/design-share/:token`, `<main`                                                |
| `src/components/experience/CinematicHero.jsx`                              | `home_hero`, `mobileVideoUrl`, `useReducedMotion`, `saveData`                                                                                                       |
| `src/pages/CustomizePage.jsx`                                              | `CUSTOM_PRODUCT_TYPES`, `ProductionDesignEditor`, `parseRosterFile`, `rosterToCsv`, `saveCustomDesign`, `submitPublicQuote`, `productionPreflight`, `readyForQuote` |
| `src/components/custom/DesignPreview.jsx` and `ProductionDesignEditor.jsx` | all 12 `type.preview` tokens                                                                                                                                        |
| `src/components/account/OrganizationWorkspace.jsx`                         | `designs`, `rosters`, `quotes`, `production`                                                                                                                        |
| `src/pages/TeamsWholesalePage.jsx`                                         | `50%`, `30–60`, `submitPublicQuote`                                                                                                                                 |
| `src/pages/CheckoutPage.jsx`                                               | `pending_shipping_quote`, `half`, `full`, `shippingRates`, `customOrder: stagedOrder`                                                                               |
| `index.html`                                                               | `SHABABUNA`, `BUILT DIFFERENT`, `id="root"`, `viewport`, `theme-color`, the canonical, the OG PNG                                                                   |
| `src/config.js`                                                            | `name: 'Shababuna'`, `nameAr: 'شبابنا'`, `en: 'BUILT DIFFERENT.'`                                                                                                   |
| `src/config/shipping.js`                                                   | `amount: 20`, `amount: 500`, `minHours: 24, maxHours: 72`, `minDays: 14, maxDays: 18`, `minDays: 30, maxDays: 60`                                                   |

Also forbidden anywhere in `src/`: `TODO`, `FIXME`, `HERO VIDEO SLOT`,
`MEDIA SLOT`, `PRODUCT MEDIA PLACEHOLDER`, `console.*`, `debugger`,
`dangerouslySetInnerHTML`, `eval`, `document.write`, and **any inline style
mutation** — including inside a comment, which is how the pattern was first
tripped during Phase 1.

---

## 11. Verifying a change to this system

```bash
node scripts/validate-design-tokens.mjs   # contrast + isolation
node scripts/validate-static-integrity.mjs
node scripts/lint-project.mjs
npm run verify:source
npx vitest run --config vitest.config.mjs tests/ui
npm run analyze                           # entry CSS must not regress
```
