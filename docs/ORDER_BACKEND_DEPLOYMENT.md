# Trusted orders and inventory

SHABABUNA never accepts browser totals as authoritative. The order Edge Functions validate product IDs, variant IDs, purchase mode, minimum quantity, trusted USD price, inventory, country, payment plan and shipping rule inside a single transactional RPC.

## Request flow

1. The browser creates an idempotency key.
2. `create-order` or `create-guest-order` validates the request shape and rate limit.
3. `create_order_transactional` locks trusted catalogue rows.
4. Retail, wholesale or custom pricing is selected from trusted catalogue metadata.
5. Product-level quantities are checked against minimums.
6. Libya shipping is resolved from the backend exchange rate; international and large equipment are held for quote.
7. Inventory is reserved atomically only for fully priced orders.
8. The trusted order number uses `SHB-YYYYMMDD-XXXXXXX`.
9. Card checkout can be created only from the saved trusted order.

Apply all migrations, deploy the functions, generate the catalogue, and set server secrets as described in `PRODUCTION_ACTIVATION.md`.
