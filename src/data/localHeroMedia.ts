/**
 * Hero media runtime map.
 * Local optimized WebP posters provide first paint/fallback. Motion uses direct,
 * official Under Armour Scene7 basketball MP4 sources — never locally generated
 * pseudo-motion/slideshow videos.
 */
const OFFICIAL_BASKETBALL_VIDEO = {
  curry13: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6007670-419',
  curry12DubNation: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3027630-001',
  lockdown7Low: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3027646-600',
  fox2Sharpie: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6017491-100',
  jet25GradeSchool: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6001587-102',
  fox2Buzzer: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6012728-001',
  curry3z24: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3027627-004',
  curry12Wardell: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3027634-001',
  currySplash25: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3028459-016',
  fox2Blue: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6000777-400',
  jet25Unisex: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6001585-100',
  lockdown8: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6009400-100',
} as const;

export const LOCAL_HERO_MEDIA = {
  home: {
    desktopVideo: OFFICIAL_BASKETBALL_VIDEO.curry13,
    mobileVideo: OFFICIAL_BASKETBALL_VIDEO.curry13,
    desktopPoster: '/media/heroes/home-desktop.webp',
    mobilePoster: '/media/heroes/home-mobile.webp',
  },
  shop: {
    desktopVideo: OFFICIAL_BASKETBALL_VIDEO.curry12DubNation,
    mobileVideo: OFFICIAL_BASKETBALL_VIDEO.curry12DubNation,
    desktopPoster: '/media/heroes/shop-desktop.webp',
    mobilePoster: '/media/heroes/shop-mobile.webp',
  },
  footwear: {
    desktopVideo: OFFICIAL_BASKETBALL_VIDEO.lockdown7Low,
    mobileVideo: OFFICIAL_BASKETBALL_VIDEO.lockdown7Low,
    desktopPoster: '/media/heroes/footwear-desktop.webp',
    mobilePoster: '/media/heroes/footwear-mobile.webp',
  },
  clothing: {
    desktopVideo: OFFICIAL_BASKETBALL_VIDEO.fox2Sharpie,
    mobileVideo: OFFICIAL_BASKETBALL_VIDEO.fox2Sharpie,
    desktopPoster: '/media/heroes/clothing-desktop.webp',
    mobilePoster: '/media/heroes/clothing-mobile.webp',
  },
  accessories: {
    desktopVideo: OFFICIAL_BASKETBALL_VIDEO.fox2Blue,
    mobileVideo: OFFICIAL_BASKETBALL_VIDEO.fox2Blue,
    desktopPoster: '/images/products/lha-elite-basketball-backpack-black.webp',
    mobilePoster: '/images/products/lha-elite-basketball-backpack-black.webp',
  },
  basketballs: {
    desktopVideo: OFFICIAL_BASKETBALL_VIDEO.jet25Unisex,
    mobileVideo: OFFICIAL_BASKETBALL_VIDEO.jet25Unisex,
    desktopPoster: '/media/official-brand/hero-atwo-court.webp',
    mobilePoster: '/media/official-brand/portrait-atwo.webp',
  },
  equipment: {
    desktopVideo: OFFICIAL_BASKETBALL_VIDEO.lockdown8,
    mobileVideo: OFFICIAL_BASKETBALL_VIDEO.lockdown8,
    desktopPoster: '/media/official-brand/hero-lebron-hands.webp',
    mobilePoster: '/media/official-brand/portrait-lebron.webp',
  },
  shoeFinder: {
    desktopVideo: OFFICIAL_BASKETBALL_VIDEO.jet25GradeSchool,
    mobileVideo: OFFICIAL_BASKETBALL_VIDEO.jet25GradeSchool,
    desktopPoster: '/media/heroes/shoe-finder-desktop.webp',
    mobilePoster: '/media/heroes/shoe-finder-mobile.webp',
  },
  custom: {
    desktopVideo: OFFICIAL_BASKETBALL_VIDEO.fox2Buzzer,
    mobileVideo: OFFICIAL_BASKETBALL_VIDEO.fox2Buzzer,
    desktopPoster: '/media/heroes/custom-desktop.webp',
    mobilePoster: '/media/heroes/custom-mobile.webp',
  },
  discover: {
    desktopVideo: OFFICIAL_BASKETBALL_VIDEO.curry3z24,
    mobileVideo: OFFICIAL_BASKETBALL_VIDEO.curry3z24,
    desktopPoster: '/media/heroes/discover-desktop.webp',
    mobilePoster: '/media/heroes/discover-mobile.webp',
  },
  teams: {
    desktopVideo: OFFICIAL_BASKETBALL_VIDEO.curry12Wardell,
    mobileVideo: OFFICIAL_BASKETBALL_VIDEO.curry12Wardell,
    desktopPoster: '/media/heroes/teams-desktop.webp',
    mobilePoster: '/media/heroes/teams-mobile.webp',
  },
  stories: {
    desktopVideo: OFFICIAL_BASKETBALL_VIDEO.currySplash25,
    mobileVideo: OFFICIAL_BASKETBALL_VIDEO.currySplash25,
    desktopPoster: '/media/heroes/stories-desktop.webp',
    mobilePoster: '/media/heroes/stories-mobile.webp',
  },
} as const;
