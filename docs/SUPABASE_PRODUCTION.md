# Supabase production setup

1. Create the production project and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY`.
2. Apply every SQL migration in `supabase/migrations/` in filename order.
3. Apply `supabase/generated/product_catalog.sql` after running `npm run catalog:generate`.
4. Deploy `create-order`, `create-guest-order`, `lookup-guest-order` and `get-commerce-settings`.
5. Configure `https://shababuna.ly` as the Site URL and allow the account and checkout callback routes.
6. Enable email confirmation and configure production SMTP before launch.
7. Keep RLS enabled and test isolation with two unrelated accounts.

Guest cart, favorites and comparison remain local until sign-in. Sign-in merges local and cloud state, deduplicates exact variant keys, caps quantities at trusted stock and writes the merged result. Payment data is never stored by the storefront.
