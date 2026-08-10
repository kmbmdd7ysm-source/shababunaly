# Formspree Setup

## Endpoint

The centralized endpoint is:

`https://formspree.io/f/mvzenjgv`

Set all three variables to the approved endpoint:

- `VITE_FORM_ENDPOINT`
- `VITE_NEWSLETTER_ENDPOINT`
- `FORMSPREE_ORDER_ENDPOINT`

Operational submissions use structured fields such as request type, reference ID, customer name, email, phone, WhatsApp, country, details, amount, currency, payment method and the admin record URL when available.

## Covered notifications

The shared adapter is used for contact, newsletter, checkout/order notices, custom-design requests, Teams & Wholesale, quotes, special requests, returns, refunds, proofs and international shipping quotes.

## Reliable delivery

Order or request creation is independent from email delivery. Database triggers place notification jobs in the outbox. `/api/notification-worker` claims jobs, calls Formspree, records success or retry information and uses idempotency to avoid duplicate business records. Configure a Vercel cron and protect it with `CRON_SECRET`.

A customer must not be told that the underlying order failed merely because notification delivery failed.

## Formspree dashboard actions

1. Confirm the form owner and destination mailbox.
2. Add the production domain to Formspree restrictions.
3. Configure spam controls and submission limits.
4. If customer autoresponse is required, configure it in the Formspree dashboard and use the submitted `email` field as recipient.
5. Verify Arabic and English templates with real test submissions.
6. Confirm attachments are allowed for the selected plan before enabling direct attachment delivery.

The repository prepares autoresponse-compatible fields but does not claim that dashboard autoresponse is live. That requires a real accepted submission and mailbox verification.

## Failure behavior

The adapter treats non-2xx responses, timeout/network errors, 400, 429 and 500 as delivery failures. Retryable jobs remain in the outbox. Public forms only show success after the service accepts the submission; order success remains tied to trusted database creation.
