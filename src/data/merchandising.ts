import { LOCAL_HERO_MEDIA } from './localHeroMedia';
export type LocaleCopy = { en: string; ar: string };
export type MerchandisingWorld = { slug:string; title:LocaleCopy; eyebrow?:LocaleCopy; copy?:LocaleCopy; to:string; desktopMedia:string; mobileMedia?:string; theme?:'light'|'dark' };
const L='/media/localized-brand';
const H='/media/hero-posters';
const P='/images/products';

export const HOME_TRENDS: MerchandisingWorld[] = [
  {slug:'new-this-week',title:{en:'New this week',ar:'جديد هذا الأسبوع'},eyebrow:{en:'Fresh in',ar:'وصل حديثًا'},to:'/discover/new-this-week',desktopMedia:`${L}/nike_case.webp`,mobileMedia:`${L}/square_book2.webp`,theme:'dark'},
  {slug:'performance-picks',title:{en:'Performance picks',ar:'اختيارات الأداء'},eyebrow:{en:'For the game',ar:'للملعب'},to:'/discover/performance-picks',desktopMedia:`${L}/nike_court.webp`,mobileMedia:`${L}/portrait_atwo.webp`,theme:'dark'},
  {slug:'court-essentials',title:{en:'Court essentials',ar:'أساسيات الملعب'},eyebrow:{en:'Every session',ar:'لكل حصة'},to:'/discover/court-essentials',desktopMedia:`${L}/puma_court.png`,mobileMedia:`${L}/ua_dribble.png`,theme:'dark'},
];
export const CATEGORY_WORLDS: MerchandisingWorld[] = [
  {slug:'footwear',title:{en:'Footwear',ar:'الأحذية'},to:'/shop/footwear',desktopMedia:`${L}/square_sabrina.webp`,mobileMedia:`${L}/nike_white_shoe.png`,theme:'dark'},
  {slug:'clothing',title:{en:'Apparel',ar:'الملابس'},to:'/shop/clothing',desktopMedia:`${L}/adidas_team.png`,mobileMedia:`${L}/nike-teamwear-courtside.webp`,theme:'dark'},
  {slug:'basketballs',title:{en:'Basketballs',ar:'كرات السلة'},to:'/shop/basketballs',desktopMedia:`${H}/basketballs.webp`,mobileMedia:`${H}/basketballs.webp`,theme:'dark'},
  {slug:'accessories',title:{en:'Accessories',ar:'الإكسسوارات'},to:'/shop/accessories',desktopMedia:`${P}/lha-elite-basketball-backpack-black.webp`,mobileMedia:`${P}/lha-elite-basketball-backpack-black.webp`,theme:'dark'},
  {slug:'equipment',title:{en:'Equipment',ar:'المعدات'},to:'/shop/equipment',desktopMedia:`${L}/puma_court.png`,mobileMedia:`${L}/puma_court.png`,theme:'dark'},
];
export type DiscoverCollection = MerchandisingWorld & {rule:'new'|'best'|'featured'|'performance'|'court'|'ready'|'all'};
export const DISCOVER_COLLECTIONS: DiscoverCollection[] = [
  {slug:'trending-now',title:{en:'Trending now',ar:'الرائج الآن'},eyebrow:{en:'Discover',ar:'اكتشف'},copy:{en:'A basketball-first edit of products and stories from the current catalogue.',ar:'مختارات مركزة على كرة السلة من المنتجات والقصص داخل الكتالوج الحالي.'},to:'/discover/trending-now',desktopMedia:`${L}/adidas_face_shoe.png`,mobileMedia:`${L}/portrait_closeup.webp`,theme:'dark',rule:'best'},
  {slug:'just-dropped',title:{en:'Just dropped',ar:'وصل للتو'},eyebrow:{en:'Latest',ar:'الأحدث'},copy:{en:'Recent additions to the live catalogue.',ar:'أحدث الإضافات إلى الكتالوج الحالي.'},to:'/discover/just-dropped',desktopMedia:`${L}/nike_pink_product.webp`,mobileMedia:`${L}/portrait_aone.webp`,theme:'dark',rule:'new'},
  {slug:'new-this-week',title:{en:'New this week',ar:'جديد هذا الأسبوع'},eyebrow:{en:'New in',ar:'وصل حديثًا'},copy:{en:'A focused edit of the newest products available to browse.',ar:'اختيارات مركزة من أحدث المنتجات المتاحة للتصفح.'},to:'/discover/new-this-week',desktopMedia:`${L}/nike_case.webp`,mobileMedia:`${L}/square_book2.webp`,theme:'dark',rule:'new'},
  {slug:'best-sellers',title:{en:'Best sellers',ar:'الأكثر مبيعًا'},eyebrow:{en:'Popular',ar:'الأكثر طلبًا'},copy:{en:'Established favourites from the current catalogue.',ar:'منتجات مفضلة من الكتالوج الحالي.'},to:'/discover/best-sellers',desktopMedia:`${L}/nike_pyramid.webp`,mobileMedia:`${L}/square_sabrina.webp`,theme:'dark',rule:'best'},
  {slug:'performance-picks',title:{en:'Performance picks',ar:'اختيارات الأداء'},eyebrow:{en:'Basketball',ar:'كرة السلة'},copy:{en:'Footwear and gear selected for playing, training and movement.',ar:'أحذية وتجهيزات للعب والتدريب والحركة.'},to:'/discover/performance-picks',desktopMedia:`${L}/nike_green_product.webp`,mobileMedia:`${L}/square_sabrina.webp`,theme:'dark',rule:'performance'},
  {slug:'court-essentials',title:{en:'Court essentials',ar:'أساسيات الملعب'},eyebrow:{en:'Every session',ar:'لكل حصة'},copy:{en:'Basketballs, accessories and equipment that keep the game moving.',ar:'كرات وإكسسوارات ومعدات تخلي اللعب مستمر.'},to:'/discover/court-essentials',desktopMedia:`${L}/puma_court.png`,mobileMedia:`${L}/ua_dribble.png`,theme:'dark',rule:'court'},
  {slug:'ready-now',title:{en:'Ready now',ar:'جاهز الآن'},eyebrow:{en:'Verified stock',ar:'مخزون موثق'},copy:{en:'Only products with verified ready-to-ship inventory appear here.',ar:'يعرض هنا فقط المخزون الموثق الجاهز للتسليم.'},to:'/discover/ready-now',desktopMedia:`${P}/lha-elite-basketball-backpack-black.webp`,mobileMedia:`${P}/lha-elite-basketball-backpack-black.webp`,theme:'dark',rule:'ready'},
  {slug:'shababuna-selects',title:{en:'Shababuna selects',ar:'مختارات شبابنا'},eyebrow:{en:'The edit',ar:'مختاراتنا'},copy:{en:'A rotating edit from the products already in the catalogue.',ar:'اختيارات متجددة من المنتجات الموجودة في الكتالوج.'},to:'/discover/shababuna-selects',desktopMedia:`${L}/portrait_closeup.webp`,mobileMedia:`${L}/portrait_closeup.webp`,theme:'dark',rule:'featured'},
];
export const HOME_CAMPAIGN={title:{en:'Made to move.',ar:'مصنوع للحركة.'},copy:{en:'Basketball culture, performance and product in one edit.',ar:'ثقافة كرة السلة والأداء والمنتج في مختارات واحدة.'},desktopMedia:`${L}/nike_pyramid.webp`,mobileMedia:`${L}/portrait_aone.webp`};
export const SHOP_CAMPAIGN={title:{en:'Made for the court.',ar:'مصنوع للملعب.'},copy:{en:'Product first. Everything else stays out of the way.',ar:'المنتج أولاً. والباقي يخليه واضح.'},desktopMedia:LOCAL_HERO_MEDIA.shop.desktopPoster,mobileMedia:LOCAL_HERO_MEDIA.shop.mobilePoster,desktopVideo:LOCAL_HERO_MEDIA.shop.desktopVideo,mobileVideo:LOCAL_HERO_MEDIA.shop.mobileVideo};
