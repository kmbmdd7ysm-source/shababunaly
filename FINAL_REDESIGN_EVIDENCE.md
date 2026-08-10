# Shababuna redesign — final evidence

**Branch** `cursor/shababuna-redesign-master-plan-dc14`
**Source SHA** `c7ecbe68db5f11c7496b5d67ecc0aa86f1f59a8c` (+ the Phase 9 commit)
**Base** `main` at `508c07c6d30ab51ba19d4a2ad1fad2848bec9f87` — **unmodified**

`main` was never checked out for writing, never merged into, never pushed to.
Nothing was deployed. No production service, database or credential was touched.

---

## Is this ready for human review?

**Yes.** Every phase has measured evidence, every gate that can run locally is at
or better than its baseline, and no business, payment, auth or security file was
opened.

## Is it Production Verified?

**No — and it must not be described as such.** Production Verification requires
gates that cannot run in this environment:

- database migrations, pgTAP, RLS matrix, race tests — need a Supabase instance
- payment sandbox E2E — needs provider credentials
- browser E2E suite — needs the local Supabase stack
- CodeQL, OSV, SBOM — CI-only

These are recorded as **BLOCKED**, not passed.

---

## Phases and commits

| Phase                   | Commits                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| 1 — foundation          | `c9678a8` `2ff428b` `2b4599b` `9a82fcd` `0ac34cc` `debd357` `f2672a0` `4388428` `a4b090e` |
| 2 — shell + homepage    | `6bde59a` `47f2a65` `c1b5968` `a4eff81` `3435683` `bd1212d` `26a8373` `4e3f51d` `666d16e` |
| 3 — catalog             | `fe3e0f1`                                                                                 |
| 4 — Customize Studio    | `6d1190a`                                                                                 |
| 5 — team / B2B          | `24f00c6`                                                                                 |
| 6 — public routes + SEO | `7cd73bf`                                                                                 |
| 7 — transactional       | `84f68e8`                                                                                 |
| 8 — Operations          | `c7ecbe6`                                                                                 |
| 9 — final audit         | this commit                                                                               |

**51 files created · 20 modified · 0 dependencies added · 0 removed.**

---

## Headline results

|                                              |             Before |                   After |
| -------------------------------------------- | -----------------: | ----------------------: |
| axe WCAG 2.2 AA violations                   | 41 (over 6 routes) | **0** (over 228 checks) |
| Arabic homepage CLS                          |          **0.517** |               **0.016** |
| `/shop` Arabic CLS                           |              0.154 |                   0.001 |
| Horizontal overflow, any route/viewport/zoom |                  — |                **0 px** |
| Routes rendering with content                |                  — |             **38 / 38** |
| Entry CSS                                    |           39.28 KB |        47.86 KB (+8.58) |
| Entry JS                                     |          178.02 KB |       181.28 KB (+3.27) |
| Dependencies                                 |                  — |           **unchanged** |

---

## What actually changed, by surface

**Global** — the whole site renders in self-hosted Archivo, Inter and Cairo
instead of the system stack, achieved by re-pointing two existing tokens rather
than editing components. The page ground is chalk; the chrome is a bridge layer.

**Homepage** — a directed opening sequence: a poster ground with a FIBA
half-court plan drawn over it in inline SVG, the film dissolving in behind the
drawing only after real user intent on a capable device. Then the measure, five
departments as five zones of the court, Ready to Ship, the workshop, the roster
as a dark chapter, footwear, Shababuna-Built on maple, and the LHA band.

**Catalog** — product cards as specimens on drawn plates with a measurement tick
on the leading edge; department rails whose active mark draws from the leading
edge so it reads correctly in Arabic; and `ViewingTierNote`, which states in
words what each product's imagery actually is.

**Customize** — a design laboratory: artboard on a cutting-mat ground, five
garment-relative camera presets, three named lighting modes, zoom, print-zone
and safe-area overlays at the declared 12 mm/5 mm, and an accuracy badge read
from the real preflight result.

**Team / B2B** — professional rather than cinematic: drawn plates, a dark
commercial spine, forms as commercial instruments.

**Content routes** — editorial: capped measure, specification tables, a drawn
timeline spine.

**Transactional** — the most restrained expression in the system. Tabular
figures, a 2px rule above the total, an error summary with no motion at all.

**Operations** — denser than the storefront, sticky dark table headers, status
by glyph as well as colour, and `animation: none` throughout.

---

## Six real defects found and fixed

These were pre-existing on `main`, not introduced by the redesign:

