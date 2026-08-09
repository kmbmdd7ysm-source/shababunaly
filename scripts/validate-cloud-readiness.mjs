import fs from 'node:fs';
import path from 'node:path';

const required = [
  'supabase/migrations/20260718010000_trusted_catalog_transactional_orders.sql',
  'supabase/migrations/20260718020000_atomic_inventory_reservation.sql',
  'supabase/migrations/20260731020000_shababuna_global_commerce.sql',
  'supabase/migrations/20260731030000_shababuna_product_catalog.sql',
  'supabase/migrations/20260731050000_shababuna_final_hardening.sql',
  'supabase/migrations/20260731060000_shababuna_returns_refunds.sql',
  'supabase/migrations/20260731070000_shababuna_operational_resilience.sql',
  'supabase/functions/create-order/index.ts',
  'supabase/functions/create-guest-order/index.ts',
  'supabase/functions/lookup-guest-order/index.ts',
  'scripts/sync-product-catalog.mjs',
  'supabase/generated/product_catalog.sql',
  'api/create-session.ts',
  'api/create-quote-session.ts',
  'api/payment-webhook.js',
  'api/notification-worker.js',
  'api/guest-order-access.ts',
  'api/retry-order-payment.js',
  'api/public-quote-request.js',
  'docs/ORDER_BACKEND_DEPLOYMENT.md',
  'docs/PRODUCTION_ACTIVATION.md',
];
const errors = [];
for (const file of required) if (!fs.existsSync(file)) errors.push(`Missing ${file}`);

const baseMigration = fs.readFileSync(required[0], 'utf8').toLowerCase();
for (const token of [
  'create table if not exists public.product_catalog',
  'create_order_transactional',
  'security definer set search_path',
  'revoke insert, update, delete on public.orders',
  'consume_edge_rate_limit',
])
  if (!baseMigration.includes(token.toLowerCase())) errors.push(`Base migration missing: ${token}`);

const atomic = fs.readFileSync(required[1], 'utf8').toLowerCase();
for (const token of [
  'inventory_tracking boolean not null default true',
  'for update',
  'inventory_quantity = pc.inventory_quantity - requested.quantity',
  'v_updated_count <> v_tracked_count',
]) {
  if (!atomic.includes(token.toLowerCase()))
    errors.push(`Atomic inventory migration missing: ${token}`);
}

const commerce = fs
  .readFileSync('supabase/migrations/20260731020000_shababuna_global_commerce.sql', 'utf8')
  .toLowerCase();
for (const token of [
  "values ('usd_to_lyd_rate', 9)",
  "v_order_number := 'shb-'",
  'invalid_wholesale_quantity',
  'invalid_custom_quantity',
  "v_shipping_country <> 'ly' or v_has_large_equipment",
  '500.00 / v_usd_to_lyd_rate',
  '20.00 / v_usd_to_lyd_rate',
  "v_payment_plan := 'half'",
  "v_payment_plan := 'pending_shipping_quote'",
])
  if (!commerce.includes(token)) errors.push(`Shababuna commerce migration missing: ${token}`);

const generated = fs.readFileSync('supabase/generated/product_catalog.sql', 'utf8');
if (!generated.includes('on conflict(variant_id) do update'))
  errors.push('Catalog sync is not deterministic/upserting');
if (!generated.includes("product_status='archived'"))
  errors.push('Catalog sync does not archive removed variants');
if (!generated.includes('"wholesalePrice"'))
  errors.push('Catalog metadata does not include wholesale prices');
if (!generated.includes('"minimumOrder"'))
  errors.push('Catalog metadata does not include custom minimums');

const paymentApi = fs.readFileSync('api/create-session.ts', 'utf8');
for (const token of [
  'SUPABASE_SERVICE_ROLE_KEY',
  'loadTrustedOrder',
  'order_not_payable',
  'amountMinor',
  'shipping_quote_required',
]) {
  if (!paymentApi.includes(token)) errors.push(`Payment session security missing: ${token}`);
}
if (/\.\.\.body/.test(paymentApi)) errors.push('Payment endpoint forwards untrusted browser body');

const frontendFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(?:js|jsx|mjs|ts|tsx)$/.test(entry.name)) frontendFiles.push(file);
  }
}
walk('src');
for (const file of frontendFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (/SUPABASE_SERVICE_ROLE_KEY|service[_-]?role/i.test(text))
    errors.push(`Server secret reference in frontend: ${file}`);
}

const env = fs.readFileSync('.env.example', 'utf8');
for (const name of [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VITE_CHECKOUT_API_BASE',
  'PAYMENTS_SESSION_URL',
  'LIBYAN_BANK_CARD_SESSION_URL',
  'PAYMENTS_WEBHOOK_SECRET',
  'LIBYAN_BANK_CARD_WEBHOOK_SECRET',
  'CRON_SECRET',
  'GUEST_ORDER_ACCESS_SECRET',
  'SITE_URL',
  'MALWARE_SCAN_API_URL',
  'MALWARE_SCAN_API_KEY',
  'VITE_TURNSTILE_SITE_KEY',
  'TURNSTILE_SECRET_KEY',
])
  if (!env.includes(name)) errors.push(`Undocumented environment variable: ${name}`);

const checkout = fs.readFileSync('src/pages/CheckoutPage.jsx', 'utf8');
const saveIndex = checkout.indexOf('const confirmation = await savePendingOrder(payload)');
const sessionIndex = checkout.indexOf('createCheckoutSession({', saveIndex);
if (saveIndex < 0 || sessionIndex < saveIndex)
  errors.push('Checkout does not save a trusted order before opening card payment');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.info(
  'Cloud source-readiness validation passed: trusted catalogue, atomic inventory, shipping/payment rules, secure order-first checkout and deployment documentation are present. This is not a live cloud verification.',
);
