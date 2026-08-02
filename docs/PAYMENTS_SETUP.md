# Payments Setup

## Architecture

Payment methods are server-authoritative. The browser first creates or loads a trusted order, then requests a session using only the trusted order reference and an idempotency key. Prices, exchange rate, shipping and amount due are loaded server-side.

Adapters live under `api/payments`:

- Online card
- Libyan bank card

Each adapter defines session creation, webhook signature verification, event normalization, error mapping and explicit hooks for retrieval/refund. Retrieval and refund remain unavailable until a provider-specific API is configured; they must not be represented as live.

## Required variables

Online card:

- `VITE_PAYMENTS_PROVIDER`
- `VITE_PAYMENTS_PUBLISHABLE_KEY`
- `PAYMENTS_PROVIDER`
- `PAYMENTS_SESSION_URL`
- `PAYMENTS_SECRET_KEY`
- `PAYMENTS_WEBHOOK_SECRET`

Libyan bank card:

- `VITE_LIBYAN_BANK_CARD_PROVIDER`
- `VITE_LIBYAN_BANK_CARD_PUBLISHABLE_KEY`
- `LIBYAN_BANK_CARD_PROVIDER`
- `LIBYAN_BANK_CARD_SESSION_URL`
- `LIBYAN_BANK_CARD_SECRET_KEY`
- `LIBYAN_BANK_CARD_WEBHOOK_SECRET`

Unconfigured methods are hidden from customers.

## Commercial rules

- Libya retail cash: 50% or 100% as allowed by the order.
- Libya bank card and online card: full amount due now.
- International retail: electronic payment only after any required shipping quote.
- Custom, Teams and Wholesale: 50% deposit and 50% final balance unless an approved policy explicitly changes the order.
- International orders without a shipping rate remain `pending_shipping_quote`.

`amount_due_now` is the currently payable amount; outstanding/remaining balance is not cleared until confirmed payment events cover it. Every payment/refund is appended to the ledger through trusted database procedures.

## Webhooks

Use a separate webhook URL and secret for each provider. The adapter verifies HMAC signatures and accepts only an explicit provider event map. Do not use keyword-based generic event matching. Provider event IDs and business idempotency keys must be unique.

## Provider acceptance checklist

Before enabling a method, test in the provider sandbox:

- successful, failed and cancelled payment;
- duplicate webhook;
- invalid signature;
- amount/currency mismatch;
- refund success and failure;
- session timeout and idempotent retry;
- 50/50 deposit followed by final payment;
- shipping quote acceptance before payment.