1. **Arabic CLS 0.517.** `body[dir='rtl']{direction:ltr!important}` with RTL
   re-established at `#root`, which only gets its attribute after first paint —
   plus a closed off-canvas menu that was still `visible`. Setting `dir` on
   `<html>` alone was **proven not to fix it**, twice.
2. **Every page shipped two canonicals, two descriptions and two robots
   directives**, because the shell's static SEO tags lacked `data-rh`. The
   duplicate `index, follow` **silently defeated `noindex`** on `/cart`,
   `/account`, `/compare` and `/order-tracking`.
3. **The closed mobile menu was in the tab order** despite `aria-hidden`.
4. **Header icon buttons were squeezed to 14×44 px** against a 24 px minimum.
5. **63 filter checkboxes on `/shop` rendered at the 16×16 UA default.**
6. **`.section p { color:#4d4d4d }` was overriding the design-preview
   disclaimer** to 2.35:1 — the one line telling a customer their design is not
   a production proof.

Three **undefined CSS tokens** were also caught — `--sh-alarm`, `--sh-e-arc`,
`--sh-target-lg` — by a gate written mid-project after the first one silently
dropped a colour. `--sh-e-arc` had been invalidating the Studio's camera
transition entirely.

---

## New quality gates, all wired into `verify:source`

- `validate:design-tokens` — 92 contrast pairs × 2 palettes, `gw-*` selector
  isolation, tokens-only colour, logical-properties-only layout, and undefined
  token references
- `generate:product-viewer-matrix` — regenerates the 69-product audit so it
  cannot go stale
- duplicate-SEO-tag gate in `validate:seo` — **proved to bite**
- `scripts/review-routes.mjs` — reusable render/error/overflow/axe/keyboard/
  screenshot harness

---

## What is missing, precisely

**Media** (`docs/HERO_MEDIA_MANIFEST.md`) — hero master film 16:9 ≤3.2 MB and
9:16 ≤1.4 MB, poster frames, aerial footage (**requires Tripoli permits**),
athlete footage (**requires signed releases**), macro package, product
photography for 44 products, additional angles for 24 more, turntable capture,
3D models, HDR environments. Our Work footage is **blocked on client approval**.

**Factory** (`docs/CUSTOMIZE_STUDIO_CONTRACT.md`) — CAD patterns, graded sizes,
panel geometry, cut and stitch lines, seam allowances, sublimation maps, fabric
stretch and shrinkage, ICC profiles, Pantone references, factory approvals,
manufacturing test results. Until these exist **every custom product is a
concept preview**, and the interface says so.

**Providers** — Supabase instance, payment sandbox credentials, GitHub Actions.

**Human** — a qualified Arabic reviewer. Mechanical RTL correctness is verified;
linguistic quality is not, and is not claimed.

---

## Rollback

Whole redesign: `git revert 6bde59a..HEAD`. No schema, data, config or
dependency migration is involved.

Per surface, each one line:

| Surface              | Revert                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------- |
| Site-wide typography | delete two `--font-body`/`--font-display` lines in `tokens.css`                              |
| Shell                | delete the `shell.css` import in `main.jsx`                                                  |
| Catalog              | delete the `catalog.css` import                                                              |
| Team / B2B           | delete the `workspace.css` import                                                            |
| Content              | delete the `content.css` import                                                              |
| Transactional        | delete the `transact.css` import                                                             |
| Operations           | delete the `operations.css` import                                                           |
| Homepage             | `git checkout 508c07c -- src/pages/HomePage.jsx src/components/experience/CinematicHero.jsx` |
| Studio               | restore the `DesignPreview` import in `CustomizePage.jsx`                                    |
| Arabic CLS fix       | revert `47f2a65` (restores 0.517)                                                            |

---

## Exact next human actions

1. **Review the branch.** Start with `PHASE2-EVIDENCE.md` (the CLS
   investigation) and this file.
2. **Name a visual-baseline reviewer** — `docs/ASSET_REQUIREMENTS.md` §1 has
   blocked on this since Phase 1.
3. **Commission the photography** — 44 products have none. This is the single
   biggest blocker to the product experience.
4. **Decide the media budget** against `docs/HERO_MEDIA_MANIFEST.md`, and start
   the Tripoli drone permits and athlete releases, which have lead times.
5. **Request factory data** from the manufacturer per
   `docs/CUSTOMIZE_STUDIO_CONTRACT.md` §"Factory contract".
6. **Engage an Arabic reviewer.**
7. **Run the blocked gates in CI** with Supabase and provider credentials.
8. **Then, and only then**, consider Production Verification.
