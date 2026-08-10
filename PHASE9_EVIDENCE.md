# Phase 9 — Final audit, accessibility, performance and release evidence

Branch `cursor/shababuna-redesign-master-plan-dc14`.

## 1. Complete route sweep — the headline number

Every route, both locales, three viewports, with axe against WCAG 2.2 AA, after
scrolling each page fully:

> **228 checks · 228 clean · 0 axe violations · 0 horizontal overflow · exactly
> one `h1` per route · no page errors**

38 routes × 2 locales × 3 viewports (390×844, 834×1112, 1440×1000):

`/` `/shop` `/shop/clothing` `/shop/footwear` `/shop/accessories`
`/shop/basketballs` `/shop/equipment` `/shop/footwear/in-court`
`/products/all-i-know-is-win-tee` `/products/shababuna-pro-game-set` `/search`
`/compare` `/favorites` `/customize` `/special-request` `/teams-wholesale`
`/our-work` `/lha-store` `/team-locker/demo` `/about` `/contact` `/faq` `/help`
`/size-guide` `/order-tracking` `/shipping-returns` `/refund-policy`
`/privacy-policy` `/terms` `/cookies` `/cart` `/checkout` `/account` `/orders`
`/operations` `/offline` `/lab/home` and the 404.

For scale: the same scan over just six routes measured **41 violations** before
this work began.

## 2. Accessibility

| Check                                     | Result                                                            |
| ----------------------------------------- | ----------------------------------------------------------------- |
| axe WCAG 2.2 AA, 228 checks               | **0 violations**                                                  |
| Horizontal overflow, all routes/viewports | **0 px**                                                          |
| Zoom 200%, EN and AR, 10 routes           | **0 px overflow**                                                 |
| Zoom 400%, EN and AR, 10 routes           | **0 px overflow**                                                 |
| Reduced motion, EN and AR, 4 routes       | **0 running animations**                                          |
| Touch targets                             | 44 px header/controls, 24 px minimum form controls                |
| Focus                                     | dual-ring token, on-dark variant for every dark chapter           |
| Keyboard                                  | focusable counts recorded per route; all controls native elements |

Colour is never the only carrier: the viewing-tier mark, the Studio accuracy
badge, status badges, Operations pass/fail glyphs and the active-nav rule all
differ in **shape or wording** as well as hue.

No essential content lives only in video, animation, canvas, WebGL or hover. The
hero's message, its three calls to action and its location are DOM text; the
quick-add control is pinned visible under `(hover: none)` and reduced motion.

## 3. Performance — measured, median of 3, production build

| Case               |    LCP |     CLS |
| ------------------ | -----: | ------: |
| home desktop en    | 240 ms | 0.00318 |
| home desktop ar    | 288 ms | 0.01589 |
| home mobile en     | 208 ms | 0.01824 |
| home mobile ar     | 284 ms | 0.00410 |
| shop desktop en    | 420 ms | 0.00169 |
| shop mobile ar     | 360 ms | 0.00004 |
| product desktop en | 308 ms | 0.00101 |
| checkout mobile en | 164 ms | 0.03556 |

All inside the 2500 ms LCP and 0.1 CLS gates. **The Arabic homepage began this
work at CLS 0.517.**

Served from a local static server, so these are not network-realistic
field numbers — they measure the application's own cost, which is what the
redesign controls.

## 4. Bundle — the cost of a full-site redesign

|                  |      main |             final |            Δ |
| ---------------- | --------: | ----------------: | -----------: |
| Entry CSS (gzip) |  39.28 KB |          47.86 KB | **+8.58 KB** |
| CSS total        |  42.65 KB |          50.13 KB |     +7.48 KB |
| Entry JS         | 178.02 KB |         181.28 KB | **+3.27 KB** |
| JS total         | 370.40 KB |         373.38 KB |     +2.98 KB |
| JS chunks        |        69 |                68 |           −1 |
| Fonts            |         0 | 3 files, 79.60 KB |    +79.60 KB |

**Zero dependencies added. Zero removed.** The `package.json` diff contains only
two new npm scripts and their insertion into `verify:source`.

Operations remains fully route-split — `OperationsDashboardPage` 20.7 KB,
`OperationsPage` 8.1 KB, `OperationsSectionView` 0.9 KB gzip — none of it in the
entry bundle.

## 5. Security review

`git diff main..HEAD --name-only` touches **71 files**, and **not one** is under:

```
supabase/    api/    src/services/    src/context/    .github/
```

`vercel.json` was modified once, in Phase 1, to add an immutable cache header for
`/fonts/`. **The CSP is byte-identical to main** — no `script-src`, `frame`,
`connect-src` or `media-src` directive was altered.

Therefore, by construction rather than by assertion: server-side price
calculation, payment amount validation, webhook verification, guest-order
tokens, RLS, order ownership, refund and return limits, idempotency, audit
logging, rate limits, Turnstile, private storage, malware quarantine, signed
design sharing and Operations role/AAL2 enforcement are all unchanged.

The one security-relevant _improvement_: `noindex` now actually applies to
`/cart`, `/account`, `/compare` and `/order-tracking`, which it did not before
(Phase 6).

## 6. Test matrix

