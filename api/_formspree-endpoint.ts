/** Owner-confirmed canonical Formspree endpoint for every customer-facing notification. */
export const FORMSPREE_CANONICAL_ENDPOINT = 'https://formspree.io/f/mvzenjgv';

export function resolveFormspreeEndpoint(): string {
  return FORMSPREE_CANONICAL_ENDPOINT;
}
