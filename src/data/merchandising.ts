import { LOCAL_HERO_MEDIA } from './localHeroMedia';
import { EDITORIAL as E } from './editorialAssets.ts';
export type LocaleCopy = { en: string; ar: string };
export type MerchandisingWorld = { slug:string; title:LocaleCopy; eyebrow?:LocaleCopy; copy?:LocaleCopy; to:string; desktopMedia:string; mobileMedia?:string; theme?:'light'|'dark' };

// Phase 1 art direction intentionally alternates athletes, teams and product
// imagery so adjacent editorial slots do not repeat the same visual subject.
export const HOME_TRENDS: MerchandisingWorld[] = [
  {slug:'new-this-week',title:{en:'New this week',ar:'جديد هذا الأسبوع'},eyebrow:{en:'Fresh in',ar:'وصل حديثًا'},to:'/discover/new-this-week',desktopMedia:E.lameloChairA,mobileMedia:E.usaWomanCelebrate,theme:'dark'},
  {slug:'performance-picks',title:{en:'Performance picks',ar:'اختيارات الأداء'},eyebrow:{en:'For the game',ar:'للملعب'},to:'/discover/performance-picks',desktopMedia:E.lebronUsa,mobileMedia:E.wheelchairWoman,theme:'dark'},
  {slug:'court-essentials',title:{en:'Court essentials',ar:'أساسيات الملعب'},eyebrow:{en:'Every session',ar:'لكل حصة'},to:'/discover/court-essentials',desktopMedia:E.jordanDunkEvent,mobileMedia:E.jordanDunkVertical,theme:'dark'},
];
export const CATEGORY_WORLDS: MerchandisingWorld[] = [
  {slug:'footwear',title:{en:'Footwear',ar:'الأحذية'},to:'/shop/footwear',desktopMedia:E.goldShoeHands,mobileMedia:E.jordanShoePink,theme:'dark'},
  {slug:'clothing',title:{en:'Apparel',ar:'الملابس'},to:'/shop/clothing',desktopMedia:E.franceGroup,mobileMedia:E.usaWomanCelebrate,theme:'dark'},
  {slug:'basketballs',title:{en:'Basketballs',ar:'كرات السلة'},to:'/shop/basketballs',desktopMedia:E.curryPortraitBall,mobileMedia:E.curryBallPortrait,theme:'dark'},
  {slug:'accessories',title:{en:'Accessories',ar:'الإكسسوارات'},to:'/shop/accessories',desktopMedia:E.lebronCrown,mobileMedia:E.lebronShanghai,theme:'dark'},
  {slug:'equipment',title:{en:'Equipment',ar:'المعدات'},to:'/shop/equipment',desktopMedia:E.jordanBuilding,mobileMedia:E.jordanDunkEvent,theme:'dark'},
];
export type DiscoverCollection = MerchandisingWorld & {rule:'new'|'best'|'featured'|'performance'|'court'|'ready'|'all'};
export const DISCOVER_COLLECTIONS: DiscoverCollection[] = [
  {slug:'trending-now',title:{en:'Trending now',ar:'الرائج الآن'},eyebrow:{en:'Discover',ar:'اكتشف'},copy:{en:'A basketball-first edit of products and stories from the current catalogue.',ar:'مختارات مركزة على كرة السلة من المنتجات والقصص داخل الكتالوج الحالي.'},to:'/discover/trending-now',desktopMedia:E.shanghaiPlayers,mobileMedia:E.franceGroup,theme:'dark',rule:'best'},
  {slug:'just-dropped',title:{en:'Just dropped',ar:'وصل للتو'},eyebrow:{en:'Latest',ar:'الأحدث'},copy:{en:'Recent additions to the live catalogue.',ar:'أحدث الإضافات إلى الكتالوج الحالي.'},to:'/discover/just-dropped',desktopMedia:E.goldShoeHands,mobileMedia:E.jordanShoePink,theme:'dark',rule:'new'},
  {slug:'new-this-week',title:{en:'New this week',ar:'جديد هذا الأسبوع'},eyebrow:{en:'New in',ar:'وصل حديثًا'},copy:{en:'A focused edit of the newest products available to browse.',ar:'اختيارات مركزة من أحدث المنتجات المتاحة للتصفح.'},to:'/discover/new-this-week',desktopMedia:E.lameloChairA,mobileMedia:E.lameloSpaceStanding,theme:'dark',rule:'new'},
  {slug:'best-sellers',title:{en:'Best sellers',ar:'الأكثر مبيعًا'},eyebrow:{en:'Popular',ar:'الأكثر طلبًا'},copy:{en:'Established favourites from the current catalogue.',ar:'منتجات مفضلة من الكتالوج الحالي.'},to:'/discover/best-sellers',desktopMedia:E.lebronShanghai,mobileMedia:E.lebronFullBody,theme:'dark',rule:'best'},
  {slug:'performance-picks',title:{en:'Performance picks',ar:'اختيارات الأداء'},eyebrow:{en:'Basketball',ar:'كرة السلة'},copy:{en:'Footwear and gear selected for playing, training and movement.',ar:'أحذية وتجهيزات للعب والتدريب والحركة.'},to:'/discover/performance-picks',desktopMedia:E.curryDrive,mobileMedia:E.curryLayupVertical,theme:'dark',rule:'performance'},
  {slug:'court-essentials',title:{en:'Court essentials',ar:'أساسيات الملعب'},eyebrow:{en:'Every session',ar:'لكل حصة'},copy:{en:'Basketballs, accessories and equipment that keep the game moving.',ar:'كرات وإكسسوارات ومعدات تخلي اللعب مستمر.'},to:'/discover/court-essentials',desktopMedia:E.usaWomanCelebrate,mobileMedia:E.wheelchairWoman,theme:'dark',rule:'court'},
  {slug:'ready-now',title:{en:'Ready now',ar:'جاهز الآن'},eyebrow:{en:'Verified stock',ar:'مخزون موثق'},copy:{en:'Only products with verified ready-to-ship inventory appear here.',ar:'يعرض هنا فقط المخزون الموثق الجاهز للتسليم.'},to:'/discover/ready-now',desktopMedia:E.tatumSigning,mobileMedia:E.tatumKids,theme:'dark',rule:'ready'},
  {slug:'shababuna-selects',title:{en:'Shababuna selects',ar:'مختارات شبابنا'},eyebrow:{en:'The edit',ar:'مختاراتنا'},copy:{en:'A rotating edit from the products already in the catalogue.',ar:'اختيارات متجددة من المنتجات الموجودة في الكتالوج.'},to:'/discover/shababuna-selects',desktopMedia:E.lukaStylized,mobileMedia:E.lukaRedCourt,theme:'dark',rule:'featured'},
];
export const HOME_CAMPAIGN={title:{en:'Made to move.',ar:'مصنوع للحركة.'},copy:{en:'Basketball culture, performance and product in one edit.',ar:'ثقافة كرة السلة والأداء والمنتج في مختارات واحدة.'},desktopMedia:E.blueDunk,mobileMedia:E.femaleSole};
export const SHOP_CAMPAIGN={title:{en:'Made for the court.',ar:'مصنوع للملعب.'},copy:{en:'Product first. Everything else stays out of the way.',ar:'المنتج أولاً. والباقي يخليه واضح.'},desktopMedia:'',mobileMedia:'',desktopVideo:LOCAL_HERO_MEDIA.shop.desktopVideo,mobileVideo:LOCAL_HERO_MEDIA.shop.mobileVideo};
