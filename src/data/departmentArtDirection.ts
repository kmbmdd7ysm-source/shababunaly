import { OFFICIAL_MEDIA } from './officialEditorialMedia.ts';

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
    desktopHero: OFFICIAL_MEDIA.nbKawhi,
    mobileHero: OFFICIAL_MEDIA.nbKawhi,
    editorialImage: OFFICIAL_MEDIA.nbCooper,
    background: OFFICIAL_MEDIA.nikeKobeGroup,
  },
  footwear: {
    desktopHero: OFFICIAL_MEDIA.spaldingBall,
    mobileHero: OFFICIAL_MEDIA.spaldingBall,
    editorialImage: OFFICIAL_MEDIA.spaldingBackboard,
  },
  accessories: {
    desktopHero: OFFICIAL_MEDIA.nbJamal,
    mobileHero: OFFICIAL_MEDIA.nbJamal,
    editorialImage: OFFICIAL_MEDIA.nikeKobeGroup,
    background: OFFICIAL_MEDIA.nbCooper,
  },
  basketballs: {
    desktopHero: OFFICIAL_MEDIA.spaldingBackboard,
    mobileHero: OFFICIAL_MEDIA.nbDejounte,
    featureMedia: OFFICIAL_MEDIA.spaldingBall,
  },
  equipment: {
    desktopHero: OFFICIAL_MEDIA.nikeKobeGroup,
    mobileHero: OFFICIAL_MEDIA.nikeKobeOne,
    background: OFFICIAL_MEDIA.spaldingBall,
  },
  'ready-to-ship': {
    desktopHero: OFFICIAL_MEDIA.nikeKobeHeroDesktop,
    mobileHero: OFFICIAL_MEDIA.nikeKobeHeroMobile,
    poster: OFFICIAL_MEDIA.nikeKobeHeroDesktop,
  },
  customize: {
    desktopHero: OFFICIAL_MEDIA.nbCooper,
    mobileHero: OFFICIAL_MEDIA.nbZach,
    background: OFFICIAL_MEDIA.nikeKobeGroup,
  },
  'teams-wholesale': {
    desktopHero: OFFICIAL_MEDIA.spaldingBackboard,
    mobileHero: OFFICIAL_MEDIA.nbDejounte,
    editorialImage: OFFICIAL_MEDIA.spaldingBall,
  },
  lha: {
    desktopHero: OFFICIAL_MEDIA.nbJamal,
    mobileHero: OFFICIAL_MEDIA.nbJamal,
    editorialImage: OFFICIAL_MEDIA.nbKawhi,
  },
};

export function getDepartmentArt(key: string): ArtSlot {
  return departmentArtDirection[key] || departmentArtDirection.clothing || {};
}
