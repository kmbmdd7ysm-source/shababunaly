# Shababuna redesign — human review package

**Branch** `cursor/shababuna-redesign-master-plan-dc14`
**Commit** `eda9edec4e9b441931b067737ada52c26eae909d`
**Base** `main` at `508c07c` — **unmodified. Nothing merged. Nothing deployed.**

---

## 1. Preview URL

> ### https://employment-cia-assets-freebsd.trycloudflare.com

A Cloudflare quick tunnel onto the production build running in the review VM.

**It is ephemeral.** It dies when this VM stops or the tunnel process exits. If it
does not respond, use the local instructions in §3 — they always work.

Served from `dist/`, built with the full `npm run build` including the
`postbuild` prerender (95 static HTML pages + `sitemap.xml`).

- Build provenance: **418 files**, dist SHA-256
  `e5498c88ed51bf27d04a06dd9997d12b9e20b473468843410659530189500499`
- `/api/*` returns a stubbed 404 — no backend is reachable, so auth-gated routes
  render their genuine signed-out state rather than an error.

## 2. Branch and commit

|                         |                                                      |
| ----------------------- | ---------------------------------------------------- |
| Branch                  | `cursor/shababuna-redesign-master-plan-dc14`         |
| Commit                  | `eda9edec4e9b441931b067737ada52c26eae909d`           |
| Short                   | `eda9ede`                                            |
| Commits ahead of `main` | 58                                                   |
| `main`                  | `508c07c` — untouched, never checked out for writing |

## 3. Opening the preview locally

```bash
git fetch origin cursor/shababuna-redesign-master-plan-dc14
git checkout cursor/shababuna-redesign-master-plan-dc14
npm install
npm run build          # includes the postbuild prerender
node scripts/review-server.mjs
# → http://localhost:4173/
```

`scripts/review-server.mjs` is committed. It serves `dist/` with correct SPA
fallback for deep links, prefers the prerendered per-route HTML, and stubs
`/api/*`. Override with `REVIEW_PORT` / `REVIEW_DIST`.

`npm run preview` (Vite) also works but has no `/api` stub and no prerender
preference, so deep links and empty states look less representative.

## 4. Route-by-route review index

Every route below returns 200 and was swept in EN + AR at 390 px and 1440 px.

**Public / storytelling** — `/` · `/about` · `/our-work` · `/lha-store`
**Catalogue** — `/shop` · `/shop/clothing` · `/shop/footwear` · `/shop/accessories` ·
`/shop/basketballs` · `/shop/equipment` · `/shop/footwear/in-court` ·
`/shop/ready-to-ship` · `/search` · `/compare` · `/favorites`
**Product** — `/products/lha-premium-fleece-set` (Level C, 4 angles) ·
`/products/all-i-know-is-win-tee` (Level C, 2 colours) ·
`/products/shababuna-pro-game-set` (Level D, illustration)
**Customize** — `/customize` · `/design-share/:token`
**Team / B2B** — `/teams-wholesale` · `/team-locker/:slug` · `/special-request`
**Content / legal** — `/contact` · `/faq` · `/help` · `/size-guide` ·
`/shipping-returns` · `/refund-policy` · `/privacy-policy` · `/terms` · `/cookies`
**Transactional** — `/cart` · `/checkout` · `/checkout/success` ·
`/checkout/cancelled` · `/order-tracking` · `/order-tracking/:orderNumber`
**Customer** — `/account` · `/orders`
**Operations** — `/operations` · `/operations/{dashboard,orders,payments,b2b,shipping,catalog,inventory,media,security,users,settings}`
**States** — `/offline` · `/nonexistent` (404) · `/lab/home` (Phase 1 prototype, `noindex`)

Machine-readable status for all 41 router entries:
`ROUTE_STRUCTURAL_REBUILD_MATRIX.json` / `.md` —
**29/29 page components and 36/36 real routes structurally rebuilt**; the other
5 entries are `<Navigate>` redirects with no page.

## 5. Test accounts and role fixtures

**There are none, and none can be created here — this is the honest position.**

