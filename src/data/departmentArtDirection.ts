/**
 * Configurable art-direction slots per department/destination.
 * Final photography replaces paths by config — no page rewrites.
 * Temporary atmospheres are concept media, not product photography.
 */

export type ArtSlot = {
  desktopHero?: string;
  mobileHero?: string;
  poster?: string;
  editorialImage?: string;
  background?: string;
  featureMedia?: string;
};

export const departmentArtDirection: Record<string, ArtSlot> = {
  clothing: {
    desktopHero: '/media/atmosphere/fabric-macro-1400.webp',
    mobileHero: '/media/atmosphere/fabric-macro-900.webp',
    editorialImage: '/media/atmosphere/product-stage-1400.webp',
    background: '/media/atmosphere/fabric-macro-1400.webp',
  },
  footwear: {
    desktopHero: '/media/atmosphere/court-overhead-1600.webp',
    mobileHero: '/media/atmosphere/court-overhead-1024.webp',
    editorialImage: '/media/atmosphere/arena-wide-1600.webp',
  },
  accessories: {
    desktopHero: '/media/atmosphere/product-stage-1400.webp',
    mobileHero: '/media/atmosphere/product-stage-900.webp',
  },
  basketballs: {
    desktopHero: '/media/atmosphere/arena-wide-1600.webp',
    mobileHero: '/media/atmosphere/arena-tall-900.webp',
    featureMedia: '/media/atmosphere/court-overhead-1600.webp',
  },
  equipment: {
    desktopHero: '/media/atmosphere/product-stage-1400.webp',
    mobileHero: '/media/atmosphere/product-stage-900.webp',
    background: '/media/atmosphere/court-overhead-1600.webp',
  },
  'ready-to-ship': {
    desktopHero: '/media/atmosphere/ready-ship-1600.webp',
    mobileHero: '/media/atmosphere/ready-ship-1024.webp',
    poster: '/media/atmosphere/ready-ship-1600.webp',
  },
  customize: {
    desktopHero: '/media/atmosphere/fabric-macro-1400.webp',
    mobileHero: '/media/atmosphere/fabric-macro-900.webp',
    background: '/media/atmosphere/product-stage-1400.webp',
  },
  'teams-wholesale': {
    desktopHero: '/media/atmosphere/arena-wide-1600.webp',
    mobileHero: '/media/atmosphere/arena-tall-900.webp',
    editorialImage: '/media/atmosphere/court-overhead-1600.webp',
  },
  lha: {
    desktopHero: '/media/atmosphere/product-stage-1400.webp',
    mobileHero: '/media/atmosphere/product-stage-900.webp',
  },
};

export function getDepartmentArt(key: string): ArtSlot {
  return departmentArtDirection[key] || departmentArtDirection.clothing || {};
}
