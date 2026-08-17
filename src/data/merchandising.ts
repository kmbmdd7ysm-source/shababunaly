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

const S = '/media/official-brand/sections';

export const HOME_TRENDS: MerchandisingWorld[] = [
  { slug:'new-this-week', title:{en:'New this week',ar:'جديد هذا الأسبوع'}, eyebrow:{en:'Fresh in',ar:'وصل حديثًا'}, to:'/discover/new-this-week', desktopMedia:`${S}/home-new.webp`, mobileMedia:`${S}/home-new.webp`, theme:'dark' },
  { slug:'performance-picks', title:{en:'Performance picks',ar:'اختيارات الأداء'}, eyebrow:{en:'For the game',ar:'للملعب'}, to:'/discover/performance-picks', desktopMedia:`${S}/home-performance.webp`, mobileMedia:`${S}/home-performance.webp`, theme:'dark' },
  { slug:'court-essentials', title:{en:'Court essentials',ar:'أساسيات الملعب'}, eyebrow:{en:'Every session',ar:'لكل حصة'}, to:'/discover/court-essentials', desktopMedia:`${S}/home-court.webp`, mobileMedia:`${S}/home-court.webp`, theme:'dark' },
];

export const CATEGORY_WORLDS: MerchandisingWorld[] = [
  { slug:'footwear', title:{en:'Footwear',ar:'الأحذية'}, to:'/shop/footwear', desktopMedia:`${S}/category-footwear.webp`, mobileMedia:`${S}/category-footwear.webp`, theme:'dark' },
  { slug:'clothing', title:{en:'Apparel',ar:'الملابس'}, to:'/shop/clothing', desktopMedia:`${S}/category-clothing.webp`, mobileMedia:`${S}/category-clothing.webp`, theme:'dark' },
  { slug:'basketballs', title:{en:'Basketballs',ar:'كرات السلة'}, to:'/shop/basketballs', desktopMedia:`${S}/category-basketballs.webp`, mobileMedia:`${S}/category-basketballs.webp`, theme:'dark' },
  { slug:'accessories', title:{en:'Accessories',ar:'الإكسسوارات'}, to:'/shop/accessories', desktopMedia:`${S}/category-accessories.webp`, mobileMedia:`${S}/category-accessories.webp`, theme:'dark' },
  { slug:'equipment', title:{en:'Equipment',ar:'المعدات'}, to:'/shop/equipment', desktopMedia:`${S}/category-equipment.webp`, mobileMedia:`${S}/category-equipment.webp`, theme:'dark' },
];

export type DiscoverCollection = MerchandisingWorld & { rule:'new'|'best'|'featured'|'performance'|'court'|'ready'|'all' };

