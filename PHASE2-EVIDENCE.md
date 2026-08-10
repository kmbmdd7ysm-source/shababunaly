# Phase 2 — evidence

Branch `cursor/shababuna-redesign-master-plan-dc14`. `main` untouched, nothing merged,
nothing deployed, Phase 3 not started.

Everything below is a measurement taken against a production build in a real
browser, not an assertion.

---

## 1. Baseline, recorded before any Phase 2 file was modified

| Check           | Baseline                                     | After Phase 2                           |
| --------------- | -------------------------------------------- | --------------------------------------- |
| `test:node`     | 321/322 (1 pre-existing failure)             | 321/322 — unchanged                     |
| `test:ui`       | 14/15 (1 pre-existing `Breadcrumbs` failure) | 24/25 — same 1 failure, +10 new passing |
| `typecheck`     | 73 errors                                    | 73 — identical                          |
| `lint` (eslint) | fails: `yocto-queue` CJS/ESM shim            | unchanged, not touched                  |
| `lint-project`  | pass                                         | pass                                    |
| `verify:source` | pass                                         | pass                                    |
| `build`         | pass                                         | pass                                    |

Phase 1 had quietly raised typecheck from 73 to 78. Those five were fixed first
(commit `6bde59a`) so Phase 2 started from a true baseline. Seven more crept in
during Phase 2 and were fixed before the final commit. **No file created or
modified in Phases 1 or 2 contributes a typecheck error.**

## 2. Arabic CLS — root cause and result

Reported at 0.517. Reproducible to five decimal places across every run.

### Root cause: two independent faults, both required

**1. RTL did not engage until after first paint.** The existing cascade carries

```css
body[dir='rtl'] {
  direction: ltr !important;
} /* cancels html[dir=rtl]      */
#root[dir='rtl'] {
  direction: rtl;
} /* re-establishes it one level down */
```

`#root` only receives that attribute from `LanguageContext`'s `useEffect`, which
runs _after_ the browser has painted. The document painted the entire header
left-to-right and mirrored it a frame later.

This is why the obvious fix failed. Setting `dir` on `<html>` alone — even
hard-coded into the served HTML — measured **no improvement at all** (still
0.51671), because the `body` rule cancels it.

**2. The closed off-canvas menu was visible.** `.mobile-menu` was hidden only by
`transform: translateX(-105%)`, so it still participated in paint. When
direction resolved, 380×1000 px of content moved across the viewport.

### Evidence trail

| Experiment                                           | Result                                     |
| ---------------------------------------------------- | ------------------------------------------ |
| As-is                                                | 0.51671                                    |
| `dir=rtl` injected at document-start                 | 0.51671 — no change                        |
| `dir="rtl"` hard-coded in the served HTML            | 0.51671 — no change                        |
| `.mobile-menu:not(.open) { transition: none }`       | 0.51671 — the transition was not the cause |
| `.mobile-menu` closed → `visibility: hidden`         | **0.03509**                                |
| …plus `dir` on html **and body and #root** pre-paint | **0.00000**                                |

Frame-by-frame tracing showed the panel at x=483 (on screen) at t=201 ms and
x=1463 (off screen) at t=243 ms, the difference being `body` gaining its
attribute.

### Files changed

- `src/main.jsx` — applies `lang`/`dir` to `html`, `body` **and** `#root`
  synchronously before `createRoot().render()`. One `localStorage` read.
  `LanguageProvider` still owns every later change.
- `src/styles/global.css` — the closed `.mobile-menu` is `visibility: hidden`,
  delayed by the transform duration so the close animation still plays.

### Measured, median of 3 runs, production font delivery

| Route                      |      Before |       After |
| -------------------------- | ----------: | ----------: |
| `/` en 1440                |     0.00000 |     0.00318 |
| `/` **ar 1440**            | **0.51671** | **0.01589** |
| `/` en 390                 |     0.00000 |     0.01824 |
| `/` ar 390                 |     0.01394 |     0.00410 |
| `/shop` ar 1440            |     0.15371 |     0.00132 |
| `/teams-wholesale` ar 1440 |     0.15371 |     0.00096 |
| `/customize` ar 390        |           — |     0.00484 |
| `/checkout` en 1440        |           — |     0.00169 |

Every route passes the 0.05 gate. The small English increases are the new hero
and are inside budget. With fonts artificially delayed by 1.2 s the worst case
across all routes is 0.019.

**Second defect fixed by the same change:** `visibility: hidden` removes the
closed menu's links from the tab order, which `aria-hidden` alone was not
doing. `aria-hidden-focus` disappeared from every route.

## 3. Accessibility — 41 violations to 5

axe, WCAG 2.2 AA, 6 routes × 2 viewports × 2 locales, after scrolling the full
page.

|                  |    Before | After |
| ---------------- | --------: | ----: |
| Total violations |    **41** | **5** |
| `/` homepage     | violating | **0** |
| `/shop`          | 150 nodes | **0** |
| `/products/…`    | violating | **0** |
| `/checkout`      | violating | **0** |

Fixed: `aria-hidden-focus` everywhere · header icon buttons squeezed to 14×44
against a 24×24 minimum · 63 filter checkboxes at the 16×16 UA default ·
product-card brand text at 3.6:1 · status pill at 2.03:1 on the dark card
overlay · design-preview disclaimer at 2.35:1.

**Remaining 5 are pre-existing and unchanged from baseline:** `#999999` and
`#777777` body copy on `/teams-wholesale`, and one node on `/customize`. They
belong to those pages, not to the shell, and are scheduled with their phases.

Also verified: zero horizontal overflow at 200% and 400% zoom in Arabic;
30/30 routes render with content, no page errors, no overflow.

