# Composition rebuild — honest status

This file exists because the previous pass over-claimed, and the difference
matters.

## What went wrong before

Phases 3–9 were delivered as **CSS bridge layers** that target the existing
class names. "Zero page components were edited" was reported as a virtue. It is
not, against this brief: _"Do not create a simple theme layered over old
components"_, _"Do not retain a legacy layout merely because it already
exists"_, _"page composition, information hierarchy, section structure, layout
grids, containers"_ must be rebuilt.

Measured at the start of this pass — **9 of 10 major page/shell components were
byte-identical to `main`**:

| File                     | State before this pass            |
| ------------------------ | --------------------------------- |
| `Header.jsx`             | unchanged since `main`            |
| `Footer.jsx`             | unchanged since `main`            |
| `ShopPage.jsx`           | unchanged since `main`            |
| `CartPage.jsx`           | unchanged since `main`            |
| `CheckoutPage.jsx`       | unchanged since `main`            |
| `AccountPage.jsx`        | unchanged since `main`            |
| `TeamsWholesalePage.jsx` | unchanged since `main`            |
| `AboutPage.jsx`          | unchanged since `main`            |
| `ContactPage.jsx`        | unchanged since `main`            |
| `ProductPage.jsx`        | changed (one import, one element) |

So the site was **restyled, not rebuilt**. The design system, tokens, fonts,
accessibility fixes, CLS fix and SEO fixes from earlier phases are all real and
all stand — but the structural half of the brief was not met.

## Composition rebuilt in this pass

| Surface                        | Old structure                                                               | New structure                                                                                                                                                                                                                                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Masthead** (`Header.jsx`)    | one flex row: brand, links, icons                                           | a drawn datum: three-column grid, navigation as a **numbered register** (01–07), active mark drawn from the leading edge, baseline that thickens on scroll, mega menu as a **full-bleed dark chapter**, mobile as a **full-screen chapter** with display-scale numbered entries and a drawn 4-up instrument grid |
| **Colophon** (`Footer.jsx`)    | four equal link columns + brand block                                       | four movements: full-bleed **sign-off** with wordmark and slogan at display scale, a **numbered directory** (01–04) on hairline rules with Contact promoted, an **instruments strip**, and a **datum line**                                                                                                      |
| **Catalogue** (`ShopPage.jsx`) | PageHero, breadcrumb strip, pill rail, toolbar, promo banner, auto-fit grid | dark **masthead** with the trail inside it and the count as a figure against a rule, a numbered **department register**, a measured **filter rail**, an **active-filter token summary**, a measured 2/3/4 grid, and the request path moved to the foot                                                           |

New stylesheets, all `gw-*` so the legacy CSS no longer matches:
`masthead.css`, `colophon.css`, `catalogue.css`.

## Still restyled, not rebuilt

These retain their original composition and are covered only by the bridge
layers from the previous pass:

`ProductPage` · `CartPage` · `CheckoutPage` · `AccountPage` ·
`TeamsWholesalePage` · `SpecialRequestPage` · `OurWorkPage` · `AboutPage` ·
`ContactPage` · `TeamLockerPage` · the legal and content routes ·
`OperationsDashboardPage` and its modules.

They look consistent with the new system — correct typography, surfaces,
spacing, tokens and accessibility — but their **section structure, hierarchy and
grids are still the original ones**.

## Behaviour preserved in everything rebuilt

Verified in a real browser, both locales, desktop and mobile:

- Masthead: mega hover intent and its 120 ms timer, lazy search overlay, cart
  drawer, all three analytics events, scroll state, route-change close, scroll
  lock, focus trap (held through 25 tabs), Escape, focus return to trigger.
- Colophon: 18 directory links, 6 payment logos, 3 social links, 4 legal
  controls, the Libya-conditional Ready-to-Ship link, the `outbound_social`
  event and the cookie-preferences trigger.
- Catalogue: every `useMemo`, `onChange`, `updateParams`, `baseProducts`,
  `filtered` and the Libya redirect are untouched; the URL remains the single
  source of truth.

## Two real defects found while rebuilding

1. **Focus never returned to the menu trigger.** Hiding the panel blurs whatever
   inside it held focus, and the browser resets to `<body>` during the same
   style recalculation, so a synchronous `focus()` was always lost. Deferred to
   the next frame. Present on `main` too.
2. **`PwaPrompt` reloads the page on the service worker's first
   `controllerchange`** — which in a fresh profile fires on the visitor's very
   first `pointerdown`, reloading the page mid-interaction. Proven pre-existing
   by building `main` and reproducing it against the legacy header. Not changed,
   because it is service-worker behaviour; the review harness now neutralises
   the SW so it measures the page rather than the reload.
