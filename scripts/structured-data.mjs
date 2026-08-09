import { SITE } from '../src/config.ts';

export function createHomeSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Organization', 'OnlineStore'],
        name: SITE.name,
        alternateName: SITE.shortName,
        url: SITE.domain,
        logo: `${SITE.domain}${SITE.logo}`,
        description: 'Basketball retail, custom manufacturing, team supply and wholesale.',
        areaServed: 'Worldwide',
        ...(SITE.email ? { email: SITE.email } : {}),
        ...(Object.values(SITE.social).some(Boolean)
          ? { sameAs: Object.values(SITE.social).filter(Boolean) }
          : {}),
      },
      {
        '@type': 'WebSite',
        name: SITE.name,
        url: SITE.domain,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE.domain}/search?q={query}`,
          'query-input': 'required name=query',
        },
      },
    ],
  };
}

export function createProductSchema(product) {
  if (!product || product.quoteOnly) return null;
  const en = (value) => (value && typeof value === 'object' ? (value.en ?? '') : (value ?? ''));
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: en(product.name),
    description: en(product.description),
    sku: product.sku,
    image: product.image.startsWith('http') ? product.image : `${SITE.domain}${product.image}`,
    brand: { '@type': 'Brand', name: product.brand || SITE.name },
    offers: {
      '@type': 'Offer',
      priceCurrency: product.currency || SITE.currency,
      price: Number(product.price).toFixed(2),
      availability:
        product.availability === 'sold-out'
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
      url: `${SITE.domain}/products/${product.slug}`,
    },
  };
}

export const serializeStructuredData = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
