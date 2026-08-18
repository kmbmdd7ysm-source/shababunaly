/**
 * Official external basketball film map.
 * The films remain external embeds; posters are bundled locally so the hero always
 * has a clean fallback without depending on YouTube thumbnail delivery.
 */
const yt = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&cc_load_policy=0&enablejsapi=1`;

const FILMS = {
  home: '_Ra6wkIoJp0',
  shop: '57FHMzbXycg',
  footwear: 'v6-FRL9Mpys',
  clothing: 'qd-ZtNsNiH4',
  accessories: 'ucuL5-dyFzs',
  basketballs: 'EiTqiIy80G8',
  equipment: 'u_49Qh9II8M',
  shoeFinder: '98dmoVm83Vs',
  custom: 'UCWkNZ5Y8-E',
  discover: 'bfLEcKIHziQ',
  teams: 'AK1kNfqqe64',
  stories: 'G0sUuHddK_M',
  releases: 'tD4X436fjnE',
} as const;

const entry = (id: string, poster: string) => ({
  desktopVideo: yt(id),
  mobileVideo: yt(id),
  desktopPoster: poster,
  mobilePoster: poster,
});

export const LOCAL_HERO_MEDIA = {
  home: entry(FILMS.home, '/media/hero-posters/home.webp'),
  shop: entry(FILMS.shop, '/media/hero-posters/shop.png'),
  footwear: entry(FILMS.footwear, '/media/hero-posters/footwear.png'),
  clothing: entry(FILMS.clothing, '/media/hero-posters/clothing.png'),
  accessories: entry(FILMS.accessories, '/media/hero-posters/accessories.webp'),
  basketballs: entry(FILMS.basketballs, '/media/hero-posters/basketballs.webp'),
  equipment: entry(FILMS.equipment, '/media/hero-posters/equipment.png'),
  shoeFinder: entry(FILMS.shoeFinder, '/media/hero-posters/shoe-finder.png'),
  custom: entry(FILMS.custom, '/media/hero-posters/custom.png'),
  discover: entry(FILMS.discover, '/media/hero-posters/discover.webp'),
  teams: entry(FILMS.teams, '/media/hero-posters/teams.png'),
  stories: entry(FILMS.stories, '/media/hero-posters/stories.webp'),
  releases: entry(FILMS.releases, '/media/hero-posters/releases.webp'),
} as const;