export const DISCOVER_COLLECTIONS: DiscoverCollection[] = [
  { slug:'trending-now', title:{en:'Trending now',ar:'الرائج الآن'}, eyebrow:{en:'Discover',ar:'اكتشف'}, copy:{en:'A basketball-first edit of products and stories from the current catalogue.',ar:'مختارات مركزة على كرة السلة من المنتجات والقصص داخل الكتالوج الحالي.'}, to:'/discover/trending-now', desktopMedia:`${S}/discover-trending.webp`, mobileMedia:`${S}/discover-trending.webp`, theme:'dark', rule:'best' },
  { slug:'just-dropped', title:{en:'Just dropped',ar:'وصل للتو'}, eyebrow:{en:'Latest',ar:'الأحدث'}, copy:{en:'Recent additions to the live catalogue.',ar:'أحدث الإضافات إلى الكتالوج الحالي.'}, to:'/discover/just-dropped', desktopMedia:`${S}/discover-dropped.webp`, mobileMedia:`${S}/discover-dropped.webp`, theme:'dark', rule:'new' },
  { slug:'new-this-week', title:{en:'New this week',ar:'جديد هذا الأسبوع'}, eyebrow:{en:'New in',ar:'وصل حديثًا'}, copy:{en:'A focused edit of the newest products available to browse.',ar:'اختيارات مركزة من أحدث المنتجات المتاحة للتصفح.'}, to:'/discover/new-this-week', desktopMedia:`${S}/discover-new.webp`, mobileMedia:`${S}/discover-new.webp`, theme:'dark', rule:'new' },
  { slug:'best-sellers', title:{en:'Best sellers',ar:'الأكثر مبيعًا'}, eyebrow:{en:'Popular',ar:'الأكثر طلبًا'}, copy:{en:'Established favourites from the current catalogue.',ar:'منتجات مفضلة من الكتالوج الحالي.'}, to:'/discover/best-sellers', desktopMedia:`${S}/discover-best.webp`, mobileMedia:`${S}/discover-best.webp`, theme:'dark', rule:'best' },
  { slug:'performance-picks', title:{en:'Performance picks',ar:'اختيارات الأداء'}, eyebrow:{en:'Basketball',ar:'كرة السلة'}, copy:{en:'Footwear and gear selected for playing, training and movement.',ar:'أحذية وتجهيزات للعب والتدريب والحركة.'}, to:'/discover/performance-picks', desktopMedia:`${S}/discover-performance.webp`, mobileMedia:`${S}/discover-performance.webp`, theme:'dark', rule:'performance' },
  { slug:'court-essentials', title:{en:'Court essentials',ar:'أساسيات الملعب'}, eyebrow:{en:'Every session',ar:'لكل حصة'}, copy:{en:'Basketballs, accessories and equipment that keep the game moving.',ar:'كرات وإكسسوارات ومعدات تخلي اللعب مستمر.'}, to:'/discover/court-essentials', desktopMedia:`${S}/discover-court.webp`, mobileMedia:`${S}/discover-court.webp`, theme:'dark', rule:'court' },
  { slug:'ready-now', title:{en:'Ready now',ar:'جاهز الآن'}, eyebrow:{en:'Verified stock',ar:'مخزون موثق'}, copy:{en:'Only products with verified ready-to-ship inventory appear here.',ar:'يعرض هنا فقط المخزون الموثق الجاهز للتسليم.'}, to:'/discover/ready-now', desktopMedia:`${S}/discover-ready.webp`, mobileMedia:`${S}/discover-ready.webp`, theme:'dark', rule:'ready' },
  { slug:'shababuna-selects', title:{en:'Shababuna selects',ar:'مختارات شبابنا'}, eyebrow:{en:'The edit',ar:'مختاراتنا'}, copy:{en:'A rotating edit from the products already in the catalogue.',ar:'اختيارات متجددة من المنتجات الموجودة في الكتالوج.'}, to:'/discover/shababuna-selects', desktopMedia:`${S}/discover-selects.webp`, mobileMedia:`${S}/discover-selects.webp`, theme:'dark', rule:'featured' },
];

export const HOME_CAMPAIGN = { title:{en:'Made to move.',ar:'مصنوع للحركة.'}, copy:{en:'Basketball culture, performance and product in one edit.',ar:'ثقافة كرة السلة والأداء والمنتج في مختارات واحدة.'}, desktopMedia:`${S}/home-campaign.webp`, mobileMedia:`${S}/home-campaign.webp` };

export const SHOP_CAMPAIGN = { title:{en:'Made for the court.',ar:'مصنوع للملعب.'}, copy:{en:'Product first. Everything else stays out of the way.',ar:'المنتج أولاً. والباقي يخليه واضح.'}, desktopMedia:LOCAL_HERO_MEDIA.shop.desktopPoster, mobileMedia:LOCAL_HERO_MEDIA.shop.mobilePoster, desktopVideo:LOCAL_HERO_MEDIA.shop.desktopVideo, mobileVideo:LOCAL_HERO_MEDIA.shop.mobileVideo };
