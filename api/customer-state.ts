import { applyApiHeaders, guardPublicPost } from './_request-security.js';
import { mutateBlobJson, readBlobJson } from './_blob-store.js';
import { sessionFromRequest, userStatePath } from './_customer-session.js';

type ApiReq = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};
type ApiRes = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => { json: (body: unknown) => unknown };
};

type CustomerState = Record<string, unknown> & {
  user_id?: string;
  cart?: unknown[];
  wishlist?: unknown[];
  compare?: unknown[];
  recently_viewed?: unknown[];
  preferences?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  version?: number;
  updated_at?: string;
};

const emptyState = (userId: string): CustomerState => ({
  user_id: userId,
  cart: [],
  wishlist: [],
  compare: [],
  recently_viewed: [],
  preferences: {},
  profile: {},
  version: 0,
  updated_at: new Date(0).toISOString(),
});

const objectValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const arrayValue = (value: unknown, max = 300): unknown[] =>
  Array.isArray(value) ? value.slice(0, max) : [];

function sanitizeProfile(value: unknown): Record<string, unknown> {
  const source = objectValue(value);
  const accountType =
    String(source.accountType ?? source.account_type ?? 'customer') === 'organization'
      ? 'organization'
      : 'customer';
  return {
    first_name: String(source.firstName ?? source.first_name ?? '').trim().slice(0, 80),
    last_name: String(source.lastName ?? source.last_name ?? '').trim().slice(0, 80),
    display_name: String(source.displayName ?? source.display_name ?? '').trim().slice(0, 120),
    avatar_url: String(source.avatarUrl ?? source.avatar_url ?? '').trim().slice(0, 2_000_000),
    phone: String(source.phone ?? '').trim().slice(0, 40),
    account_type: accountType,
    organization_name:
      accountType === 'organization'
        ? String(source.organizationName ?? source.organization_name ?? '').trim().slice(0, 160)
        : '',
    organization_type:
      accountType === 'organization'
        ? String(source.organizationType ?? source.organization_type ?? 'club').trim().slice(0, 60)
        : '',
    preferred_language: String(source.preferredLanguage ?? source.preferred_language ?? 'en')
      .trim()
      .slice(0, 10),
    preferred_currency: String(source.preferredCurrency ?? source.preferred_currency ?? 'USD')
      .trim()
      .toUpperCase()
      .slice(0, 8),
    preferred_country: String(source.preferredCountry ?? source.preferred_country ?? 'LY')
      .trim()
      .toUpperCase()
      .slice(0, 2),
    preferred_size: String(source.preferredSize ?? source.preferred_size ?? '').trim().slice(0, 30),
    preferred_colors: arrayValue(source.preferredColors ?? source.preferred_colors, 40),
    preferred_categories: arrayValue(source.preferredCategories ?? source.preferred_categories, 80),
    marketing_consent: Boolean(source.marketingConsent ?? source.marketing_consent),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req: ApiReq, res: ApiRes) {
  applyApiHeaders(res);
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const session = sessionFromRequest(req);
  if (!session) return res.status(401).json({ ok: false, error: 'authentication_required' });
  const pathname = userStatePath(session.id);

  if (req.method === 'GET') {
    try {
      const { value } = await readBlobJson<CustomerState>(pathname);
      return res.status(200).json({ ok: true, state: value || emptyState(session.id) });
    } catch {
      return res.status(503).json({ ok: false, error: 'customer_state_unavailable' });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (
    !(await guardPublicPost(req, res, {
      maxBytes: 2_500_000,
      limit: 60,
      windowMs: 10 * 60_000,
      bucket: 'customer-state',
      honeypot: false,
      allowEphemeralFallback: true,
    }))
  ) return;

  try {
    const body = objectValue(req.body);
    const action = String(body.action || 'state').trim().toLowerCase();
    const next = await mutateBlobJson<CustomerState>(
      pathname,
      emptyState(session.id),
      (current) => {
        const base = { ...emptyState(session.id), ...current, user_id: session.id };
        if (action === 'profile') {
          return {
            ...base,
            profile: {
              ...objectValue(base.profile),
              ...sanitizeProfile(body.profile),
            },
            updated_at: new Date().toISOString(),
          };
        }
        if (action === 'preferences') {
          const preferences = objectValue(body.preferences);
          return {
            ...base,
            profile: {
              ...objectValue(base.profile),
              ...(preferences.preferredCurrency
                ? { preferred_currency: String(preferences.preferredCurrency).toUpperCase().slice(0, 8) }
                : {}),
              ...(preferences.preferredCountry
                ? { preferred_country: String(preferences.preferredCountry).toUpperCase().slice(0, 2) }
                : {}),
              updated_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          };
        }
        const state = objectValue(body.state);
        const currentPreferences = objectValue(base.preferences);
        const incomingPreferences = objectValue(state.preferences);
        return {
          ...base,
          cart: arrayValue(state.cart, 200),
          wishlist: arrayValue(state.wishlist, 500),
          compare: arrayValue(state.compare, 20),
          recently_viewed: arrayValue(state.recentlyViewed ?? state.recently_viewed, 100),
          preferences: { ...currentPreferences, ...incomingPreferences },
          version: Math.max(Number(base.version || 0), Number(state.version || 0)),
          updated_at: new Date().toISOString(),
        };
      },
    );
    return res.status(200).json({ ok: true, state: next });
  } catch {
    return res.status(503).json({ ok: false, error: 'customer_state_unavailable' });
  }
}
