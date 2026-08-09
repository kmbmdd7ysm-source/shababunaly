import { getSupabase } from './supabase';

export async function fetchSiteContent(contentKey) {
  const client = await getSupabase();
  if (!client) return null;
  const { data, error } = await client
    .from('site_content')
    .select('content_value,updated_at')
    .eq('content_key', contentKey)
    .eq('public_read', true)
    .maybeSingle();
  if (error) throw error;
  return data?.content_value && typeof data.content_value === 'object' ? data.content_value : null;
}
