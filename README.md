# SHABABUNA — BUILT DIFFERENT.

Release-engineered bilingual basketball commerce platform for retail, ready-to-ship inventory in Libya, custom manufacturing, clubs, academies, wholesale, worldwide shipping requests, and the official LHA store.

## Brand and public information

- English name: **SHABABUNA**
- Arabic name: **شبابنا**
- Slogan: **BUILT DIFFERENT.**
- Domain: `https://shababuna.ly`
- Email: `shababuna.info@gmail.com`
- Phone / WhatsApp: `+218 92 657 8062`
- Location: Tripoli, Libya
- Instagram / TikTok: `shababuna.ly`
- Primary visual system: black, white, generous spacing, cinematic media, restrained green only for verified ready-to-ship inventory.

## What is included

### Storefront

- Minimal main navigation: Home, Shop, Customize, Teams & Wholesale, LHA, Our Work, About.
- Shop departments: Ready to Ship, Clothing, Footwear, Accessories, Basketballs, Equipment.
- Footwear split only into In-Court and Off-Court; brand and all secondary choices are filters.
- Dynamic filters by department: brand, product type, size, colour, price, inventory, ready-to-ship, new, best seller, and customizable.
- Popular brand priority in filters: Nike, Jordan, adidas, Under Armour, Puma, New Balance, Li-Ning, ANTA, Peak, 361°; remaining brands follow.
- Retail and wholesale purchase modes with trusted server-side pricing and product-level minimum quantities.
- English product names remain unchanged in Arabic; descriptions and interface copy are naturally written in both languages.

### Ready to Ship

- Visible only when the delivery country is Libya.
- Distinct restrained green status mark on product cards and product pages.
- Delivery promise: 24–72 hours inside Libya.
- Standard non-ready products to Libya: estimated 14–18 days.
- Libya delivery fee: 20 LYD.
- Free Libya delivery when the post-discount product subtotal is 500 LYD or more.
- International orders remain pending until a destination-specific shipping price is added and approved.

### Currency and country logic

- Canonical database currency: USD.
- Public fallback exchange rate: `1 USD = 9 LYD`.
- The authoritative rate is stored in `commerce_settings` and can be changed without editing products.
- First visit includes a USD / LYD selection.
- Libya is suggested in LYD; other countries are suggested in USD.
- Currency never changes delivery-country rules. A Libyan customer may display USD and still receive Libya shipping/payment rules.
- Language is English by default and Arabic is an equal-quality manual option with full RTL support.

### Payments

- Cash appears only for delivery inside Libya.
- Standard retail cash orders allow 50% to confirm or 100% payment.
- Standard retail card/digital orders require 100% payment.
- Custom, club and wholesale orders use 50% before production and 50% when goods arrive.
- Payment methods are prepared for Libyan bank cards and an international card/wallet provider (Visa, Mastercard, Apple Pay, Google Pay, Samsung Pay where supported by the connected provider).
- Browser code never stores or receives private payment keys.
- A server endpoint creates hosted checkout sessions only after reloading and validating the trusted order from Supabase.
- International and large-equipment orders collect no payment before shipping is approved.

### Customize and B2B

- Customize appears as a primary section and is also built into Teams & Wholesale.
- Production Design Studio: product setup, front/back/side artwork, roster, proof review and production export.
- Product-specific vector previews for game sets, jerseys, shorts, practice/shooting shirts, hoodies, pants, tracksuits, bags, sleeves, basketballs and hoop padding without heavy 3D runtime dependencies.
- CSV/XLSX roster import, CSV export, duplicate-number detection, size validation, autosave, versioning, secure expiring review links, pinned comments, proof decisions, editable SVG artwork ZIP, proof PDF, tech-pack PDF and quote handoff.
- Organization workspace for designs, rosters, quotes, deposits and production updates.
- Design upload and quote forms support images, PDF, CSV and XLSX files.
- Minimum order rules:
  - Custom apparel: 10 pieces.
  - Custom basketballs: 6 balls.
  - Hoop systems / large equipment: 1 unit.
  - Other products: dynamic product-level minimum.
- Custom, club and wholesale estimate: 30–60 days depending on product, quantity and order date.
- Team workflow: request → quote → design proof → approval → 50% deposit → production → QC → shipment → remaining 50% → delivery.
- Two precise registration paths: personal customer and team/business organization accounts, with saved addresses, order history, profiles, and cross-device organization metadata.

### Staff operations

- Hidden staff-only `/operations` route guarded by account role.
- Country shipping-rate manager, per-order shipping quote queue, order workflow controls, custom/wholesale quote management, returns/refunds, product inventory/content, hero media and USD→LYD rate control.
- Staff changes run through privileged Supabase RPCs with audit logging and Row Level Security.
- Public navigation never exposes staff operations; roles are read only from protected Supabase `app_metadata`, and only a super admin can change staff access through the server API.

