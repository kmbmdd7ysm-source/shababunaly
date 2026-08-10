# SHABABUNA production activation

## 1. Supabase

Create the production project, enable email/password authentication, and add:

```env
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=PUBLIC_ANON_KEY
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SERVER_ONLY_SERVICE_ROLE
```

Apply migrations in filename order. Deploy these Edge Functions:

- `create-order`
- `create-guest-order`
- `lookup-guest-order`

Set Edge secrets:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set EDGE_RATE_LIMIT_SALT=...
```

Run the catalogue generator after product edits:

```bash
npm run catalog:generate
```

Apply `supabase/generated/product_catalog.sql`. The generated file deterministically upserts every sellable variant and archives removed variants.

## 2. Authentication and email

Set the Supabase Site URL to `https://shababuna.ly` and allowed redirects to:

- `https://shababuna.ly/account`
- `https://shababuna.ly/checkout/success`
- local development URLs when required.

The bilingual confirmation template is in `supabase/templates/confirmation.html`.

Create one Formspree form delivering to `shababuna.info@gmail.com`. Configure:

```env
VITE_FORM_ENDPOINT=https://formspree.io/f/mvzenjgv
VITE_NEWSLETTER_ENDPOINT=https://formspree.io/f/mvzenjgv
FORMSPREE_ORDER_ENDPOINT=https://formspree.io/f/mvzenjgv
```

Verify contact, custom-design, team/wholesale, newsletter and retail-order submissions before launch.

## 3. Payment providers

The storefront supports two independent hosted-checkout adapters:

### International cards and wallets

```env
VITE_PAYMENTS_PROVIDER=provider-public-name
VITE_PAYMENTS_PUBLISHABLE_KEY=public-key-if-required
VITE_CHECKOUT_API_BASE=/api
PAYMENTS_PROVIDER=provider-server-name
PAYMENTS_SESSION_URL=https://your-secure-adapter.example/create-session
PAYMENTS_SECRET_KEY=server-secret
```

### Libyan bank cards

```env
VITE_LIBYAN_BANK_CARD_PROVIDER=provider-public-name
VITE_LIBYAN_BANK_CARD_PUBLISHABLE_KEY=
VITE_LIBYAN_BANK_CARD_CHECKOUT_API_BASE=/api
LIBYAN_BANK_CARD_PROVIDER=provider-server-name
LIBYAN_BANK_CARD_SESSION_URL=https://your-secure-adapter.example/create-session
LIBYAN_BANK_CARD_SECRET_KEY=server-secret
```

`/api/create-session` accepts only an order reference, reloads the trusted order from Supabase with a server-only key, confirms the payable status and amount, and then sends a sanitized trusted payload to the provider adapter.

Both provider adapters must:

1. Create a hosted checkout for `trustedOrder.amountMinor` and `trustedOrder.currency`.
2. Store `trustedOrder.orderNumber` as payment metadata.
3. Return an HTTPS URL.
4. Verify provider webhooks cryptographically.
5. Update the matching Supabase order only after a verified webhook.
6. Handle duplicate webhook delivery idempotently.
7. POST the signed event to `/api/payment-webhook`; the endpoint verifies HMAC, amount, currency, status, entity type and idempotency before changing an order or quote.

Never trust an amount sent by the browser.

## 3.1 Verified notification delivery

The approved endpoint is already configured:

```env
VITE_FORM_ENDPOINT=https://formspree.io/f/mvzenjgv
VITE_NEWSLETTER_ENDPOINT=https://formspree.io/f/mvzenjgv
FORMSPREE_ORDER_ENDPOINT=https://formspree.io/f/mvzenjgv
```

Order and operations events are also written to `commerce_notifications`. Configure a long random `CRON_SECRET`, then schedule `/api/notification-worker` from Vercel Cron. The worker retries Formspree delivery and expires stale unpaid orders.

## 4. Shipping

### Libya retail

- 20 LYD fixed delivery.
- Free from 500 LYD product subtotal.
- Ready to Ship: 24–72 hours.
- Standard non-ready: 14–18 days.

### International

All ISO countries are selectable. Until a country rate is configured, the order is saved with:

- `shipping_quote_required = true`
- `payment_plan = pending_shipping_quote`
- `payment_status = shipping_quote_pending`
- no inventory reservation
- no payment collection

Operations can either configure a reusable flat USD country rate or add a one-off shipping quote. Retail orders use a configured country rate immediately; countries without one remain pending. Custom, wholesale and large-equipment orders always require a per-order quote before payment.

### Large equipment

Hoops, backboards and other large-equipment products always require a shipping quote, including Libya, unless a future dedicated rate is configured.

## 5. Content and media

Replace temporary files in `public/images/catalog/` with real product-owned photography. Keep filenames stable or update the matching product data. Reserved cinematic sections are intentionally empty until final videos are supplied.

Recommended video exports:

- Desktop hero: 1920×1080 or 2560×1440, H.264/AV1, muted, short loop, poster image.
- Mobile hero: 1080×1350 or 1080×1920 crop, separately encoded.
- Do not autoplay multiple below-the-fold videos.
- Keep a static poster and respect `prefers-reduced-motion`.

## 5.1 Staff and super-admin access

Bootstrap the first super admin once from the Supabase Dashboard by adding this protected app metadata to the chosen user:

```json
{ "role": "super_admin" }
```

After that, `/operations` can manage customer, sales, operations, admin and super-admin roles through `/api/admin-users`. The API rechecks the caller against Supabase Auth and never trusts editable `user_metadata`.

The operations area also manages:

- inventory per SKU/variant and Ready-to-Ship availability;
- international country rates and one-off shipping quotes;
- verified/manual payments, refunds and returns;
- quote totals calculated as subtotal + shipping;
- design proofs and customer approvals;
- exchange rate and homepage hero media URLs.

## 6. Deployment

1. Push the final project to GitHub.
2. Import to Vercel.
3. Add all environment variables to Preview and Production.
4. Deploy and verify account creation, email verification, sign-in on another device, currency persistence and order sync.
5. Connect `shababuna.ly` and redirect `www` consistently.
6. Add Google Search Console and analytics IDs only after consent configuration.
7. Run the full QA commands and inspect mobile/desktop Lighthouse results.

## 7. Launch acceptance checklist

- [ ] English and Arabic pages reviewed by a human.
- [ ] Product names remain English in Arabic mode.
- [ ] USD/LYD conversion uses the backend rate.
- [ ] Libya cash and bank-card options appear only in Libya.
- [ ] Ready to Ship is hidden outside Libya.
- [ ] 20 LYD and 500 LYD rules match checkout and server order totals.
- [ ] International orders create a pending quote without charging.
- [ ] Wholesale/custom minimums are rejected server-side when invalid.
- [ ] Custom/wholesale due-now amount is 50%.
- [ ] Retail card due-now amount is 100%.
- [ ] All forms reach `shababuna.info@gmail.com`.
- [ ] Email verification and password reset work.
- [ ] Orders are visible on a second signed-in device.
- [ ] Payment sandbox webhooks update orders and quote deposits/balances correctly.
- [ ] `CRON_SECRET` is set and the notification worker retries queued email events.
- [ ] At least one protected `super_admin` is configured in `app_metadata`.
- [ ] Country shipping rates are tested; unconfigured countries remain pending without payment.
- [ ] Inactive rates and private content are visible only to staff.
- [ ] Real product media replaces placeholders.
- [ ] Legal policies are reviewed for the operating company.
