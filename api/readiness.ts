import { applyApiHeaders } from './_request-security.ts';

const clean = (value: unknown, max = 2000): string =>
  String(value ?? '')
    .trim()
    .slice(0, max);
const validHttps = (value: unknown): boolean => {
  try {
    return new URL(clean(value)).protocol === 'https:';
  } catch {
    return false;
  }
};
const productionMode = (): boolean =>
  process.env.NODE_ENV === 'production' || process.env.REQUIRE_PRODUCTION_READINESS === 'true';
const recentEvidence = (value: unknown, maxAgeHours = 168): boolean => {
  const timestamp = Date.parse(clean(value, 100));
  return (
    Number.isFinite(timestamp) &&
    timestamp <= Date.now() &&
    Date.now() - timestamp <= maxAgeHours * 60 * 60 * 1000
  );
};

export function requiredEnvironment(): Record<string, unknown> {
  const formEndpoint = clean(
    process.env.VITE_FORM_ENDPOINT || process.env.FORMSPREE_ENDPOINT,
    1000,
  );
  return {
    site_url: validHttps(process.env.SITE_URL),
    supabase_url: validHttps(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    supabase_service_role: Boolean(clean(process.env.SUPABASE_SERVICE_ROLE_KEY, 5000)),
    supabase_public_key: Boolean(
      clean(
        process.env.VITE_SUPABASE_ANON_KEY ||
          process.env.SUPABASE_ANON_KEY ||
          process.env.SUPABASE_PUBLISHABLE_KEY,
        5000,
      ),
    ),
    formspree: /^https:\/\/formspree\.io\/f\/[A-Za-z0-9_-]+$/u.test(formEndpoint),
    formspree_delivery_evidence:
      recentEvidence(process.env.FORMSPREE_DELIVERY_VERIFIED_AT) &&
      clean(process.env.FORMSPREE_DELIVERY_EVIDENCE_ID, 500).length >= 8,
    turnstile_secret: Boolean(clean(process.env.TURNSTILE_SECRET_KEY, 5000)),
    turnstile_site_key: Boolean(clean(process.env.VITE_TURNSTILE_SITE_KEY, 5000)),
    cron_secret: clean(process.env.CRON_SECRET, 5000).length >= 24,
    rate_limit_salt: clean(process.env.EDGE_RATE_LIMIT_SALT, 5000).length >= 24,
    guest_order_access_secret:
      clean(process.env.GUEST_ORDER_ACCESS_SECRET || process.env.CRON_SECRET, 5000).length >= 32,
  };
}

export function optionalCapabilities() {
  const onlineCard =
    validHttps(process.env.PAYMENTS_SESSION_URL) &&
    Boolean(clean(process.env.PAYMENTS_SECRET_KEY, 5000)) &&
    Boolean(clean(process.env.PAYMENTS_PROVIDER, 200));
  const libyanCard =
    validHttps(process.env.LIBYAN_BANK_CARD_SESSION_URL) &&
    Boolean(clean(process.env.LIBYAN_BANK_CARD_SECRET_KEY, 5000)) &&
    Boolean(clean(process.env.LIBYAN_BANK_CARD_PROVIDER, 200));
  const malwareScan =
    validHttps(process.env.MALWARE_SCAN_API_URL || process.env.MALWARE_SCAN_ENDPOINT) &&
    Boolean(clean(process.env.MALWARE_SCAN_API_KEY, 5000)) &&
    Boolean(clean(process.env.MALWARE_SCAN_PROVIDER, 200));
  const monitoring =
    validHttps(process.env.ERROR_MONITORING_INGEST_URL) ||
    Boolean(clean(process.env.VITE_SENTRY_DSN, 2000));
  const signature =
    validHttps(process.env.SIGNATURE_CREATE_ENVELOPE_URL || process.env.SIGNATURE_API_URL) &&
    Boolean(clean(process.env.SIGNATURE_PROVIDER, 200)) &&
    clean(process.env.SIGNATURE_WEBHOOK_SECRET, 5000).length >= 24;
  return {
    online_card: onlineCard,
    libyan_bank_card: libyanCard,
    malware_scan: malwareScan,
    signature,
    monitoring,
  };
}

export function publicProviderMetadata() {
  return {
    environment: clean(
      process.env.DEPLOYMENT_ENVIRONMENT ||
        process.env.VERCEL_ENV ||
        process.env.NODE_ENV ||
        'unknown',
      50,
    ),
    payment: clean(process.env.PAYMENTS_PROVIDER, 100) || null,
    libyanBankCard: clean(process.env.LIBYAN_BANK_CARD_PROVIDER, 100) || null,
    malwareScanner: clean(process.env.MALWARE_SCAN_PROVIDER, 100) || null,
    signature: clean(process.env.SIGNATURE_PROVIDER, 100) || null,
  };
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3500) {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(Number(timeoutMs)),
    cache: 'no-store',
    redirect: 'error',
  });
}

