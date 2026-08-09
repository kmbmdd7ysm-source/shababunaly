/*
 * SHABABUNA identity assets.
 *
 * The `mark` and `fullLockup` entries previously pointed at artwork containing a
 * reproduction of the NBA Logoman. That artwork is quarantined under
 * public/brand/quarantine/ and is no longer referenced anywhere.
 *
 * The script wordmark is the only verified original brand asset, so it is what
 * the site displays. Where a square mark is structurally unavoidable — favicon,
 * app icon, structured data — an interim typographic plate stands in. See
 * public/brand/quarantine/README.md.
 */
export const BRAND = {
  name: 'Shababuna',
  nameAr: 'شبابنا',
  slogan: 'BUILT DIFFERENT.',
  colors: {
    black: '#050505',
    white: '#ffffff',
    ready: '#18a558',
  },
  wordmark: {
    en: {
      black: '/brand/shababuna-wordmark-black.png',
      white: '/brand/shababuna-wordmark-white.png',
    },
    ar: {
      black: '/brand/shababuna-wordmark-ar-black.png',
      white: '/brand/shababuna-wordmark-ar-white.png',
    },
  },
  /* No verified full lockup exists. Consumers fall back to the wordmark. */
  fullLockup: {
    en: {
      black: '/brand/shababuna-wordmark-black.png',
      white: '/brand/shababuna-wordmark-white.png',
    },
    ar: {
      black: '/brand/shababuna-wordmark-ar-black.png',
      white: '/brand/shababuna-wordmark-ar-white.png',
    },
  },
  /* Interim typographic plate. Not the identity — awaiting a designed symbol. */
  mark: {
    black: '/brand/shababuna-monogram.svg',
    white: '/brand/shababuna-monogram.svg',
  },
  social: '/brand/shababuna-social.png',
};
