export type ArtSlot = { desktopHero?: string; mobileHero?: string; poster?: string; editorialImage?: string; background?: string; featureMedia?: string };
const S='/media/official-brand/sections';
export const departmentArtDirection: Record<string, ArtSlot> = {
  clothing:{desktopHero:`${S}/art-clothing.webp`,mobileHero:`${S}/clothing-00.webp`,editorialImage:`${S}/clothing-06.webp`,background:`${S}/clothing-09.webp`},
  footwear:{desktopHero:`${S}/art-footwear.webp`,mobileHero:`${S}/footwear-00.webp`,editorialImage:`${S}/footwear-01.webp`},
  accessories:{desktopHero:`${S}/art-accessories.webp`,mobileHero:`${S}/accessories-00.webp`,editorialImage:`${S}/accessories-03.webp`,background:`${S}/accessories-08.webp`},
  basketballs:{desktopHero:`${S}/art-basketballs.webp`,mobileHero:`${S}/basketballs-00.webp`,featureMedia:`${S}/basketballs-02.webp`},
  equipment:{desktopHero:`${S}/art-equipment.webp`,mobileHero:`${S}/equipment-00.webp`,background:`${S}/equipment-05.webp`},
  'ready-to-ship':{desktopHero:`${S}/discover-ready.webp`,mobileHero:`${S}/discover-ready.webp`,poster:`${S}/discover-ready.webp`},
  customize:{desktopHero:`${S}/art-custom.webp`,mobileHero:`${S}/custom-game-set.webp`,background:`${S}/custom-team-pants.webp`},
  'teams-wholesale':{desktopHero:`${S}/art-teams.webp`,mobileHero:`${S}/teams-training.webp`,editorialImage:`${S}/teams-equipment.webp`},
  lha:{desktopHero:`${S}/art-stories.webp`,mobileHero:`${S}/work-culture.webp`,editorialImage:`${S}/work-design.webp`},
};
export function getDepartmentArt(key:string):ArtSlot{return departmentArtDirection[key]||departmentArtDirection.clothing||{};}
