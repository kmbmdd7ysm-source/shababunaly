/** Canonical Formspree endpoint — must match src/config/integrations.ts */
export const FORMSPREE_CANONICAL_ENDPOINT = 'https://formspree.io/f/mqerbqvd';

export function resolveFormspreeEndpoint() {
  const fromOrder = String(process.env.FORMSPREE_ORDER_ENDPOINT || '').trim();
  if (fromOrder) return fromOrder;
  const fromVite = String(process.env.VITE_FORM_ENDPOINT || process.env.FORMSPREE_ENDPOINT || '').trim();
  if (fromVite) return fromVite;
  return FORMSPREE_CANONICAL_ENDPOINT;
}
