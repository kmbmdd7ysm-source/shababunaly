/**
 * Configurable art-direction slots per department/destination.
 * Pages should read from here — never hardcode the same campaign image everywhere.
 * Final photography can replace paths without page rewrites.
 */

export type ArtSlot = {
  desktopHero?: string;
  mobileHero?: string;
  poster?: string;
  editorialImage?: string;
  background?: string;
  featureMedia?: string;
};

const atmosphere = {
  game: '/media/atmosphere/arena-wide-1600.webp',
  gameTall: '/media/atmosphere/arena-tall-900.webp',
  product: '/media/atmosphere/arena-wide-1024.webp',
};

export const departmentArtDirection: Record<string, ArtSlot> = {
  clothing: {
    desktopHero: atmosphere.product,
    mobileHero: atmosphere.gameTall,
    editorialImage: atmosphere.product,
    background: atmosphere.game,
  },
  footwear: {
    desktopHero: atmosphere.game,
    mobileHero: atmosphere.gameTall,
    editorialImage: atmosphere.game,
  },
  accessories: {
    desktopHero: atmosphere.product,
    mobileHero: atmosphere.gameTall,
  },
  basketballs: {
    desktopHero: atmosphere.game,
    mobileHero: atmosphere.gameTall,
    featureMedia: atmosphere.game,
  },
  equipment: {
    desktopHero: atmosphere.product,
    mobileHero: atmosphere.gameTall,
  },
  'ready-to-ship': {
    desktopHero: atmosphere.product,
    mobileHero: atmosphere.gameTall,
    poster: atmosphere.product,
  },
  customize: {
    desktopHero: atmosphere.product,
    mobileHero: atmosphere.gameTall,
    background: atmosphere.product,
  },
  'teams-wholesale': {
    desktopHero: atmosphere.game,
    mobileHero: atmosphere.gameTall,
    editorialImage: atmosphere.game,
  },
  lha: {
    desktopHero: atmosphere.product,
    mobileHero: atmosphere.gameTall,
  },
};

export function getDepartmentArt(key: string): ArtSlot {
  return departmentArtDirection[key] || departmentArtDirection.clothing || {};
}
