import { EDITORIAL as E } from './editorialAssets.ts';
type ArtSlot={desktop?:string;mobile?:string};
export const departmentArtDirection: Record<string, ArtSlot> = {
  clothing:{desktop:E.franceGroup,mobile:E.usaWomanCelebrate},
  footwear:{desktop:E.curryShoeColor,mobile:E.jordanShoePink},
  accessories:{desktop:E.dloShoes,mobile:E.femaleSole},
  basketballs:{desktop:E.curryPortraitBall,mobile:E.curryWhiteHoodClose},
  equipment:{desktop:E.jordanDunkEvent,mobile:E.jordanDunkVertical},
  shoeFinder:{desktop:E.curryShoesBlue,mobile:E.pinkGreyShoe},
  custom:{desktop:E.shanghaiPlayers,mobile:E.usaWomanCelebrate},
  teams:{desktop:E.franceGroup,mobile:E.tatumKids},
};
export function getDepartmentArt(key:string):ArtSlot{return departmentArtDirection[key]||departmentArtDirection.clothing||{};}
