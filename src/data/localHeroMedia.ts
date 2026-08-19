/** Runtime hero media — supplied originals, self-hosted without re-encoding. */
const entry = (desktopVideo: string, mobileVideo = desktopVideo) => ({ desktopVideo, mobileVideo });
export const LOCAL_HERO_MEDIA = {
  home: entry('/media/hero-videos/home-desktop.mp4','/media/hero-videos/home-mobile.mp4'),
  shop: entry('/media/hero-videos/shop.mp4'),
  footwear: entry('/media/hero-videos/footwear.mp4'),
  clothing: entry('/media/hero-videos/clothing.mp4'),
  accessories: entry('/media/hero-videos/accessories.mp4'),
  basketballs: entry('/media/hero-videos/basketballs.mp4'),
  equipment: entry('/media/hero-videos/equipment.mp4'),
  shoeFinder: entry('/media/hero-videos/shoe-finder.mp4'),
  custom: entry('/media/hero-videos/custom.mp4'),
  discover: entry('/media/hero-videos/discover.mp4'),
  teams: entry('/media/hero-videos/teams.mp4'),
  stories: entry('/media/hero-videos/stories-desktop.mp4','/media/hero-videos/stories-mobile.mp4'),
  releases: entry('/media/hero-videos/releases.mp4'),
} as const;
