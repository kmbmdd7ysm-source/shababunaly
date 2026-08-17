import type { OfficialVideoSource } from '../components/common/EditorialMedia';
import { OFFICIAL_MEDIA } from './officialEditorialMedia.ts';

export type LocaleCopy = { en: string; ar: string };

export type MerchandisingWorld = {
  slug: string;
  title: LocaleCopy;
  eyebrow?: LocaleCopy;
  copy?: LocaleCopy;
  to: string;
  desktopMedia: string;
  mobileMedia?: string;
  desktopVideo?: string;
  mobileVideo?: string;
  officialVideoSource?: OfficialVideoSource;
  theme?: 'light' | 'dark';
};

const DISCOVER_VIDEO_DESKTOP = OFFICIAL_MEDIA.none;
const DISCOVER_VIDEO_MOBILE = OFFICIAL_MEDIA.none;
const SHOP_VIDEO_DESKTOP = OFFICIAL_MEDIA.none;
const SHOP_VIDEO_MOBILE = OFFICIAL_MEDIA.none;

export const HOME_TRENDS: MerchandisingWorld[] = [
  {
    slug: 'new-this-week',
    title: { en: 'New this week', ar: 'جديد هذا الأسبوع' },
    eyebrow: { en: 'Fresh in', ar: 'وصل حديثًا' },
    to: '/discover/new-this-week',
    desktopMedia: OFFICIAL_MEDIA.nbDarius,
    mobileMedia: OFFICIAL_MEDIA.nbDarius,
    desktopVideo: DISCOVER_VIDEO_DESKTOP,
    mobileVideo: DISCOVER_VIDEO_MOBILE,
    theme: 'dark',
  },
  {
    slug: 'performance-picks',
    title: { en: 'Performance picks', ar: 'اختيارات الأداء' },
    eyebrow: { en: 'For the game', ar: 'للملعب' },
    to: '/discover/performance-picks',
    desktopMedia: OFFICIAL_MEDIA.nikeKobeOne,
    mobileMedia: OFFICIAL_MEDIA.nikeKobeOne,
    theme: 'dark',
  },
  {
    slug: 'court-essentials',
    title: { en: 'Court essentials', ar: 'أساسيات الملعب' },
    eyebrow: { en: 'Every session', ar: 'لكل حصة' },
    to: '/discover/court-essentials',
    desktopMedia: OFFICIAL_MEDIA.nbAaron,
    mobileMedia: OFFICIAL_MEDIA.nbAaron,
    theme: 'dark',
  },
];

export const CATEGORY_WORLDS: MerchandisingWorld[] = [
  {
    slug: 'footwear',
    title: { en: 'Footwear', ar: 'الأحذية' },
    to: '/shop/footwear',
    desktopMedia: OFFICIAL_MEDIA.nikeKobeTwo,
    mobileMedia: OFFICIAL_MEDIA.nikeKobeTwo,
    officialVideoSource: 'adidas-ant-20-foot-hoop',
    theme: 'dark',
  },
  {
    slug: 'clothing',
    title: { en: 'Apparel', ar: 'الملابس' },
    to: '/shop/clothing',
    desktopMedia: OFFICIAL_MEDIA.nbJamal,
    mobileMedia: OFFICIAL_MEDIA.nbJamal,
    officialVideoSource: 'newbalance-quiet-noise',
    theme: 'dark',
  },
  {
    slug: 'basketballs',
    title: { en: 'Basketballs', ar: 'كرات السلة' },
    to: '/shop/basketballs',
    desktopMedia: OFFICIAL_MEDIA.spaldingBall,
    mobileMedia: OFFICIAL_MEDIA.spaldingBall,
    theme: 'dark',
  },
  {
    slug: 'accessories',
    title: { en: 'Accessories', ar: 'الإكسسوارات' },
    to: '/shop/accessories',
    desktopMedia: OFFICIAL_MEDIA.spaldingPump,
    mobileMedia: OFFICIAL_MEDIA.spaldingPump,
    theme: 'dark',
  },
  {
    slug: 'equipment',
    title: { en: 'Equipment', ar: 'المعدات' },
    to: '/shop/equipment',
    desktopMedia: OFFICIAL_MEDIA.spaldingBackboard,
    mobileMedia: OFFICIAL_MEDIA.spaldingBackboard,
    theme: 'dark',
  },
];

export type DiscoverCollection = MerchandisingWorld & {
  rule:
    | 'new'
    | 'best'
    | 'featured'
    | 'performance'
    | 'court'
    | 'ready'
    | 'all';
};

