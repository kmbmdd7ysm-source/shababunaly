# Account setup

1. Create Supabase and apply all migrations plus the generated product catalogue.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the frontend environment.
3. Configure the production Site URL, allowed redirects, email confirmation and SMTP.
4. Keep RLS enabled; never expose the service-role key to the browser.
5. Test both supported registration paths: customer and organization/club.
6. Verify sign-up, confirmation, sign-in from a second device, reset password, profile editing, addresses, cloud orders and sign-out.

Without production credentials, the UI clearly reports that cloud accounts are unavailable while guest browsing and local commerce state remain functional.
