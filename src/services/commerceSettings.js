import { getSupabase } from './supabase';

export function validateUsdToLydRate(value) {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('invalid_exchange_rate');
  return rate;
}

export async function fetchUsdToLydRate() {
  const supabase = await getSupabase();
  if (!supabase) throw new Error('commerce_settings_unavailable');
  const { data, error } = await supabase.rpc('get_public_commerce_settings');
  if (error) throw error;
  return validateUsdToLydRate(data?.usd_to_lyd_rate);
}


export async function fetchPublicShippingRates() {
  const supabase = await getSupabase();
  if (!supabase) return {};
  const { data, error } = await supabase.rpc('get_public_shipping_rates');
  if (error) throw error;
  const source = data && typeof data === 'object' ? data : {};
  return Object.fromEntries(Object.entries(source).flatMap(([code, value]) => {
    const rate = Number(value);
    return /^[A-Z]{2}$/.test(String(code).toUpperCase()) && Number.isFinite(rate) && rate >= 0
      ? [[String(code).toUpperCase(), rate]] : [];
  }));
}
