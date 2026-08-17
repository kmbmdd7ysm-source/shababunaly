export type OfficialMediaEntry = {
  source: string;
  alt: string;
  width?: number;
  height?: number;
};

const createEntry = (source: string, alt: string, width?: number, height?: number): OfficialMediaEntry => ({
  source,
  alt,
  width,
  height,
});

export const OFFICIAL_MEDIA = {
  nikeWinningPoster: createEntry('/media/official-brand/collage-performance.webp', 'Official basketball editorial collage from Nike signature storytelling.', 1600, 900),
  nikeWinningCollage: createEntry('/media/official-brand/collage-signatures.webp', 'Official basketball footwear collage sourced from global brand imagery.', 1600, 900),
  nikeKobeHeroDesktop: createEntry('/media/official-brand/hero-nike-pyramid.webp', 'Official basketball hero product image from Nike signature footwear.', 1600, 900),
  nikeKobeHeroMobile: createEntry('/media/official-brand/portrait-aone.webp', 'Official basketball hero portrait from Nike signature footwear.', 1200, 1500),
  nikeKobeGroup: createEntry('/media/official-brand/hero-lebron-hands.webp', 'Official basketball shoe close-up from Nike signature footwear.', 1600, 900),
  nikeKobeOne: createEntry('/media/official-brand/hero-book2-case.webp', 'Official basketball hero image featuring signature footwear presentation.', 1600, 900),
  nikeKobeTwo: createEntry('/media/official-brand/hero-sabrina4.webp', 'Official basketball signature shoe artwork.', 1600, 900),
  nikeKobeThree: createEntry('/media/official-brand/hero-aone-product.webp', 'Official basketball signature product image.', 1600, 900),
  nikeCustomGameTop: createEntry('/media/official-brand/portrait-atwo.webp', 'Official basketball player editorial image.', 1200, 1500),
  nikeCustomGameShorts: createEntry('/media/official-brand/collage-apparel.webp', 'Official basketball apparel collage from global brand imagery.', 1200, 1500),
  nikeCustomShootingShirt: createEntry('/media/official-brand/hero-atwo-court.webp', 'Official basketball court editorial image.', 1600, 900),
  nikeCustomHoodie: createEntry('/media/official-brand/portrait-closeup.webp', 'Official basketball editorial close-up image.', 1200, 1500),
  nikeCustomTracksuit: createEntry('/media/official-brand/collage-signatures.webp', 'Official basketball signature collage.', 1600, 900),
  nikeCustomBag: createEntry('/media/official-brand/hero-book2-case.webp', 'Official basketball lifestyle equipment image.', 1600, 900),
  nikeCustomBasketball: createEntry('/media/official-brand/hero-atwo-court.webp', 'Official basketball editorial image with visible basketball.', 1600, 900),
  nikeCustomDuffle: createEntry('/media/official-brand/hero-lebron-hands.webp', 'Official basketball editorial detail shot.', 1600, 900),
  spaldingGameBall: createEntry('/media/official-brand/hero-atwo-court.webp', 'Official basketball court image with ball.', 1600, 900),
  spaldingBackboard: createEntry('/media/official-brand/hero-atwo-court.webp', 'Official basketball court and hoop editorial image.', 1600, 900),
  spaldingPolePad: createEntry('/media/official-brand/hero-focus-closeup.webp', 'Official basketball editorial portrait.', 1600, 900),
  spaldingPump: createEntry('/media/official-brand/hero-book2-case.webp', 'Official basketball gear still life.', 1600, 900),
  nbKawhi: createEntry('/media/official-brand/hero-aone-product.webp', 'Official basketball signature shoe product image.', 1600, 900),
  nbTyrese: createEntry('/media/official-brand/hero-sabrina4.webp', 'Official basketball signature shoe presentation.', 1600, 900),
  nbCameron: createEntry('/media/official-brand/hero-lebron-hands.webp', 'Official basketball detail image.', 1600, 900),
  nbCooper: createEntry('/media/official-brand/hero-book2-case.webp', 'Official basketball studio hero image.', 1600, 900),
  nbDejounte: createEntry('/media/official-brand/hero-atwo-court.webp', 'Official basketball on-court image.', 1600, 900),
  nbZach: createEntry('/media/official-brand/hero-focus-closeup.webp', 'Official basketball portrait image.', 1600, 900),
  nbJamal: createEntry('/media/official-brand/collage-signatures.webp', 'Official basketball signature collage.', 1600, 900),
  nbAaron: createEntry('/media/official-brand/collage-performance.webp', 'Official basketball campaign collage.', 1600, 900),
  nbNickSmith: createEntry('/media/official-brand/portrait-aone.webp', 'Official basketball product portrait.', 1200, 1500),
  nbDarius: createEntry('/media/official-brand/portrait-atwo.webp', 'Official basketball player portrait.', 1200, 1500),
} as const;
