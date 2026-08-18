# External Inputs Still Required

These are the known items that cannot be truthfully completed from the supplied ZIP alone. Runtime/source gates fail closed around them.

1. Approved retail prices for the **10 LHA products** whose owner source currently contains `price: 0`. Their inventory/media remain visible, but they are quote-only and server-side checkout rejects them until a positive approved price exists.
2. A registry-connected clean dependency install and fresh Vite/TypeScript/ESLint/Vitest/browser/Lighthouse/Axe/SBOM run.
3. A live isolated Supabase environment for database/RLS, storage, cross-device auth/order/tracking and three clean evidence runs.
4. Production payment-provider and Libyan-card provider credentials/docs plus webhook, 3DS, retrieve, refund, fraud and reconciliation evidence.
5. Current Formspree mailbox/delivery evidence for the server-side notification fallback.
6. Production malware-scanner credentials/evidence for the full quarantine pipeline.
7. Legal e-signature provider sandbox/production evidence where external signature is enabled.
8. Missing supplier/commercial metadata and final real media for catalogue products; 44 incomplete masters remain hidden and catalogue completeness remains 0/75.
9. Real multi-angle/360/3D product assets needed to move Product Viewer beyond the current A0/B0/C23/D52 matrix.
10. First-party licensed copies of the 13 hero MP4/WebM films if hero playback must survive removal from the current external source.
11. Manufacturer-issued capability/MOQ/lead-time/material/QC/shipping evidence and approval for Custom production.
12. Human Arabic commercial/legal/RTL review and human approval of the current visual baselines.
