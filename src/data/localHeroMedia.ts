/**
 * Runtime hero media.
 *
 * The player is always the native HTML <video> element. These are direct MP4
 * renditions on Under Armour's official Dynamic Media host, so the UI has no
 * Third-party player chrome is not used; muted autoplay behaves like a normal site hero.
 *
 * IMPORTANT: these direct MP4s are still externally hosted. A future licensed
 * self-hosted delivery can replace only the URLs below without changing any page.
 */
const OFFICIAL_MP4 = {
  curry13: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6007670-419',
  curry12DubNation: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3027630-001',
  lockdown7Low: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3027646-600',
  fox2Sharpie: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6017491-100',
  jet25: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6001587-102',
  fox2Buzzer: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6012728-001',
  curry3z24: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3027627-004',
  curry12Wardell: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3027634-001',
  currySplash25: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3028459-016',
  fox2Blue: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6000777-400',
  curry13GradeSchool: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6014870-419',
  lockdown8Patches: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6015212-361',
  curry12Team: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6000736-103',
} as const;

const entry = (video: string, poster: string) => ({
  desktopVideo: video,
  mobileVideo: video,
  desktopPoster: poster,
  mobilePoster: poster,
});

export const LOCAL_HERO_MEDIA = {
  home: entry(OFFICIAL_MP4.curry13, '/media/hero-posters/home.webp'),
  shop: entry(OFFICIAL_MP4.curry12DubNation, '/media/hero-posters/shop.webp'),
  footwear: entry(OFFICIAL_MP4.lockdown7Low, '/media/hero-posters/footwear.webp'),
  clothing: entry(OFFICIAL_MP4.fox2Sharpie, '/media/hero-posters/clothing.webp'),
  accessories: entry(OFFICIAL_MP4.jet25, '/media/hero-posters/accessories.webp'),
  basketballs: entry(OFFICIAL_MP4.fox2Buzzer, '/media/hero-posters/basketballs.webp'),
  equipment: entry(OFFICIAL_MP4.curry3z24, '/media/hero-posters/equipment.webp'),
  shoeFinder: entry(OFFICIAL_MP4.curry12Wardell, '/media/hero-posters/shoe-finder.webp'),
  custom: entry(OFFICIAL_MP4.currySplash25, '/media/hero-posters/custom.webp'),
  discover: entry(OFFICIAL_MP4.fox2Blue, '/media/hero-posters/discover.webp'),
  teams: entry(OFFICIAL_MP4.curry13GradeSchool, '/media/hero-posters/teams.webp'),
  stories: entry(OFFICIAL_MP4.lockdown8Patches, '/media/hero-posters/stories.webp'),
  releases: entry(OFFICIAL_MP4.curry12Team, '/media/hero-posters/releases.webp'),
} as const;
