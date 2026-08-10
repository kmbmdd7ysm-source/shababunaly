# External Activation Required

The source implementation is complete enough to connect the external services below, but their live state cannot be created from a ZIP without the account owner.

1. **Supabase** — create the project, set URL/anon/service-role variables, apply all ordered migrations, configure Auth redirect URLs and run `npm run test:db`.
2. **Payments** — select actual Libyan/international providers, set session/retrieve/refund/webhook endpoints and secrets, map official event names, then pass sandbox success/failure/refund/duplicate-signature tests.
3. **Formspree** — verify `https://formspree.io/f/mvzenjgv`, restrict allowed domains, confirm the administration destination and configure/test bilingual customer autoresponse.
4. **Turnstile** — set site and secret keys for protected public forms.
5. **Malware scanning** — set the HTTPS scanning API/token and verify clean, infected, timeout and retry flows.
6. **Monitoring** — configure Sentry-compatible DSN and alert destinations.
7. **Catalog** — upload real approved media, enter actual prices/SKUs and verified warehouse stock. Keep drafts inactive until all publishing eligibility checks pass.
8. **Media** — add final desktop/mobile hero videos and real Our Work projects through Operations.
9. **Release evidence** — from a clean connected environment, run `npm run qa:full`, approve visual baselines and generate real Lighthouse reports.