| Gate                                         | Result          | Note                                                             |
| -------------------------------------------- | --------------- | ---------------------------------------------------------------- |
| `npm run build`                              | **pass**        |                                                                  |
| `verify:source` (18 validators + core smoke) | **pass**        | now includes 2 new gates                                         |
| `validate:design-tokens`                     | **pass**        | 92 contrast pairs × 2 palettes                                   |
| `validate:seo`                               | **pass**        | includes the new duplicate-tag gate                              |
| `lint-project`                               | **pass**        |                                                                  |
| `typecheck`                                  | **75 errors**   | identical to baseline; **0** in any redesign file                |
| `test:node`                                  | 321/322         | 1 failure pre-existing on `main`                                 |
| `test:ui`                                    | 46/47           | 1 failure pre-existing (`Breadcrumbs`); **+32 new tests**        |
| `format:check`                               | 152 unformatted | **all pre-existing**; `src/App.jsx` is unformatted on `main` too |
| `lint:eslint`                                | **fails**       | pre-existing `yocto-queue` CJS/ESM shim, documented in AGENTS.md |
| Database / pgTAP / RLS matrix                | **BLOCKED**     | needs a Supabase instance                                        |
| Payment sandbox E2E                          | **BLOCKED**     | needs provider credentials                                       |
| Browser E2E (Playwright suite)               | **BLOCKED**     | needs the local Supabase stack                                   |
| Lighthouse / PageSpeed                       | **not run**     | superseded by direct LCP/CLS measurement                         |
| CodeQL / OSV / SBOM                          | **BLOCKED**     | CI-only, needs GitHub Actions                                    |

Blocked gates are recorded as **blocked**, not as passed.

## 7. Product viewing — all 69 products

| Tier                      |  Count |
| ------------------------- | -----: |
| A — real-time 3D          |  **0** |
| B — true photographic 360 |  **0** |
| C — premium multi-angle   |  **1** |
| D — asset-blocked         | **68** |

Level D splits into **24** products with one real photograph and **44** with no
photography at all, showing purpose-built concept artwork.

- Machine-readable: `reports/product-viewer/matrix.json`
- Human-readable: `docs/PRODUCT_VIEWER_MATRIX.md`
- Regenerated by `verify:source`, so it cannot go stale.

No fake 360 exists. No fabricated geometry exists. A sequence shorter than 24
frames resolves to _no_ spin rather than a padded one, placeholder art never
counts as an asset, and a model reference outside same-origin `/models/` is not
trusted. Every product page states in words what its imagery actually is.

## 8. Customize audit

Existing design, roster, versioning, sharing, proof, quote and preflight logic is
**unmodified** — `DesignPreview.jsx`, `ProductionDesignEditor.jsx` and
`productionPreflight.js` were never opened. `CustomizePage.jsx` changed by two
lines.

The accuracy wall is enforced in code and pinned by test: a `factory_approved`
status **without** `readyForManufacturing` still reads _Concept preview_. With no
approved factory profile in the repository, every custom product is currently a
concept preview, and the interface says so in both languages.

## 9. Arabic and RTL

Every layer uses logical properties. Across ~4,000 lines of new CSS there are
**four** `[dir='rtl']` rules in total, all in the hero wash and legacy bridge —
everything else mirrors automatically.

Verified: mirrored shell, mirrored department rail underline drawn from the
leading edge, bidi-isolated prices and order references, Arabic-specific type
scale and tracking on every surface, garment-relative left/right in the Studio
that do **not** swap, arrow keys and drag that follow reading direction, Arabic
never broken mid-word, and 0 px overflow at 400% zoom in Arabic.

**Not verified:** linguistic quality. No qualified human Arabic reviewer has
signed off. `validate:arabic-review` remains part of `verify:source` and the
human-review requirement stands.

## 10. Unrelated churn removed

Wildcard `prettier --write` commands swept three CSS files and one generated
report into the diff with formatting-only changes. `src/styles/index.css`,
`src/styles/account-sync.css`, `src/styles/premium.css` and
`reports/tests/node-tests.tap` were reverted to `main`, and the routes re-verified
clean afterwards. A stray `rc4-tmp.mjs` debug file was also removed.

## 11. Known limitations

1. **No final media exists** — no hero video, no product photography for 44
   products, no turntables, no 3D models. Specified in
   `docs/HERO_MEDIA_MANIFEST.md` and `docs/PRODUCT_VIEWER_MATRIX.md`.
2. **No factory data exists** — no approved profile, so Tier F is unreachable.
   Specified in `docs/CUSTOMIZE_STUDIO_CONTRACT.md`.
3. **No JSON-LD structured data anywhere.** Adding it requires static markup in
   the shell plus a CSP hash sync; recorded rather than rushed.
4. **Authenticated views are unverified visually** — account, orders, returns,
   Team Locker and all Operations modules need a Supabase instance with a staff
   session and AAL2.
5. **Pre-existing red gates remain red**: `lint:eslint`, one node test, one UI
   test, 75 typecheck errors, 152 unformatted legacy files. All present on
   `main`; none made worse.
6. **`/lab/home` prototype retained** and reviewable, `noindex`, disallowed in
   `robots.txt`, and route-split at 0.86 KB CSS.
