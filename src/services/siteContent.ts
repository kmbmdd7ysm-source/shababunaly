import { getSupabase } from './supabase.js';

export async function fetchSiteContent(
  contentKey: string,
): Promise<Record<string, unknown> | null> {
  const client = await getSupabase();
  if (!client) return null;
  const { data, error } = await client
    .from('site_content')
    .select('content_value,updated_at')
    .eq('content_key', contentKey)
    .eq('public_read', true)
    .maybeSingle();
  if (error) throw error;
  const value = data?.content_value;
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}
