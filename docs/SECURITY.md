# Security

## Browser and transport

`vercel.json` configures HSTS, content type sniffing protection, frame restrictions, referrer policy, permissions policy and a Content Security Policy. Browser secrets are forbidden. Cookies and provider sessions must use Secure, HttpOnly and appropriate SameSite attributes.

## API controls

Public APIs use origin checks, bounded request bodies, honeypots, durable database-backed rate limiting in production and Turnstile for sensitive forms. Production rate limiting fails closed if durable storage is unavailable.

## Authorization

Supabase RLS and security-definer functions provide the data boundary. Authorization never relies on editable user metadata. Administrative operations require protected roles/permissions. Service-role credentials exist only on server endpoints, workers and trusted deployment tools.

## Files

Uploads are restricted by file count, size, extension, declared MIME and signature. Executables and untrusted SVG are denied. Special-request files enter private quarantine and expose a malware-scanner adapter before release.

## Payments

Payment sessions are created from trusted database records. Webhooks require provider-specific signatures and event maps, and ledger events are idempotent. Browser totals are not authoritative.

## Logging and monitoring

Use structured server logs without full addresses, secrets, card data or tokens. `VITE_SENTRY_DSN` may be configured for client error tracking; `SENTRY_AUTH_TOKEN` is server/CI only. Configure alerts for failed notification jobs, repeated payment failures, rate-limit spikes and authorization denials.

## Release checks

Run secret scanning, dependency audit, source audit, database/RLS tests and browser tests on every release. The local static audit reports source/configuration findings only and does not replace live penetration testing, provider acceptance or database execution.

## Data lifecycle

Define retention periods for accounts, quotes, uploads, security logs and payment records. Privacy export and deletion must use trusted procedures and preserve legally required transaction records through anonymization or retention policy.