## 4. Regressions this work caused, found by measurement and fixed

Recorded because they show the checks were real.

1. **Global `overflow-wrap: break-word`** broke the Arabic language-switcher
   label into one letter per line on English pages. Arabic is a connected
   script. Wrapping is now applied to the system's own prose classes only.
2. **Lawful 44 px targets** made the actions cluster ~200 px wider, so the cart
   button landed exactly on top of the compare link. The header now spans the
   viewport instead of the 1240 px content container and the nav scales between
   1000 and 1440 px. Verified at 1000/1100/1280/1440/1680/1920: no overlap, no
   clipping.
3. **Re-grounding `.section--dark`** left five nodes of `#050505` on a near-black
   ground at 1.03:1. The override was removed and the reason recorded in the
   stylesheet.
4. **CSS emission sequence.** `main.jsx` imported `App` above its own stylesheet
   imports, so every page sheet was emitted _before_ the foundation and lost
   every specificity tie: five departments rendered as four plus an orphan, and
   names rendered at 41.6 px in a 167 px measure. Fixed at the source by
   importing `App` last, not by escalating specificity in every page sheet.

## 5. Bundle

|                  |            Before |     After |            Δ |
| ---------------- | ----------------: | --------: | -----------: |
| Entry CSS (gzip) |          39.28 KB |  43.20 KB | **+3.92 KB** |
| CSS total        |          42.65 KB |  44.05 KB |     +1.40 KB |
| JS total         |         370.40 KB | 371.09 KB | **+0.69 KB** |
| Fonts            | 79.6 KB (3 files) | unchanged |            0 |

**No dependency was added.** The entry CSS growth is the foundation moving from
the prototype route into the shell, which is the point of the phase. JS is flat
because the transformation is CSS and markup, not runtime.

## 6. Product-viewing tiers — all 69 products

| Tier | Meaning                                  |  Count |
| ---- | ---------------------------------------- | -----: |
| A    | Real-time 3D, verified optimised model   |  **0** |
| B    | True 360 spinset, ≥ 24 real frames       |  **0** |
| C    | Premium multi-angle, ≥ 2 verified images |  **1** |
| D    | Asset-blocked                            | **68** |

Level D splits into two very different problems: **24** products have exactly
one real photograph and need only more angles; **44** have no photography at all
and are showing purpose-built concept artwork.

Target once assets land: 34 Level A, 35 Level B. Full per-product table in
`docs/PRODUCT_VIEWER_MATRIX.md`; machine-readable in
`reports/product-viewer/matrix.json`; regenerated by `verify:source` so it
cannot go stale.

Honesty is enforced in code, not by convention: placeholder art never counts as
an asset, a sequence under 24 frames resolves to _no_ spin rather than a padded
one, frames are never duplicated, and a model reference outside same-origin
`/models/` is not trusted.

## 7. Hero and 3D

The media architecture is built and shipping; **the assets do not exist**. With
no source configured the hero is a deliberate poster composition with the FIBA
half-court plan drawn over it in inline SVG.

Verified in-browser: **zero video requests** under reduced motion and under
normal conditions, with the poster always painted. The film additionally
requires Tier A capability, no `saveData`, and real user intent before it is
ever requested.

**No WebGL was promoted to the homepage.** Phase 1 produced no 3D hero to
promote — the approved direction deliberately draws the court in SVG, which
costs 0 KB of JavaScript, cannot lose a WebGL context, needs no fallback, and
never competes with LCP. Promoting a three.js scene onto the highest-traffic
route to satisfy a checkbox would have been the wrong trade. The capability
gate, disposal and fallback architecture is specified in
`docs/CUSTOMIZE_STUDIO_CONTRACT.md` for the Studio phase, where 3D earns its
weight.

## 8. Preserved — verified, not assumed

Exactly one `h1` per page, zero horizontal overflow, and every commercial
destination still present in both locales at desktop and mobile: `/shop`, all
five departments, `/shop/ready-to-ship`, `/customize`, `/teams-wholesale`,
`/shop/footwear`, `/shop?brand=Shababuna`, `/lha-store`.

Untouched: every file under `supabase/`, `api/`, `src/services/` payment,
auth and Operations logic; product data, IDs, prices, variants and inventory;
cart and checkout logic; the Libya `Ready to Ship` condition; `ProductCard`;
`useCatalog`; and all existing Customize business logic.

Every figure printed on the new homepage is read from `config/shipping.js`,
`data/customization.js` and `config.js`. Nothing is invented.

## 9. Rollback

Whole phase: `git revert 6bde59a..HEAD` — no schema, no data, no config
migration is involved.

Individually:

- Site-wide typography → delete the two `--font-body`/`--font-display` lines in
  `tokens.css`.
- Shell appearance → delete the `shell.css` import in `main.jsx`.
- Homepage → `git checkout <baseline> -- src/pages/HomePage.jsx src/components/experience/CinematicHero.jsx`.
- Arabic CLS fix → revert `47f2a65`, which restores the 0.517.

## 10. Known limitations

- No hero video, no product photography for 44 products, no 3D models, no
  approved factory profile. All specified in
  `docs/HERO_MEDIA_MANIFEST.md`, `docs/PRODUCT_VIEWER_MATRIX.md` and
  `docs/CUSTOMIZE_STUDIO_CONTRACT.md`.
- 5 pre-existing axe violations remain on `/teams-wholesale` and `/customize`.
- `npm run lint` (eslint) still fails on the pre-existing `yocto-queue` shim.
- One pre-existing `Breadcrumbs` UI test failure and one pre-existing node test
  failure, both present on `main`.
- Only the shell and the homepage are migrated. Interior pages inherit the new
  typography, ground and chrome but keep their own layouts until their phases.
