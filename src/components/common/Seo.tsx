import { Helmet } from 'react-helmet-async';
import { SITE } from '../../config.ts';
import { useLanguage } from '../../context/LanguageContext';

type SeoProps = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: string;
  noindex?: boolean;
};

export default function Seo({
  title = '',
  description = '',
  path = '/',
  image = SITE.defaultOg,
  type = 'website',
  noindex = false,
}: SeoProps) {
  const { lang } = useLanguage();
  const canonical = `${SITE.domain}${path === '/' ? '' : path}`;
  const absoluteImage = image?.startsWith('http') ? image : `${SITE.domain}${image}`;
  const fullTitle =
    title?.includes(SITE.name) || title?.includes(SITE.nameAr) ? title : `${title} | ${SITE.name}`;
  return (
    <Helmet htmlAttributes={{ lang, dir: lang === 'ar' ? 'rtl' : 'ltr' }}>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta
        name="robots"
        content={noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}
      />
      <link rel="canonical" href={canonical} />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:locale" content={lang === 'ar' ? 'ar_AR' : 'en_US'} />
      <meta property="og:locale:alternate" content={lang === 'ar' ? 'en_US' : 'ar_AR'} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
    </Helmet>
  );
}

export function organizationSchema(): Array<Record<string, unknown>> {
  const schema: Array<Record<string, unknown>> = [
    {
      '@context': 'https://schema.org',
      '@type': ['Organization', 'OnlineStore'],
      name: SITE.name,
      alternateName: SITE.shortName,
      url: SITE.domain,
      logo: `${SITE.domain}${SITE.logo}`,
      description: 'Basketball retail, custom manufacturing, team supply and wholesale.',
      areaServed: 'Worldwide',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE.name,
      url: SITE.domain,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE.domain}/search?q={query}`,
        'query-input': 'required name=query',
      },
    },
  ];
  const organization = schema[0];
  if (organization && SITE.email) organization.email = SITE.email;
  const sameAs = Object.values(SITE.social).filter(Boolean);
  if (organization && sameAs.length) organization.sameAs = sameAs;
  return schema;
}
