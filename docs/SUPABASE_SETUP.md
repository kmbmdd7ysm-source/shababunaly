# Supabase Setup

## Required variables

Browser:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`

Server only:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EDGE_RATE_LIMIT_SALT`

Never expose the service-role key through a `VITE_` variable.

## Database initialization

Apply all 24 migrations in lexical order from `supabase/migrations`. They cover preferences, privacy, accounts, trusted catalog/orders, atomic inventory, global commerce, B2B operations, payments/refunds, returns, notification resilience, country shipping/content, Special Requests, production security, enterprise contracts/payment proofs/reorders/Team Locker, transactional inventory imports, operational controls safe catalog CRUD, and expiring secure design sharing.

Recommended commands with the official Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase db reset
npm run test:db
supabase db push
```

`npm run test:db` is release-blocking and requires the CLI plus a local or linked database. It validates clean migration application, role boundaries, RLS, inventory concurrency, duplicate payments and duplicate returns.

## Authentication

Enable email/password authentication and email verification. Set production Site URL and allowed redirect URLs. Staff privileges must be granted through protected role tables/app metadata controlled by trusted server paths; never trust editable `user_metadata` for authorization.

Supported account data includes personal profiles, organization memberships, addresses, favorites, designs, orders, quotes, rosters, notifications, returns and special requests.

## Storage

The migration creates a private `special-request-quarantine` bucket. Uploaded customer files remain private and quarantined until a trusted scanner updates the scan state. SVG and executable content are rejected before storage. Connect `MALWARE_SCAN_PROVIDER`, `MALWARE_SCAN_API_URL` and `MALWARE_SCAN_API_KEY` before automated release from quarantine.

## RLS verification

Before production, test at minimum:

- anonymous, authenticated customer, organization member, staff, admin and super-admin roles;
- customer A cannot read or modify customer B data;
- staff actions are scoped to explicit permissions;
- service-role use is limited to server endpoints and workers;
- storage objects follow the owning request/account permissions;
- IDOR attempts against order, quote, design, return and special-request IDs are denied.

## Backups and deletion

Enable Supabase backups appropriate to the plan. Account deletion and privacy export should run through trusted server procedures so linked orders and statutory records are retained or anonymized according to policy rather than removed inconsistently.
