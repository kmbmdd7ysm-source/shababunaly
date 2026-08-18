/**
 * Hero media runtime map.
 * Posters are local, optimized fallbacks. Video sources below are real Under Armour
 * basketball product videos served by Under Armour's official Scene7 media host.
 * Keeping posters local preserves fast LCP and a clean fallback if a remote video is unavailable.
 */
const OFFICIAL_BASKETBALL_VIDEO = {
  curry13: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6007670-419',
  curry12DubNation: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3027630-001',
  lockdown7Low: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3027646-600',
  fox2Sharpie: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6017491-100',
  jet25: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6001587-102',
  fox2Buzzer: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_6012728-001',
  curry3z24: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3027627-004',
  curry12Wardell: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3027634-001',
  currySplash25: 'https://underarmour.scene7.com/is/content/Underarmour/auto_dim7_3028459-016',
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
  shoeFinder: {
    desktopVideo: OFFICIAL_BASKETBALL_VIDEO.jet25,
    mobileVideo: OFFICIAL_BASKETBALL_VIDEO.jet25,
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