No Supabase instance is reachable from the review VM, so no session can be
established. `/account`, `/orders` and `/operations/*` therefore render their
real signed-out state and redirect to the sign-in gate. That is correct
behaviour, not a fault.

**No credentials are included in this package, and none exist in the repository.**

Staff roles are read from `user.app_metadata.role` and must be one of
`super_admin` · `admin` · `operations` · `sales` (`src/services/operations.js`).
This is a server-side claim; it cannot be set from the browser, which is exactly
why the authenticated views cannot be simulated client-side.

To review the authenticated surfaces, run the local Supabase stack:

```bash
npx supabase start
npx supabase db reset          # applies migrations + supabase/tests
# create users in the local Studio (http://localhost:54323), then set the claim:
#   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"operations"}'
#   where email = '<your local test user>';
cp .env.example .env.local     # point at the local stack
npm run build && node scripts/review-server.mjs
```

Use throwaway local addresses only. Do not point this at production.

**Reviewable without any backend:** every public route, the full catalogue and
product pages, Customize (complete), cart, checkout up to payment, the sign-in
gate, order-tracking lookup, all content and legal routes, 404 and offline.

## 6–9. Desktop / mobile · English / Arabic RTL

Final sweep on the review build — **45 routes × 2 locales × 2 viewports**:

> **180 checks · 180 clean · 0 axe violations · 0 horizontal overflow · one `h1` per route · no page errors**

| Dimension                      | Result                                                       |
| ------------------------------ | ------------------------------------------------------------ |
| Desktop English (1440)         | pass                                                         |
| Mobile English (390)           | pass                                                         |
| Desktop Arabic RTL (1440)      | pass                                                         |
| Mobile Arabic RTL (390)        | pass                                                         |
| Tablet (834)                   | pass — covered in the 198-check sweep at the previous commit |
| Zoom 200% / 400%, both locales | **0 px overflow**                                            |
| Reduced motion, both locales   | **0 running animations**                                     |
| Keyboard                       | focusable counts recorded per route; all controls native     |
| Failed assets / HTTP ≥400      | **none** across 108 page loads                               |
| Runtime page errors            | **none**                                                     |

Arabic is not a mirrored afterthought: across ~6,000 lines of new CSS there are
only four `[dir='rtl']` rules — everything else mirrors through logical
properties. Prices, order references and SKUs are bidi-isolated.

## 10. Screenshots

| Set                                           | Path                                    | Count |
| --------------------------------------------- | --------------------------------------- | ----: |
| **Review index** (27 routes × 4 combinations) | `/opt/cursor/artifacts/assets/review/`  |   124 |
| Before (pre-rebuild baseline)                 | `/opt/cursor/artifacts/assets/before/`  |    11 |
| Per-surface rebuild evidence                  | `/opt/cursor/artifacts/assets/rebuild/` |   143 |
| Earlier full-site set                         | `/opt/cursor/artifacts/assets/final2/`  |    36 |

Naming: `<route>-<lang>-<device>.png`, e.g. `checkout-ar-mobile.png`.

**Honest limitation on before/after:** the "before" set covers 11 routes captured
when the rebuild began. Routes rebuilt in later groups have _after_ shots only —
for those, the true before is `git show 508c07c:<file>`.

## 11. Placeholders still visible

Everything below is **labelled in the interface** — nothing is passed off as final.

| Where                                                          | What                                                                                                          |        Count |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -----------: |
| Homepage departments, `/shop` grid, product pages, `/our-work` | Purpose-built catalogue concept artwork (`/images/catalog/*.svg`)                                             |  44 products |
| Product pages on those items                                   | Tier note reading _"Illustration — product photography pending"_                                              |           44 |
| `/about`                                                       | Reserved slot: _"Brand film · reserved — No final footage exists yet."_                                       |            1 |
| `/our-work`                                                    | Reserved slot: _"Project showcase · reserved — No project photography has been cleared for publication yet."_ |            1 |
| `/customize`                                                   | Accuracy badge: **Concept preview** — _"Vector approximation, not a production proof."_                       | all 12 types |
| Homepage hero                                                  | Poster composition; **no hero film exists**, and none is requested unless a source is configured              |            1 |

