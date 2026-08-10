# Phase 6 — Remaining public routes, content and SEO

Branch `cursor/shababuna-redesign-master-plan-dc14`. Rollback: revert the Phase 6
commit, or delete the `content.css` import in `src/main.jsx` and the `data-rh`
attributes in `index.html`.

## Baseline

Tree clean at the Phase 5 commit. A sweep of all 17 remaining public routes
(68 checks) found **6 axe violations** and zero broken routes.

## Scope

`src/styles/content.css` migrates About, Contact, FAQ, Help, Size Guide, Order
Tracking, Shipping & Returns, Refund Policy, Privacy, Terms, Cookies, Events,
Online Training, Programs, Favorites, Offline and the 404.

These routes are read, not browsed, so the expression is editorial: a capped
measure (74ch Latin, 68ch Arabic, because Arabic is denser per character), a
clear heading scale, specification tables with hairline rules and tabular
figures, a drawn timeline spine for order tracking, and one shared treatment for
empty, offline and error states.

**No page component was edited.** Legal meaning, form endpoints, validation,
Turnstile, retry behaviour, error mapping and order-access security are
untouched.

## The significant find: every page shipped two canonicals

`index.html` carries static `description`, `robots`, `canonical`, Open Graph and
Twitter tags so a crawler sees something before hydration. `react-helmet-async`
only reclaims tags marked `data-rh` — without it, it **appends** rather than
replaces.

Measured on the live build, every route emitted:

- **two `<link rel="canonical">`** — the correct one _and_ `https://shababuna.ly/`
- **two `<meta name="description">`**
- **two `<meta name="robots">`**

Consequences, in order of severity:

1. **`noindex` was silently defeated on every private route.** `/cart`,
   `/account`, `/compare` and `/order-tracking` all correctly ask for
   `noindex, nofollow`, and all four were also emitting `index, follow` from the
   shell. The brief for this phase explicitly says private routes must not be
   exposed to search engines; they were.
2. Every page canonicalised to the homepage, so the whole site looked like
   duplicates of `/`.
3. Every page shared the homepage description.

Fixed by adding `data-rh="true"` to all 18 static SEO tags, which hands
ownership to Helmet. Verified after: **every route emits exactly one canonical,
one description and one robots directive**, the canonical is correct per route,
and `noindex, nofollow` now genuinely applies to `/cart`, `/account`,
`/compare` and `/order-tracking`.

A gate was added to `validate-seo.mjs`, and **proved to bite** by removing one
attribute and watching the build fail.

## Files created

- `src/styles/content.css`
- `PHASE6_EVIDENCE.md`

## Files modified

- `index.html` — 18 `data-rh` attributes and an explanatory comment
- `src/main.jsx` — one import
- `scripts/validate-seo.mjs` — duplicate-SEO-tag gate
- `scripts/validate-design-tokens.mjs` — `content.css` added to bridge layers

## Dependencies

**None added. None removed.**

## Other fixes

- **`/size-guide`**: 21 table headers at 2.03:1 — `#4d4d4d` on the dark header
  row. Header cells now take the inverse ink, and the tables are drawn as
  specifications.
- **`/contact`**: the `.contact-info` aside is a near-black plate whose label
  carried `#4d4d4d` at 2.41:1. It now takes the night surface properly, with
  inverse ink for labels, links and headings, and the on-dark focus ring.

## Tests

| Command         | Result                                |
| --------------- | ------------------------------------- |
| `test:node`     | 321/322 — unchanged                   |
| `test:ui`       | 46/47 — unchanged                     |
| `typecheck`     | 75 — unchanged                        |
| `verify:source` | pass (now including the new SEO gate) |
| `validate-seo`  | pass                                  |
| `build`         | pass                                  |

## Browser review

68 checks across 17 routes × 2 locales × 2 viewports at baseline, then a
32-check confirmation sweep after the fixes.

**Final: 32 checks, 32 clean, 0 axe violations, 0 horizontal overflow, one h1
per route.** Every remaining public route renders with content and no page
errors.

Routes confirmed: `/about` `/contact` `/faq` `/help` `/size-guide`
`/order-tracking` `/shipping-returns` `/refund-policy` `/privacy-policy`
`/terms` `/cookies` `/offline` `/events` `/online-training` `/programs`
`/favorites` and the 404.

- **Desktop and mobile:** editorial measure holds, tables scroll rather than
  overflow, error and empty states share one drawn treatment.
- **Arabic / RTL:** the timeline spine and its stage marks use
  `inset-inline-start`, so they mirror with no override. Arabic measure is set
  separately.
- **Keyboard:** focusable counts recorded per route; all controls native.

## Content honesty

No claim, price, programme, date or legal sentence was altered. Events, Online
Training and Programs keep their existing coming-soon status and data. The
redesign changed hierarchy and legibility only.

## Known limitations

- **No JSON-LD structured data exists anywhere on the site.** `Seo.jsx` exports
  an unused `organizationSchema()`. Adding it is not a styling change: the CSP
  has no `'unsafe-inline'` for scripts and the repo carries
  `sync-csp-jsonld-hashes.mjs`, so structured data must be static in the shell
  with its hash synced. That is a security-adjacent change and is recorded here
  rather than rushed into a content phase.
- `/checkout` has no `noindex`. `robots.txt` disallows it, so it is not
  crawlable, but the meta directive is missing. Left for Phase 7, which owns
  that page.
