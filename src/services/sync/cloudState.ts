type Row = Record<string, unknown>;

async function requestState(
  method: 'GET' | 'POST' = 'GET',
  body?: Row,
): Promise<Row | null> {
  const response = await fetch('/api/customer-state', {
    method,
    credentials: 'same-origin',
    headers:
      method === 'POST'
        ? { 'Content-Type': 'application/json', Accept: 'application/json' }
        : { Accept: 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });
  if (response.status === 401) return null;
  const data = (await response.json().catch(() => ({}))) as Row;
  if (!response.ok) throw new Error(String(data.error || `customer_state_${response.status}`));
  return data;
}

export async function fetchCloudState(userId: string | null | undefined): Promise<unknown> {
  if (!userId) return null;
  const data = await requestState('GET');
  return (data?.state as Row | undefined) || null;
}

export async function upsertCloudState(
  userId: string | null | undefined,
  state: Record<string, unknown>,
): Promise<unknown> {
  if (!userId) return null;
  const data = await requestState('POST', { action: 'state', state });
  return (data?.state as Row | undefined) || null;
}

export async function fetchProfile(userId: string | null | undefined): Promise<unknown> {
  if (!userId) return null;
  const data = await requestState('GET');
  const state = (data?.state || {}) as Row;
  return (state.profile as Row | undefined) || null;
}

export async function upsertProfile(
  userId: string | null | undefined,
  profile: Record<string, unknown>,
): Promise<unknown> {
  if (!userId) return null;
  const data = await requestState('POST', { action: 'profile', profile });
  const state = (data?.state || {}) as Row;
  return (state.profile as Row | undefined) || null;
}

export async function fetchCommercePreferences(
  userId: string | null | undefined,
): Promise<unknown> {
  if (!userId) return null;
  const profile = (await fetchProfile(userId)) as Row | null;
  if (!profile) return null;
  return {
    preferred_currency: profile.preferred_currency || 'USD',
    preferred_country: profile.preferred_country || 'LY',
    updated_at: profile.updated_at || null,
  };
}

export async function updateCommercePreferences(
  userId: string | null | undefined,
  preferences: {
    preferredCurrency?: string;
    preferredCountry?: string;
  },
): Promise<unknown> {
  if (!userId) return null;
  const data = await requestState('POST', {
    action: 'preferences',
    preferences,
  });
  const state = (data?.state || {}) as Row;
  const profile = (state.profile || {}) as Row;
  return {
    preferred_currency: profile.preferred_currency || 'USD',
    preferred_country: profile.preferred_country || 'LY',
    updated_at: profile.updated_at || null,
  };
}