### LHA official store

- Shop-only LHA section; no academy programs, events or online training routes.
- All source LHA products and prices are retained.
- LHA keeps its own visual identity inside the Shababuna account, cart, checkout, shipping and order system.

### Media

- User-provided Shababuna marks and wordmarks are installed in `public/brand/`.
- Cinematic hero and project media positions are already designed and reserved.
- Catalogue SVGs provide clean Shababuna-branded launch artwork until verified product photography is uploaded.
- Replace media through stable public paths; no layout redesign is required.

## Technical architecture

- React 18 + Vite.
- React Router with route-level lazy loading.
- Supabase Auth, profiles, saved state, trusted catalogue, transactional order RPC and inventory reservation.
- Vercel server endpoints for geography, protected payment-session creation and form/order relays.
- Formspree-compatible contact, quote, custom design, newsletter and order notifications.
- English/Arabic direction control, localized country selector, SEO metadata, Open Graph, PWA manifest, service worker and consent-controlled analytics.
- Canonical prices and inventory are validated by server-side SQL, never trusted from browser totals.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without cloud credentials the storefront remains staging-safe and does not pretend that accounts, cross-device data, trusted inventory or live payment processing are active. Production commerce requires the verified connections below.

## Production activation order

1. Create a Supabase project.
2. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Apply all SQL files in `supabase/migrations/` in filename order.
4. Deploy the functions in `supabase/functions/` and set `SUPABASE_SERVICE_ROLE_KEY` plus `EDGE_RATE_LIMIT_SALT` as Edge secrets.
5. Run `npm run catalog:generate` after any catalogue edit, then apply `supabase/generated/product_catalog.sql`.
6. The approved Formspree endpoint `https://formspree.io/f/mvzenjgv` is already wired for contact, newsletter, design, wholesale, order and operations notifications; verify delivery to `shababuna.info@gmail.com` in Formspree.
7. Connect the international and Libyan payment-provider adapters. The adapters must return `{ "url": "https://secure-provider-checkout/..." }`.
8. Configure the server-only Supabase URL/service-role key in Vercel so payment sessions, trusted order notifications, notification retries and super-admin user management can revalidate data.
9. Add the `shababuna.ly` domain, configure DNS, deploy, and submit the sitemap to Google Search Console.
10. Replace the reserved media and catalogue concept artwork with final product photography and optimized video files.

Full activation details: [`docs/PRODUCTION_ACTIVATION.md`](docs/PRODUCTION_ACTIVATION.md).

Current verified and blocked evidence: [`IMPLEMENTATION_AND_RELEASE_STATUS.md`](IMPLEMENTATION_AND_RELEASE_STATUS.md).

## Required environment variables

Use `.env.example` as the source of truth. Never expose service-role or payment-secret values with a `VITE_` prefix.

## Exchange-rate update

```sql
insert into public.commerce_settings(setting_key, numeric_value)
values ('usd_to_lyd_rate', 9)
on conflict (setting_key)
do update set numeric_value = excluded.numeric_value, updated_at = now();
```

The storefront, cart, checkout, orders and free-delivery threshold all use this one source.

## Quality commands

```bash
npm run verify:release
npm run validate:data
npm run validate:commerce
npm run validate:brand
npm run validate:media
npm run validate:seo
npm run validate:cloud-readiness
npm run validate:world-class
npm run validate:performance-budget
npm run typecheck
npm run lint
npm test
npm run build
```

For browser and performance verification:

```bash
npm run test:e2e
npm run test:a11y
npm run lighthouse
npm run pagespeed
npm run quality:gate
```

## Important commercial controls

- Do not mark inventory Ready to Ship unless it physically exists in Libya.
- Do not apply `Made in USA` to equipment, footwear or unrelated accessories. The catalogue restricts this claim to verified Shababuna apparel.
- Do not collect international payment before shipping is priced and approved.
- Do not enable a payment provider until its webhook updates the matching trusted order and is tested in sandbox mode.
- Product prices in JavaScript are seed/catalogue data. Production checkout uses the trusted Supabase catalogue and transactional RPC.

## PageSpeed release gate

The protected release requires both local/deployed Lighthouse evidence and Google PageSpeed Insights evidence. It rejects a release unless the generated reports meet the requested score profile: mobile `99 / 100 / 100 / 100` and desktop `100 / 100 / 100 / 100`, plus strict LCP, CLS and TBT budgets. Scores must still be measured against the final deployed domain because hosting, third-party scripts, real media, network conditions and payment providers affect the result. The project never fabricates PageSpeed reports.

See [`docs/WORLD_CLASS_RELEASE_GATE.md`](docs/WORLD_CLASS_RELEASE_GATE.md) and [`docs/TEST_EVIDENCE.md`](docs/TEST_EVIDENCE.md).