## 12. Product viewing levels — all 69

| Level | Meaning                           |  Count |
| ----- | --------------------------------- | -----: |
| **A** | Verified real-time 3D             |  **0** |
| **B** | Verified photographic 360 spinset |  **0** |
| **C** | Verified premium multi-angle      | **23** |
| **D** | Asset-blocked                     | **46** |

Level D splits: **2** products with exactly one real photograph, **44** with
purpose-built concept art and no photography at all.

Per-product detail (ID, name, asset count, current tier, target tier, missing
assets, photography and modelling requirements, complexity, phase):
`docs/PRODUCT_VIEWER_MATRIX.md` and `reports/product-viewer/matrix.json`.

> **Correction made during this review.** The counts were previously reported as
> C 1 / D 68. `verifiedImages()` was ignoring `colors[].image`, so a product page
> rendering two photographs was labelled _"One verified photograph"_. Fixed in
> both the runtime resolver and the offline audit with an identical rule, plus a
> regression test. **No product moved up on invented evidence** — those 22
> products always had two or more real photographs; the audit was not looking at
> them.

## 13. Customize Studio demonstration

Screenshots `studio-01` … `studio-07-*` in `/opt/cursor/artifacts/assets/review/`.

Live-verified control sequence:

| Action                       | Result                                                             |
| ---------------------------- | ------------------------------------------------------------------ |
| Default                      | `view=front lighting=production overlay=off` · **Concept preview** |
| Camera → Back                | `view=back`                                                        |
| Lighting → Arena             | `lighting=arena`                                                   |
| Print zones → on             | `overlay=on`                                                       |
| Keyboard `→` on the artboard | `view=left`                                                        |
| Keyboard `+`                 | zoom `120%`                                                        |

**Non-3D fallback — this is the whole point.** There is no WebGL and no 3D model
in this repository. The Studio renders a vector artboard and says so. Every
capability is a DOM control: **9 camera/lighting buttons**, a real range slider
for zoom, and an `aria-live` region describing view, azimuth, zoom and lighting.
Under `prefers-reduced-motion` the stage reports `data-reduced="on"` with
**0 running animations**. Mobile EN, mobile AR and desktop AR all measure
**0 px overflow**.

The accuracy badge reads **Concept preview** and cannot be upgraded by the
interface — it is computed from `runProductionPreflight`, and a `factory_approved`
status without `readyForManufacturing` still reads Concept. Four unit tests pin
that.

## 14. Product viewer demonstration

| Product                  | Tier  | Angles | Interface text                               |
| ------------------------ | :---: | -----: | -------------------------------------------- |
| `lha-premium-fleece-set` | **C** |      4 | "4 photographed angles — not a 360° model"   |
| `all-i-know-is-win-tee`  | **C** |      2 | "2 photographed angles — not a 360° model"   |
| `shababuna-pro-game-set` | **D** |      0 | "Illustration — product photography pending" |

Angle selection verified (`aria-selected="true"` after activating angle 2).
Screenshots `viewer-*.png`.

**Levels A and B cannot be demonstrated on a real product, because no 3D model
and no turntable sequence exists.** Their code paths are covered by unit tests:
a sequence shorter than 24 frames resolves to _no_ spin rather than a padded one,
and a model reference outside same-origin `/models/` is not trusted. Fabricating
either to produce a demo is exactly what the brief forbids.

## 15. Build and test results

