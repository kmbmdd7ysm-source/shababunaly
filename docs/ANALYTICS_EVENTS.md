# Consent-gated analytics

All events use `src/utils/analytics.js`. Providers initialize only after analytics consent. Payload sanitization removes keys containing password, address, email, phone, token or secret; strings are truncated and email/phone patterns are masked.

Supported event families cover page views, product views, gallery/media interaction, variant selection, add/remove cart, quantity changes, favorites, comparison, search, filters, sorting, recommendations, Ready to Ship discovery, custom-design starts, quote requests, wholesale enquiries, newsletter submissions, language/currency changes, PWA events, authentication completion, profile updates, sync errors, connectivity state and checkout starts.

Clarity must mask every input and exclude account, authentication, address, password-reset and checkout-sensitive routes. Consent withdrawal removes provider loaders and disables future events. Provider-side deletion or retention requirements remain an administrator responsibility.