export async function connectivityChecks(required: Record<string, unknown> = requiredEnvironment()) {
  const requestedSkip = process.env.READINESS_SKIP_NETWORK_CHECKS === 'true';
  const skipAllowed = !productionMode() || process.env.ALLOW_READINESS_NETWORK_SKIP === 'true';
  if (requestedSkip && skipAllowed) {
    return {
      supabase_catalog: required.supabase_url && required.supabase_service_role,
      form_endpoint: required.formspree,
      skipped: true,
    };
  }

  let supabaseCatalog = false;
  let formEndpoint = false;
  if (required.supabase_url && required.supabase_service_role) {
    const base = clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, 1000).replace(
      /\/$/,
      '',
    );
    const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY, 5000);
    try {
      const response = await fetchWithTimeout(`${base}/rest/v1/rpc/get_public_product_catalog`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        body: '{}',
      });
      supabaseCatalog = response.ok && Array.isArray(await response.json().catch(() => null));
    } catch {
      supabaseCatalog = false;
    }
  }

  if (required.formspree) {
    const endpoint = clean(process.env.VITE_FORM_ENDPOINT || process.env.FORMSPREE_ENDPOINT, 1000);
    try {
      const response = await fetchWithTimeout(
        endpoint,
        { method: 'HEAD', headers: { Accept: 'application/json' } },
        2500,
      );
      formEndpoint = response.ok || (response.status >= 400 && response.status < 500);
    } catch {
      formEndpoint = false;
    }
  }

  return { supabase_catalog: supabaseCatalog, form_endpoint: formEndpoint, skipped: false };
}

export function featureReadiness(
  required: Record<string, unknown> = requiredEnvironment(),
  optional: Record<string, unknown> = optionalCapabilities() as Record<string, unknown>,
  connectivity: Record<string, unknown> = {},
) {
  const accountCloud =
    required.supabase_url &&
    required.supabase_service_role &&
    required.supabase_public_key &&
    connectivity.supabase_catalog !== false;
  const publicForms =
    required.formspree &&
    required.formspree_delivery_evidence &&
    required.turnstile_secret &&
    required.turnstile_site_key &&
    required.rate_limit_salt &&
    connectivity.form_endpoint !== false;
  return {
    core_commerce: accountCloud,
    account_cloud: accountCloud,
    public_forms: publicForms,
    notification_outbox:
      accountCloud &&
      required.formspree &&
      required.formspree_delivery_evidence &&
      required.cron_secret,
    special_request_url: accountCloud && required.turnstile_secret && required.rate_limit_salt,
    special_request_uploads:
      accountCloud &&
      required.turnstile_secret &&
      required.rate_limit_salt &&
      optional.malware_scan,
    online_card: accountCloud && optional.online_card,
    libyan_bank_card: accountCloud && optional.libyan_bank_card,
    external_signature: accountCloud && optional.signature,
    monitoring: optional.monitoring,
  };
}

type ApiReq = { method?: string };
type ApiRes = {
  setHeader: (n: string, v: string) => void;
  status: (c: number) => { json: (b: unknown) => unknown; end: () => unknown };
};
export default async function handler(req: ApiReq, res: ApiRes) {
  applyApiHeaders(res);
  if (!['GET', 'HEAD'].includes(String(req.method || ''))) {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  const checks = requiredEnvironment();
  const missing = Object.entries(checks)
    .filter(([, ready]) => !ready)
    .map(([name]) => name);
  const optional = optionalCapabilities();
  const connectivity = await connectivityChecks(checks);
  const features = featureReadiness(checks, optional, connectivity);
  const networkVerified = connectivity.skipped !== true || !productionMode();
  const ready =
    missing.length === 0 &&
    connectivity.supabase_catalog === true &&
    connectivity.form_endpoint === true &&
    networkVerified;
  const payload = {
    ok: true,
    ready,
    required: Object.fromEntries(
      Object.entries(checks).map(([name, value]) => [name, Boolean(value)]),
    ),
    connectivity,
    optionalCapabilities: optional,
    providers: publicProviderMetadata(),
    features,
    checkedAt: new Date().toISOString(),
  };
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  if (req.method === 'HEAD') {
    const head = res.status(ready ? 204 : 503);
    return head.end();
  }
  return res.status(ready ? 200 : 503).json(payload);
}
