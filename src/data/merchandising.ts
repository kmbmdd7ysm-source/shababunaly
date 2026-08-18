import { LOCAL_HERO_MEDIA } from './localHeroMedia';

export type LocaleCopy = { en: string; ar: string };
export type MerchandisingWorld = {
  slug: string;
  title: LocaleCopy;
  eyebrow?: LocaleCopy;
  copy?: LocaleCopy;
  to: string;
  desktopMedia: string;
  mobileMedia?: string;
  theme?: 'light' | 'dark';
};

const yt = (id: string) => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
const EXT = {
  nikeBackpack: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/08d0700a-d0fc-4645-a3ff-d14ea52b3905/NK%2BVARSITY%2BELITE%2BBKPK.png',
  nikeBall: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/0b3db21c-204c-4b52-91c8-6a04a40aaea8/NK%2BELT%2BALL%2BCOURT%2B8P%2B2.0.png',
  nikeTournamentBall: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/e52eaec2-956d-40b2-b1c3-58d7d12bc694/NIKE%2BELITE%2BTOURNAMENT.png',
  nikeChampBall: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/5bbfb9b4-9f59-43e5-a4ab-e5238459b210/NK%2BELT%2BCHAMP%2B8P%2B2.0.png',
  nikePump: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/4ee92585-3ec9-43ae-abb2-e868b534bf0b/NIKE%2BESSENTIAL%2BBALL%2BPUMP.png',
  uaCurry13: 'https://about.underarmour.com/content/ua/about/en/stories/2026/02/under-armour-drops-the-curry-13---the-final-chapter-in-a-signatu/_jcr_content/root/container/image.coreimg.jpg',
  adidasTeam: 'https://preview.thenewsmarket.com/Previews/ADID/StillAssets/640x480/691341_v3.jpg',
  nbHoops: 'https://preview.thenewsmarket.com/Previews/NBAS/StillAssets/1920x1080/557260.png',
} as const;

export const HOME_TRENDS: MerchandisingWorld[] = [
  { slug:'new-this-week', title:{en:'New this week',ar:'جديد هذا الأسبوع'}, eyebrow:{en:'Fresh in',ar:'وصل حديثًا'}, to:'/discover/new-this-week', desktopMedia:yt('lky2P_aw6nc'), mobileMedia:yt('lky2P_aw6nc'), theme:'dark' },
  { slug:'performance-picks', title:{en:'Performance picks',ar:'اختيارات الأداء'}, eyebrow:{en:'For the game',ar:'للملعب'}, to:'/discover/performance-picks', desktopMedia:yt('H7SdWUyXHI0'), mobileMedia:yt('H7SdWUyXHI0'), theme:'dark' },
  { slug:'court-essentials', title:{en:'Court essentials',ar:'أساسيات الملعب'}, eyebrow:{en:'Every session',ar:'لكل حصة'}, to:'/discover/court-essentials', desktopMedia:EXT.nikeTournamentBall, mobileMedia:EXT.nikeTournamentBall, theme:'dark' },
];

export const CATEGORY_WORLDS: MerchandisingWorld[] = [
  { slug:'footwear', title:{en:'Footwear',ar:'الأحذية'}, to:'/shop/footwear', desktopMedia:EXT.uaCurry13, mobileMedia:EXT.uaCurry13, theme:'dark' },
  { slug:'clothing', title:{en:'Apparel',ar:'الملابس'}, to:'/shop/clothing', desktopMedia:EXT.adidasTeam, mobileMedia:EXT.adidasTeam, theme:'dark' },
  { slug:'basketballs', title:{en:'Basketballs',ar:'كرات السلة'}, to:'/shop/basketballs', desktopMedia:EXT.nikeBall, mobileMedia:EXT.nikeBall, theme:'dark' },
  { slug:'accessories', title:{en:'Accessories',ar:'الإكسسوارات'}, to:'/shop/accessories', desktopMedia:EXT.nikeBackpack, mobileMedia:EXT.nikeBackpack, theme:'dark' },
  { slug:'equipment', title:{en:'Equipment',ar:'المعدات'}, to:'/shop/equipment', desktopMedia:EXT.nikePump, mobileMedia:EXT.nikePump, theme:'dark' },
];

