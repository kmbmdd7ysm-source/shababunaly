export type OfficialMediaEntry={source:string;alt:string;width?:number;height?:number};
const createEntry=(source:string,alt:string,width?:number,height?:number):OfficialMediaEntry=>({source,alt,width,height});
const L='/media/localized-brand';
const H='/media/hero-posters';
const P='/images/products';
export const OFFICIAL_MEDIA={
  nikeWinningPoster:createEntry(`${L}/nike_court.webp`,'Basketball campaign court image.',1600,900),
  nikeWinningCollage:createEntry(`${L}/nike_pyramid.webp`,'Basketball signature footwear image.',1600,900),
  nikeKobeHeroDesktop:createEntry(`${L}/nike_green_product.webp`,'Basketball footwear product image.',1600,900),
  nikeKobeHeroMobile:createEntry(`${L}/portrait_aone.webp`,'Basketball footwear portrait image.',1200,1500),
  nikeKobeGroup:createEntry(`${L}/nike_hands.webp`,'Basketball footwear detail image.',1600,900),
  nikeKobeOne:createEntry(`${L}/nike_case.webp`,'Basketball product presentation image.',1600,900),
  nikeKobeTwo:createEntry(`${L}/square_sabrina.webp`,'Basketball signature footwear image.',1200,1200),
  nikeKobeThree:createEntry(`${L}/nike_pink_product.webp`,'Basketball signature footwear product image.',1600,900),
  nikeCustomGameTop:createEntry(`${L}/adidas_team.png`,'Basketball teamwear reference image.',1000,486),
  nikeCustomGameShorts:createEntry(`${P}/lha-performance-shorts-black.webp`,'Basketball shorts product image.',1000,1250),
  nikeCustomShootingShirt:createEntry(`${P}/own-the-game-sleeveless-top-black.webp`,'Basketball sleeveless top product image.',1000,1250),
  nikeCustomHoodie:createEntry(`${P}/own-the-game-pullover-hoodie-black.webp`,'Basketball hoodie product image.',1000,1250),
  nikeCustomTracksuit:createEntry(`${P}/lha-premium-fleece-set-black.webp`,'Team tracksuit product image.',1000,1250),
  nikeCustomBag:createEntry(`${P}/lha-elite-basketball-backpack-black.webp`,'Basketball backpack product image.',1000,1250),
  nikeCustomBasketball:createEntry(`${H}/basketballs.webp`,'Basketball reference image.',1600,900),
  nikeCustomDuffle:createEntry(`${P}/lha-elite-basketball-backpack-camo.webp`,'Basketball team bag product image.',1000,1250),
  spaldingGameBall:createEntry(`${H}/basketballs.webp`,'Basketball product reference image.',1600,900),
  spaldingBackboard:createEntry(`${L}/puma_court.png`,'Basketball court and hoop reference image.',512,512),
  spaldingPolePad:createEntry(`${L}/ua_dribble.png`,'Basketball court equipment context image.',512,512),
  spaldingPump:createEntry(`${L}/nb_ball_hoodie.png`,'Basketball equipment context image.',512,512),
  nbKawhi:createEntry(`${L}/portrait_closeup.webp`,'Basketball editorial portrait.',1200,1500),
  nbTyrese:createEntry(`${L}/portrait_atwo.webp`,'Basketball athlete image.',1200,1500),
  nbCameron:createEntry(`${L}/puma_athlete.png`,'Basketball athlete image.',512,512),
  nbCooper:createEntry(`${L}/nike_case.webp`,'Basketball product studio image.',1600,900),
  nbDejounte:createEntry(`${L}/nike_court.webp`,'Basketball on-court image.',1600,900),
  nbZach:createEntry(`${L}/portrait_lebron.webp`,'Basketball athlete portrait.',1200,1500),
  nbJamal:createEntry(`${L}/nike_hands.webp`,'Basketball product detail image.',1600,900),
  nbAaron:createEntry(`${L}/nike_pyramid.webp`,'Basketball footwear campaign image.',1600,900),
  nbNickSmith:createEntry(`${L}/portrait_aone.webp`,'Basketball product portrait.',1200,1500),
  nbDarius:createEntry(`${L}/adidas_team.png`,'Basketball team image.',1000,486),
} as const;
