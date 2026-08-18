type ArtSlot={desktop?:string;mobile?:string};
const L='/media/localized-brand';
const H='/media/hero-posters';
const P='/images/products';
export const departmentArtDirection: Record<string, ArtSlot> = {
  clothing:{desktop:`${L}/adidas_team.png`,mobile:`${L}/nike-teamwear-courtside.webp`},
  footwear:{desktop:`${L}/square_sabrina.webp`,mobile:`${L}/nike_white_shoe.png`},
  accessories:{desktop:`${P}/lha-elite-basketball-backpack-black.webp`,mobile:`${P}/lha-elite-basketball-backpack-black.webp`},
  basketballs:{desktop:`${H}/basketballs.webp`,mobile:`${H}/basketballs.webp`},
  equipment:{desktop:`${L}/puma_court.png`,mobile:`${L}/puma_court.png`},
  shoeFinder:{desktop:`${L}/nike_green_product.webp`,mobile:`${L}/square_sabrina.webp`},
  custom:{desktop:`${L}/nike-teamwear-courtside.webp`,mobile:`${L}/portrait_atwo.webp`},
  teams:{desktop:`${L}/adidas_team.png`,mobile:`${L}/ua_dribble.png`},
};
export function getDepartmentArt(key:string):ArtSlot{return departmentArtDirection[key]||departmentArtDirection.clothing||{};}
