/**
 * Local-only editorial media registry.
 *
 * These aliases intentionally point to files shipped inside /public so the
 * storefront never depends on a third-party CDN for critical imagery.
 * The historical key names are preserved to avoid touching unrelated page logic.
 */
export const OFFICIAL_MEDIA = {
  nikeWinningPoster: '/media/heroes/home-desktop.webp',
  nikeWinningCollage: '/media/heroes/discover-desktop.webp',
  nikeKobeHeroDesktop: '/media/heroes/footwear-desktop.webp',
  nikeKobeHeroMobile: '/media/heroes/footwear-mobile.webp',
  nikeKobeGroup: '/images/products/kobe/goat/kobe-8-halo.webp',
  nikeKobeOne: '/images/products/kobe/goat/kobe-4-gold-medal.webp',
  nikeKobeTwo: '/images/products/kobe/goat/kobe-5-chaos.webp',
  nikeKobeThree: '/images/products/kobe/goat/kobe-10-rivalry.webp',

  nikeCustomGameTop: '/images/products/lha-center-logo-tank-white.png',
  nikeCustomGameShorts: '/images/products/lha-performance-shorts-black.png',
  nikeCustomPracticeJersey: '/images/products/compression-tank-white.webp',
  nikeCustomShootingShirt: '/images/products/lha-logo-performance-tee-grey.png',
  nikeCustomHoodie: '/images/products/own-the-game-pullover-hoodie-grey.jpeg',
  nikeCustomTeamPants: '/images/products/own-the-game-fleece-pants-black.jpeg',
  nikeCustomWarmupCrew: '/images/products/own-the-game-crewneck-grey.jpeg',
  nikeCustomTeamBag: '/images/products/lha-elite-basketball-backpack-white.jpeg',
  jordanCustomSleeve: '/images/products/lha-one-leg-compression-tights-white.png',

  spaldingPolePad: '/media/atmosphere/arena-wide-2048.webp',
  spaldingBall: '/images/categories/accessories-hero-player.jpeg',
  spaldingBackboard: '/media/atmosphere/arena-wide-1600.webp',
  spaldingPump: '/images/products/lha-elite-basketball-backpack-black.jpeg',

  nbKawhi: '/images/categories/clothing-hero-player.jpeg',
  nbTyrese: '/images/categories/accessories-hero-player.jpeg',
  nbCameron: '/images/products/own-the-game-pullover-hoodie-grey.jpeg',
  nbCooper: '/images/products/lha-logo-performance-tee-grey.png',
  nbDejounte: '/images/products/own-the-game-zip-hoodie-grey.jpeg',
  nbZach: '/images/products/lha-center-logo-tank-black.png',
  nbJamal: '/images/products/hoops-for-troops-tee-grey.png',
  nbAaron: '/images/products/all-i-know-is-win-tee-white.png',
  nbNickSmith: '/images/products/lha-one-leg-compression-tights-white.png',
  nbDarius: '/images/products/lha-elite-basketball-backpack-camo.jpeg',

  nikeWinningCampaignPage: '',
  newBalanceBasketballPage: '',
  none: '',
} as const;
