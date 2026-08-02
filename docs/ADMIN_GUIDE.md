# Operations Administration Guide

Operations is restricted to trusted `app_metadata` staff roles with AAL2/MFA. Every sensitive database RPC writes an audit record.

## Catalog and merchandising

Create products and variants only through the safe draft forms. New records start inactive with zero inventory and `unverified_catalog`; they cannot enter the public storefront. Add real media, SKU, price, verified warehouse stock and publishing metadata before activation. Collections, coupons and tax rules are managed from the control center. Never publish a concept image or invented model/price.

## Inventory

Use warehouse stock movements or the CSV workflow. CSV imports require validation and preview, apply atomically and can roll back only when the affected stock has not changed after import. Ready to Ship additionally requires a verified Libya warehouse and positive available variant stock.

## Orders, quotes and payments

Use only allowed state transitions. Prices are derived server-side. Quote totals are `Subtotal + Shipping + Tax - Discount`. Record every payment/refund as an append-only ledger event. `amount_due_now` is the current collection request; `outstanding_balance` remains non-zero until verified payment.

## Shipments

Create one or more shipment records for an order, choose a carrier and tracking number, and advance only through the shipment state machine. Delivery writes `delivered_at`, updates fulfillment and queues a customer notification. Shipment items support partial fulfillment.

## B2B

Manage suppliers, purchase orders, contracts, signatures, invoices, payment proofs, reorders, project messages and Team Locker stores. Files must use private quarantine upload; do not accept arbitrary public proof URLs.

## Media and content

Every upload enters private quarantine. Public visibility is blocked until the scan status is `clean`. Add bilingual alt text before publishing. Home sections, Our Work, policies and translation overrides remain hidden when their `enabled` flag is false.

## Notifications and security

Review failed outbox jobs and retry the existing event rather than creating duplicates. Resolve security events only after investigation. Repeated failures require provider/configuration correction, not unlimited retry.

## Returns

The window starts from `delivered_at`. The database aggregates pending, approved, received, returned and refunded quantities across every request and rejects cumulative over-returns. Custom goods require a documented manufacturing defect.
