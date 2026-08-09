import { getSupabase } from '../supabase.ts';

export async function fetchCloudState(userId: string | null | undefined): Promise<unknown> {
  const s = await getSupabase();
  if (!s || !userId) return null;
  const { data, error } = await s
    .from('user_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertCloudState(
  userId: string | null | undefined,
  state: Record<string, unknown>,
): Promise<unknown> {
  const s = await getSupabase();
  if (!s || !userId) return null;
  const { data: current, error: readError } = await s
    .from('user_state')
    .select('preferences')
    .eq('user_id', userId)
    .maybeSingle();
  if (readError) throw readError;
  const currentRow = (current || {}) as { preferences?: unknown };
  const existingPreferences =
    currentRow.preferences && typeof currentRow.preferences === 'object'
      ? (currentRow.preferences as Record<string, unknown>)
      : {};
  const payload = {
    user_id: userId,
    cart: state.cart || [],
    wishlist: state.wishlist || [],
    compare: state.compare || [],
    recently_viewed: state.recentlyViewed || [],
    preferences: {
      ...existingPreferences,
      ...((state.preferences as Record<string, unknown>) || {}),
    },
    version: Number(state.version || 1),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await s
    .from('user_state')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchProfile(userId: string | null | undefined): Promise<unknown> {
  const s = await getSupabase();
  if (!s || !userId) return null;
  const { data, error } = await s.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProfile(
  userId: string | null | undefined,
  profile: Record<string, unknown>,
): Promise<unknown> {
  const s = await getSupabase();
  if (!s || !userId) return null;
  const accountType = profile.accountType ?? profile.account_type;
  const allowed = {
    id: userId,
    first_name: profile.firstName ?? profile.first_name ?? null,
    last_name: profile.lastName ?? profile.last_name ?? null,
    display_name: profile.displayName ?? profile.display_name ?? null,
    avatar_url: profile.avatarUrl ?? profile.avatar_url ?? null,
    phone: profile.phone ?? null,
    account_type: accountType === 'organization' ? 'organization' : 'customer',
    organization_name:
      accountType === 'organization'
        ? (profile.organizationName ?? profile.organization_name ?? null)
        : null,
    organization_type:
      accountType === 'organization'
        ? (profile.organizationType ?? profile.organization_type ?? 'club')
        : null,
    preferred_language: profile.preferredLanguage || profile.preferred_language || 'en',
    preferred_currency: profile.preferredCurrency || profile.preferred_currency || 'USD',
    preferred_country: profile.preferredCountry || profile.preferred_country || 'LY',
    preferred_size: profile.preferredSize ?? profile.preferred_size ?? null,
    preferred_colors: profile.preferredColors ?? profile.preferred_colors ?? [],
    preferred_categories: profile.preferredCategories ?? profile.preferred_categories ?? [],
    marketing_consent: Boolean(profile.marketingConsent ?? profile.marketing_consent),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await s
    .from('profiles')
    .upsert(allowed, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchCommercePreferences(
  userId: string | null | undefined,
): Promise<unknown> {
  const s = await getSupabase();
  if (!s || !userId) return null;
  const { data, error } = await s
    .from('profiles')
    .select('preferred_currency,preferred_country,updated_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateCommercePreferences(
  userId: string | null | undefined,
  preferences: {
    preferredCurrency?: string;
    preferredCountry?: string;
  },
): Promise<unknown> {
  const s = await getSupabase();
  if (!s || !userId) return null;
  const payload: Record<string, unknown> = { id: userId, updated_at: new Date().toISOString() };
  if (preferences.preferredCurrency) payload.preferred_currency = preferences.preferredCurrency;
  if (preferences.preferredCountry) payload.preferred_country = preferences.preferredCountry;
  const { data, error } = await s
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('preferred_currency,preferred_country,updated_at')
    .single();
  if (error) throw error;
  return data;
}
