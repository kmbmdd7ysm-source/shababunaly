type ArtSlot={desktop?:string;mobile?:string};
const YT=(id:string)=>`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
const ADIDAS='https://preview.thenewsmarket.com/Previews/ADID/StillAssets/640x480/691341_v3.jpg';
const NB='https://preview.thenewsmarket.com/Previews/NBAS/StillAssets/1920x1080/557260.png';
const NIKE_BALL='https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/0b3db21c-204c-4b52-91c8-6a04a40aaea8/NK%2BELT%2BALL%2BCOURT%2B8P%2B2.0.png';
const NIKE_BAG='https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/08d0700a-d0fc-4645-a3ff-d14ea52b3905/NK%2BVARSITY%2BELITE%2BBKPK.png';
const UA='https://about.underarmour.com/content/ua/about/en/stories/2026/02/under-armour-drops-the-curry-13---the-final-chapter-in-a-signatu/_jcr_content/root/container/image.coreimg.jpg';
export const departmentArtDirection: Record<string, ArtSlot> = {
  clothing:{desktop:ADIDAS,mobile:ADIDAS},
  footwear:{desktop:UA,mobile:UA},
  accessories:{desktop:NIKE_BAG,mobile:NIKE_BAG},
  basketballs:{desktop:NIKE_BALL,mobile:NIKE_BALL},
  equipment:{desktop:YT('LRJP140fv3E'),mobile:YT('LRJP140fv3E')},
  shoeFinder:{desktop:YT('98dmoVm83Vs'),mobile:YT('98dmoVm83Vs')},
  custom:{desktop:YT('UCWkNZ5Y8-E'),mobile:YT('UCWkNZ5Y8-E')},
  teams:{desktop:YT('AK1kNfqqe64'),mobile:YT('AK1kNfqqe64')},
};
export function getDepartmentArt(key:string):ArtSlot{return departmentArtDirection[key]||departmentArtDirection.clothing||{};}
