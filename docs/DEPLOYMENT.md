# SHABABUNA Deployment

## Runtime

- Node.js 22.x
- npm 10.x
- Vite frontend deployed on Vercel
- Supabase for authentication, PostgreSQL, Row Level Security, Storage and Edge Functions
- Formspree for operational email delivery
- Payment providers connected only through server-side adapters

## Clean deployment

1. Create an empty Supabase project.
2. Apply every migration in `supabase/migrations` in filename order.
3. Deploy the functions in `supabase/functions`.
4. Copy `.env.example` to the hosting environment and provide real values. Never commit the populated file.
5. Configure the Vercel cron for `/api/notification-worker` and set `CRON_SECRET`.
6. Connect only payment providers whose server endpoint, secret, public key and webhook secret are all available.
7. Run `npm ci`, `npm run qa:full`, then deploy the output of `npm run build`.
8. Confirm `SITE_URL`, allowed origins, email verification redirects and payment return URLs match the production domain.

## Release blocking rules

Production must not be released when any of the following is true:

- Supabase URL, anonymous key or service-role secret is absent.
- Database migrations or RLS tests have not run against a clean database.
- A payment method appears in the browser without a configured server adapter.
- A visible product lacks a real SKU, real media, real price or confirmed inventory state.
- The clean install, build, browser tests, accessibility tests or database tests fail.
- Any secret is present in the repository.

The browser intentionally hides unconfigured payment methods. Draft and unverified products are not eligible for search, sitemap or cart placement.

## Vercel configuration

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm ci`
- Node version: 22

Security headers and cron definitions are maintained in `vercel.json`.

## Rollback

Keep the prior immutable deployment available in Vercel. Database changes are additive and ordered; for data correction use a new forward migration rather than editing an applied migration. Export operational data before any destructive maintenance.