export const DISCOVER_COLLECTIONS: DiscoverCollection[] = [
  {
    slug: 'trending-now',
    title: { en: 'Trending now', ar: 'الرائج الآن' },
    eyebrow: { en: 'Discover', ar: 'اكتشف' },
    copy: { en: 'A basketball-focused edit of products and stories from the current catalogue.', ar: 'مختارات مركزة على كرة السلة من المنتجات والقصص داخل الكتالوج الحالي.' },
    to: '/discover/trending-now',
    desktopMedia: OFFICIAL_MEDIA.nikeKobeThree,
    mobileMedia: OFFICIAL_MEDIA.nikeKobeThree,
    desktopVideo: DISCOVER_VIDEO_DESKTOP,
    mobileVideo: DISCOVER_VIDEO_MOBILE,
    officialVideoSource: 'footlocker-hoops-lives-here',
    theme: 'dark',
    rule: 'best',
  },
  {
    slug: 'just-dropped',
    title: { en: 'Just dropped', ar: 'وصل للتو' },
    eyebrow: { en: 'Latest', ar: 'الأحدث' },
    copy: { en: 'Recent additions to the live catalogue, selected for the basketball customer first.', ar: 'أحدث الإضافات للكتالوج المباشر، مختارة أولاً لعميل كرة السلة.' },
    to: '/discover/just-dropped',
    desktopMedia: OFFICIAL_MEDIA.nikeKobeGroup,
    mobileMedia: OFFICIAL_MEDIA.nikeKobeGroup,
    officialVideoSource: 'nike-kobe-conductor',
    theme: 'dark',
    rule: 'new',
  },
  {
    slug: 'new-this-week',
    title: { en: 'New this week', ar: 'جديد هذا الأسبوع' },
    eyebrow: { en: 'New in', ar: 'وصل حديثًا' },
    copy: { en: 'A focused edit of the newest products available to browse.', ar: 'اختيارات مركزة من أحدث المنتجات المتاحة للتصفح.' },
    to: '/discover/new-this-week',
    desktopMedia: OFFICIAL_MEDIA.nbCooper,
    mobileMedia: OFFICIAL_MEDIA.nbCooper,
    officialVideoSource: 'footlocker-ant-adidas',
    theme: 'dark',
    rule: 'new',
  },
  {
    slug: 'best-sellers',
    title: { en: 'Best sellers', ar: 'الأكثر مبيعًا' },
    eyebrow: { en: 'Popular', ar: 'الأكثر طلبًا' },
    copy: { en: 'Established favourites from the current catalogue.', ar: 'منتجات مفضلة من الكتالوج الحالي.' },
    to: '/discover/best-sellers',
    desktopMedia: OFFICIAL_MEDIA.nbKawhi,
    mobileMedia: OFFICIAL_MEDIA.nbKawhi,
    officialVideoSource: 'footlocker-melo-puma',
    theme: 'dark',
    rule: 'best',
  },
  {
    slug: 'performance-picks',
    title: { en: 'Performance picks', ar: 'اختيارات الأداء' },
    eyebrow: { en: 'Basketball', ar: 'كرة السلة' },
    copy: { en: 'Footwear and gear selected for playing, training and movement.', ar: 'أحذية وتجهيزات للعب والتدريب والحركة.' },
    to: '/discover/performance-picks',
    desktopMedia: OFFICIAL_MEDIA.nbAaron,
    mobileMedia: OFFICIAL_MEDIA.nbAaron,
    theme: 'dark',
    rule: 'performance',
  },
  {
    slug: 'court-essentials',
    title: { en: 'Court essentials', ar: 'أساسيات الملعب' },
    eyebrow: { en: 'Every session', ar: 'لكل حصة' },
    copy: { en: 'Basketballs, accessories and equipment that keep the game moving.', ar: 'كرات وإكسسوارات ومعدات تخلي اللعب مستمر.' },
    to: '/discover/court-essentials',
    desktopMedia: OFFICIAL_MEDIA.spaldingBall,
    mobileMedia: OFFICIAL_MEDIA.spaldingBall,
    theme: 'dark',
    rule: 'court',
  },
  {
    slug: 'ready-now',
    title: { en: 'Ready now', ar: 'جاهز الآن' },
    eyebrow: { en: 'Verified stock', ar: 'مخزون موثق' },
    copy: { en: 'Only products with verified ready-to-ship inventory appear here.', ar: 'يعرض هنا فقط المخزون الموثق الجاهز للتسليم.' },
    to: '/discover/ready-now',
    desktopMedia: OFFICIAL_MEDIA.nbNickSmith,
    mobileMedia: OFFICIAL_MEDIA.nbNickSmith,
    theme: 'dark',
    rule: 'ready',
  },
  {
    slug: 'shababuna-selects',
    title: { en: 'Shababuna selects', ar: 'مختارات شبابنا' },
    eyebrow: { en: 'The edit', ar: 'مختاراتنا' },
    copy: { en: 'A rotating edit from the products already in the catalogue.', ar: 'اختيارات متجددة من المنتجات الموجودة في الكتالوج.' },
    to: '/discover/shababuna-selects',
    desktopMedia: OFFICIAL_MEDIA.nbZach,
    mobileMedia: OFFICIAL_MEDIA.nbZach,
    desktopVideo: DISCOVER_VIDEO_DESKTOP,
    mobileVideo: DISCOVER_VIDEO_MOBILE,
    theme: 'dark',
    rule: 'featured',
  },
];

export const HOME_CAMPAIGN = {
  title: { en: 'Made to move.', ar: 'مصنوع للحركة.' },
  copy: { en: 'Basketball culture, performance and product in one edit.', ar: 'ثقافة كرة السلة والأداء والمنتج في مختارات واحدة.' },
  desktopMedia: OFFICIAL_MEDIA.nbCameron,
  mobileMedia: OFFICIAL_MEDIA.nbCameron,
};

export const SHOP_CAMPAIGN = {
  title: { en: 'Made for the court.', ar: 'مصنوع للملعب.' },
  copy: { en: 'Product first. Everything else stays out of the way.', ar: 'المنتج أولاً. والباقي يخليه واضح.' },
  desktopMedia: OFFICIAL_MEDIA.nbTyrese,
  mobileMedia: OFFICIAL_MEDIA.nbTyrese,
  desktopVideo: SHOP_VIDEO_DESKTOP,
  mobileVideo: SHOP_VIDEO_MOBILE,
  officialVideoSource: 'adidas-basketball-is-everything' as const,
};
