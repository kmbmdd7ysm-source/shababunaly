# Special Requests

Route: `/special-request`

Customers can identify a missing product with a valid HTTP/HTTPS product URL, a product image, or both. The form collects identity/contact fields, country, description, optional brand, quantity, size, color, target budget, required date, extra files, preferred contact method and consent.

## Workflow

1. Public API validates origin, rate limit, honeypot, bot token and idempotency key.
2. File signatures, MIME type, extension, size and count are checked. SVG and executable files are denied.
3. The trusted RPC creates a unique request number and prevents duplicate creation.
4. Files are stored in the private `special-request-quarantine` bucket.
5. A structured administration notification enters the notification outbox.
6. Authenticated customers see their requests in Account.
7. Authorized staff manage them from Operations.
8. Staff can add product cost, shipping cost, arrival estimate, notes and a payment link.
9. Customers can accept or decline a valid quote.

## States

`submitted`, `under_review`, `more_information_required`, `quoted`, `awaiting_customer`, `awaiting_payment`, `ordered`, `unavailable`, `rejected`, `closed`.

Transitions are handled by trusted database functions. Direct customer updates to staff fields are not granted.

## File security

Files remain quarantined with a scan state. The validation layer checks both declared metadata and magic bytes. A production malware scanner must be connected before staff distribute or publish customer files. Do not render untrusted SVG inline and never execute uploaded content.

## Operations

Operations users can filter requests, inspect customer details, update status and quote data, and review the customer decision. All access remains subject to RLS and staff permission checks.
