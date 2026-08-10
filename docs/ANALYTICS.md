# Analytics and heatmaps

Set `VITE_GA_MEASUREMENT_ID` and optionally `VITE_CLARITY_PROJECT_ID`.
Providers load only after analytics consent. Withdrawal disables providers and removes loader scripts. Never include email, phone, address, passwords, checkout fields, or other private form values in event payloads.
Central event API: `src/utils/analytics.js`.
