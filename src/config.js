// SHABABUNA — central public site configuration.
export const SITE = {
  name: 'Shababuna',
  nameAr: 'شبابنا',
  shortName: 'SHABABUNA',
  slogan: { en: 'BUILT DIFFERENT.', ar: 'BUILT DIFFERENT.' },
  domain: 'https://shababuna.ly',

  // Interim typographic plate; the previous mark reproduced the NBA Logoman
  // and is quarantined. See public/brand/quarantine/README.md.
  logo: '/brand/shababuna-monogram.svg',
  logoLight: '/brand/shababuna-monogram.svg',
  wordmark: '/brand/shababuna-wordmark-black.png',
  wordmarkLight: '/brand/shababuna-wordmark-white.png',
  wordmarkAr: '/brand/shababuna-wordmark-ar-black.png',
  wordmarkArLight: '/brand/shababuna-wordmark-ar-white.png',
  defaultOg: '/brand/shababuna-social.png',

  email: 'shababuna.info@gmail.com',
  emailLink: 'mailto:shababuna.info@gmail.com',
  phone: '+218 92 657 8062',
  whatsapp: '218926578062',
  address: { en: 'Tripoli, Libya', ar: 'طرابلس، ليبيا' },
  hours: { en: '', ar: '' },
  mapLink: '',

  social: {
    instagram: 'https://www.instagram.com/shababuna.ly',
    facebook: '',
    tiktok: 'https://www.tiktok.com/@shababuna.ly',
    youtube: '',
  },

  currency: 'USD',
  currencySymbol: '$',
  locale: { en: 'en-US', ar: 'ar-LY' },
  legalUpdated: { en: 'July 31, 2026', ar: '31 يوليو 2026' },
};

export const STORAGE_KEYS = {
  language: 'shababuna-language',
  cart: 'shababuna-cart',
  consent: 'shababuna-cookie-consent',
  recentlyViewed: 'shababuna-recently-viewed',
  wishlist: 'shababuna-wishlist',
  compare: 'shababuna-compare',
  welcome: 'shababuna-commerce-welcome-v1',
};
