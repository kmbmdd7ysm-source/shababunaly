# SHABABUNA World-Class Release Gate

This document is the final technical gate before publishing `shababuna.ly`. A green code check is not a substitute for testing the deployed domain with real environment variables, real product media and payment-provider sandbox credentials.

## Required score profile

The release validator is configured to reject reports below:

| Mode    | Performance | Accessibility | Best Practices | SEO |
| ------- | ----------: | ------------: | -------------: | --: |
| Mobile  |          99 |           100 |            100 | 100 |
| Desktop |         100 |           100 |            100 | 100 |

Core budgets:

- Mobile LCP: 2.5 seconds or less.
- Mobile CLS: 0.05 or less.
- Mobile TBT: 150 milliseconds or less.
- Desktop LCP: 1.8 seconds or less.
- Desktop CLS: 0.05 or less.
- Desktop TBT: 75 milliseconds or less.

Run:

```bash
npm ci
npm run quality:gate
```

`quality:gate` covers formatting, ESLint, TypeScript, unit/UI tests, project-wide coverage, data and commerce invariants, build provenance, repeated database tests, browser flows, accessibility, visual regression, PWA upgrade, both Lighthouse modes, Google PageSpeed Insights, security/SBOM, live integrations and the strict production-release verifier.

## Functional release gates

### Customer commerce

- Personal and organization registration, email verification, login, reset and cross-device session persistence work with Supabase.
- Libya defaults to LYD; outside Libya defaults to USD; user choice persists.
- The single server-controlled USD→LYD rate starts at 9 and updates all prices consistently.
- Ready to Ship is visible only for Libya and only for verified inventory.
- Libya delivery is 20 LYD and free from 500 LYD after discounts.
- Ready delivery shows 24–72 hours; standard Libya delivery shows 14–18 days.
- International checkout remains pending until staff adds a shipping quote.
- Cash is available only in Libya with 50% or 100% choice for standard retail.
- Digital/card payment is full payment for standard retail.
- Custom, team and wholesale use 50% deposit and 50% on arrival.

### Customize and B2B

- Every custom product opens its correct product-specific preview.
- Minimums remain apparel 10, custom basketball 6 and hoop padding 1.
- CSV/XLSX roster import detects missing fields and duplicate numbers.
- Production design records and files persist through Supabase for signed-in users; production mode does not claim cloud persistence when Supabase is unavailable.
- Organization workspace shows designs, rosters, quotes and production updates.
- Staff can add international shipping, progress orders, price quotes and change the exchange rate through audited RPCs only. Secure expiring review links support pinned comments and final proof decisions.

### Security

- No service-role or payment secret is exposed to browser variables.
- Supabase Row Level Security is enabled and tested for every B2B table.
- Hosted checkout reloads the trusted order server-side before creating a session.
- Payment webhooks are idempotent and update only matching trusted orders.
- CSP, HSTS, no-sniff, frame protection, referrer and permissions headers are active on the deployed domain.

### Media and performance

- Hero video is optional, deferred and never blocks first render.
- Mobile and desktop hero posters are responsive and preloaded.
- Real product imagery replaces Shababuna-branded launch artwork before commercial launch.
- Product media uses optimized WebP/AVIF derivatives and correct dimensions.
- No unverified third-party script is added above the fold.
- Analytics loads only after consent and idle time.

## Required live tests

Use real mobile and desktop devices for:

1. Arabic RTL and English LTR navigation.
2. Personal and organization account creation.
3. Email verification and password reset.
4. Ready-to-ship Libya order under and above 500 LYD.
5. Libya cash 50% and cash 100% orders.
6. Libyan bank-card sandbox payment.
7. International order pending shipping quote, staff quote, customer full payment.
8. Custom Design Studio draft, roster import, quote submission and 50% deposit.
9. Order visibility on a second device.
10. Staff role denial for a normal customer and access for approved staff.

## Truthfulness rule

Never publish a claimed PageSpeed score from a local or synthetic file. The protected workflow runs `npm run pagespeed` against a public HTTPS staging URL using Google PageSpeed Insights and stores both mobile and desktop JSON evidence. Keep the screenshots only as the target profile. Final numbers must come from PageSpeed Insights or Lighthouse against the deployed production URL after DNS, caching, final media, analytics and payment integrations are active.
