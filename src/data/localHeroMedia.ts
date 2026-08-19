/**
 * Runtime hero media.
 *
 * All hero videos below are now self-hosted local MP4 files sourced from the
 * replacement media package supplied by the user on 2026-08-19.
 */
const LOCAL_MP4 = {
  home: '/media/hero-videos/home.mp4',
  shop: '/media/hero-videos/shop.mp4',
  footwear: '/media/hero-videos/footwear.mp4',
  clothing: '/media/hero-videos/clothing.mp4',
  accessories: '/media/hero-videos/accessories.mp4',
  basketballs: '/media/hero-videos/basketballs.mp4',
  equipment: '/media/hero-videos/equipment.mp4',
  shoeFinder: '/media/hero-videos/shoe-finder.mp4',
  custom: '/media/hero-videos/custom.mp4',
  discover: '/media/hero-videos/discover.mp4',
  teams: '/media/hero-videos/teams.mp4',
  stories: '/media/hero-videos/stories.mp4',
  releases: '/media/hero-videos/releases.mp4',
} as const;

const entry = (video: string, poster: string) => ({
  desktopVideo: video,
  mobileVideo: video,
  desktopPoster: poster,
  mobilePoster: poster,
});

export const LOCAL_HERO_MEDIA = {
  home: entry(LOCAL_MP4.home, '/media/hero-posters/home.webp'),
  shop: entry(LOCAL_MP4.shop, '/media/hero-posters/shop.webp'),
  footwear: entry(LOCAL_MP4.footwear, '/media/hero-posters/footwear.webp'),
  clothing: entry(LOCAL_MP4.clothing, '/media/hero-posters/clothing.webp'),
  accessories: entry(LOCAL_MP4.accessories, '/media/hero-posters/accessories.webp'),
  basketballs: entry(LOCAL_MP4.basketballs, '/media/hero-posters/basketballs.webp'),
  equipment: entry(LOCAL_MP4.equipment, '/media/hero-posters/equipment.webp'),
  shoeFinder: entry(LOCAL_MP4.shoeFinder, '/media/hero-posters/shoe-finder.webp'),
  custom: entry(LOCAL_MP4.custom, '/media/hero-posters/custom.webp'),
  discover: entry(LOCAL_MP4.discover, '/media/hero-posters/discover.webp'),
  teams: entry(LOCAL_MP4.teams, '/media/hero-posters/teams.webp'),
  stories: entry(LOCAL_MP4.stories, '/media/hero-posters/stories.webp'),
  releases: entry(LOCAL_MP4.releases, '/media/hero-posters/releases.webp'),
} as const;