| Gate                                         | Result                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm run build`                              | **pass** — 95 prerendered pages, 418 files                                     |
| `verify:source` (18 validators + core smoke) | **pass**                                                                       |
| `validate:design-tokens`                     | pass — 92 contrast pairs × 2 palettes                                          |
| `validate:seo`                               | pass — includes the duplicate-tag gate                                         |
| `lint-project`                               | pass                                                                           |
| `typecheck`                                  | **75 errors — identical to the `main` baseline**, 0 in any redesign file       |
| `test:node`                                  | 321/322 — 1 pre-existing failure on `main`                                     |
| `test:ui`                                    | 62/63 — 1 pre-existing `Breadcrumbs` failure; **+33 new tests**                |
| `lint:eslint`                                | **fails** — pre-existing `yocto-queue` CJS/ESM shim, documented in `AGENTS.md` |
| axe WCAG 2.2 AA                              | **0 violations**, 180 checks                                                   |
| LCP / CLS (median of 3)                      | 72–196 ms / 0.0029–0.0356                                                      |
| Dependencies                                 | **0 added, 0 removed**                                                         |

## 16. Blocked external gates

**Marked BLOCKED, not passed.** None was skipped silently.

| Gate                                                                           | Missing                                  |
| ------------------------------------------------------------------------------ | ---------------------------------------- |
| Database migrations · `db reset` · pgTAP · RLS matrix · race tests             | a Supabase instance                      |
| Payment sandbox E2E                                                            | provider credentials                     |
| Browser E2E (auth, checkout, returns, B2B, Team Locker, Customize, Operations) | the local Supabase stack                 |
| CodeQL · OSV · SBOM · dependency audit                                         | GitHub Actions                           |
| Lighthouse / PageSpeed                                                         | superseded by direct LCP/CLS measurement |
| Authenticated Account and Operations **visual** review                         | a Supabase session with a staff claim    |

## 17. Still required

**Media** (`docs/HERO_MEDIA_MANIFEST.md`) — hero master film 16:9 ≤3.2 MB and
9:16 ≤1.4 MB with poster frames; aerial footage (**Tripoli drone permits**);
athlete footage (**signed releases**); a 100 mm macro package; **photography for
44 products**; additional angles for 2 more; turntable capture (24–36 frames) to
unlock Level B; 3D models, textures and HDR environments for Level A. Our Work
footage is **blocked on client approval**.

**Factory** (`docs/CUSTOMIZE_STUDIO_CONTRACT.md`) — CAD patterns, graded size
patterns, panel geometry, cut and stitch lines, seam allowances, bleed and safe
areas, sublimation maps, fabric stretch and shrinkage, ICC profiles, Pantone
references, manufacturer approval and manufacturing test results. Until these
exist **every custom product remains a concept preview**.

**Credentials** — Supabase project, payment provider sandbox, GitHub Actions.

**Human approvals** — a named visual-baseline reviewer (outstanding since Phase
1); a **qualified Arabic reviewer** (mechanical RTL correctness is verified,
linguistic quality is not and is not claimed); client sign-off for Our Work.

## 18. Rollback

The whole redesign reverts with no schema, data, config or dependency migration:

```bash
git revert 6bde59a..eda9ede      # or simply: git checkout main
```

Per surface, one line each:

| Surface                 | Revert                                                              |
| ----------------------- | ------------------------------------------------------------------- |
| Site-wide typography    | delete the two `--font-body`/`--font-display` lines in `tokens.css` |
| Global shell            | delete the `masthead.css` / `colophon.css` imports                  |
| Any single route        | `git checkout 508c07c -- src/pages/<Page>.jsx`                      |
| Arabic CLS fix          | revert `47f2a65` (restores 0.517)                                   |
| Product-tier correction | revert `df4afff`                                                    |

---

## Verdict

**Ready for human visual review: YES.**

**Production Verified: NO** — and it must not be described that way. Six gate
groups cannot run here and are recorded as blocked; final media, photography, 3D
models and factory data do not exist, so no product exceeds Level C and no custom
product may be called factory-accurate.

## Next human actions

1. Open the preview and walk the §4 index.
2. Name the visual-baseline reviewer.
3. **Commission photography — 44 products have none.** This is the single largest
   blocker to the product experience.
4. Start Tripoli drone permits and athlete releases (long lead times).
5. Request factory CAD data from the manufacturer.
6. Engage a qualified Arabic reviewer.
7. Run the blocked gates in CI with Supabase and provider credentials.
