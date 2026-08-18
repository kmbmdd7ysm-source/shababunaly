/**
 * External official basketball film map.
 * Every hero uses a different full-motion film from an official Nike, adidas,
 * PUMA or New Balance channel. Local fake-motion MP4s are intentionally not used.
 */
const yt = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&disablekb=1`;
const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;

const FILMS = {
  home: '_Ra6wkIoJp0',             // Nike — LeBron / Winning Isn't For Everyone
  shop: '57FHMzbXycg',             // New Balance Hoops — We Got Now 2026
  footwear: 'v6-FRL9Mpys',         // adidas — Anthony Edwards / No Lie
  clothing: 'qd-ZtNsNiH4',         // Under Armour — Rule Yourself / Stephen Curry
  accessories: 'ucuL5-dyFzs',      // Nike — A'ja Wilson / Teaching The Pro
  basketballs: 'EiTqiIy80G8',      // Nike — LeBron / Just Do It
  equipment: 'u_49Qh9II8M',        // PUMA Hoops — Uproar Palace Guard
  shoeFinder: '98dmoVm83Vs',       // Nike — LeBron XXIII Behind the Design
  custom: 'UCWkNZ5Y8-E',           // adidas — Anthony Edwards 20 Foot Hoop
  discover: 'bfLEcKIHziQ',         // Nike — I Am the Pressure
  teams: 'AK1kNfqqe64',            // New Balance Basketball — Tyrese Maxey
  stories: 'G0sUuHddK_M',          // Nike — Sabrina 4 Behind the Design
  releases: 'tD4X436fjnE',         // adidas — Damian Lillard / Dame 9
} as const;

const entry = (id: string) => ({
  desktopVideo: yt(id),
  mobileVideo: yt(id),
  desktopPoster: thumb(id),
  mobilePoster: thumb(id),
});

export const LOCAL_HERO_MEDIA = {
  home: entry(FILMS.home),
  shop: entry(FILMS.shop),
  footwear: entry(FILMS.footwear),
  clothing: entry(FILMS.clothing),
  accessories: entry(FILMS.accessories),
  basketballs: entry(FILMS.basketballs),
  equipment: entry(FILMS.equipment),
  shoeFinder: entry(FILMS.shoeFinder),
  custom: entry(FILMS.custom),
  discover: entry(FILMS.discover),
  teams: entry(FILMS.teams),
  stories: entry(FILMS.stories),
  releases: entry(FILMS.releases),
} as const;