export type DiscoverCollection = MerchandisingWorld & { rule:'new'|'best'|'featured'|'performance'|'court'|'ready'|'all' };
export const DISCOVER_COLLECTIONS: DiscoverCollection[] = [
  { slug:'trending-now', title:{en:'Trending now',ar:'الرائج الآن'}, eyebrow:{en:'Discover',ar:'اكتشف'}, copy:{en:'A basketball-first edit of products and stories from the current catalogue.',ar:'مختارات مركزة على كرة السلة من المنتجات والقصص داخل الكتالوج الحالي.'}, to:'/discover/trending-now', desktopMedia:yt('yP0grL4HZ1E'), mobileMedia:yt('yP0grL4HZ1E'), theme:'dark', rule:'best' },
  { slug:'just-dropped', title:{en:'Just dropped',ar:'وصل للتو'}, eyebrow:{en:'Latest',ar:'الأحدث'}, copy:{en:'Recent additions to the live catalogue.',ar:'أحدث الإضافات إلى الكتالوج الحالي.'}, to:'/discover/just-dropped', desktopMedia:yt('G0sUuHddK_M'), mobileMedia:yt('G0sUuHddK_M'), theme:'dark', rule:'new' },
  { slug:'new-this-week', title:{en:'New this week',ar:'جديد هذا الأسبوع'}, eyebrow:{en:'New in',ar:'وصل حديثًا'}, copy:{en:'A focused edit of the newest products available to browse.',ar:'اختيارات مركزة من أحدث المنتجات المتاحة للتصفح.'}, to:'/discover/new-this-week', desktopMedia:yt('6rLg68TDNQM'), mobileMedia:yt('6rLg68TDNQM'), theme:'dark', rule:'new' },
  { slug:'best-sellers', title:{en:'Best sellers',ar:'الأكثر مبيعًا'}, eyebrow:{en:'Popular',ar:'الأكثر طلبًا'}, copy:{en:'Established favourites from the current catalogue.',ar:'منتجات مفضلة من الكتالوج الحالي.'}, to:'/discover/best-sellers', desktopMedia:yt('d42Mjtalv70'), mobileMedia:yt('d42Mjtalv70'), theme:'dark', rule:'best' },
  { slug:'performance-picks', title:{en:'Performance picks',ar:'اختيارات الأداء'}, eyebrow:{en:'Basketball',ar:'كرة السلة'}, copy:{en:'Footwear and gear selected for playing, training and movement.',ar:'أحذية وتجهيزات للعب والتدريب والحركة.'}, to:'/discover/performance-picks', desktopMedia:yt('v6-FRL9Mpys'), mobileMedia:yt('v6-FRL9Mpys'), theme:'dark', rule:'performance' },
  { slug:'court-essentials', title:{en:'Court essentials',ar:'أساسيات الملعب'}, eyebrow:{en:'Every session',ar:'لكل حصة'}, copy:{en:'Basketballs, accessories and equipment that keep the game moving.',ar:'كرات وإكسسوارات ومعدات تخلي اللعب مستمر.'}, to:'/discover/court-essentials', desktopMedia:EXT.nikeChampBall, mobileMedia:EXT.nikeChampBall, theme:'dark', rule:'court' },
  { slug:'ready-now', title:{en:'Ready now',ar:'جاهز الآن'}, eyebrow:{en:'Verified stock',ar:'مخزون موثق'}, copy:{en:'Only products with verified ready-to-ship inventory appear here.',ar:'يعرض هنا فقط المخزون الموثق الجاهز للتسليم.'}, to:'/discover/ready-now', desktopMedia:yt('tD4X436fjnE'), mobileMedia:yt('tD4X436fjnE'), theme:'dark', rule:'ready' },
  { slug:'shababuna-selects', title:{en:'Shababuna selects',ar:'مختارات شبابنا'}, eyebrow:{en:'The edit',ar:'مختاراتنا'}, copy:{en:'A rotating edit from the products already in the catalogue.',ar:'اختيارات متجددة من المنتجات الموجودة في الكتالوج.'}, to:'/discover/shababuna-selects', desktopMedia:EXT.nbHoops, mobileMedia:EXT.nbHoops, theme:'dark', rule:'featured' },
];

export const HOME_CAMPAIGN = { title:{en:'Made to move.',ar:'مصنوع للحركة.'}, copy:{en:'Basketball culture, performance and product in one edit.',ar:'ثقافة كرة السلة والأداء والمنتج في مختارات واحدة.'}, desktopMedia:yt('UCWkNZ5Y8-E'), mobileMedia:yt('UCWkNZ5Y8-E') };
export const SHOP_CAMPAIGN = { title:{en:'Made for the court.',ar:'مصنوع للملعب.'}, copy:{en:'Product first. Everything else stays out of the way.',ar:'المنتج أولاً. والباقي يخليه واضح.'}, desktopMedia:LOCAL_HERO_MEDIA.shop.desktopPoster, mobileMedia:LOCAL_HERO_MEDIA.shop.mobilePoster, desktopVideo:LOCAL_HERO_MEDIA.shop.desktopVideo, mobileVideo:LOCAL_HERO_MEDIA.shop.mobileVideo };
