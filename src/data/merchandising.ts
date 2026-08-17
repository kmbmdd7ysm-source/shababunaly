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
  theme?: 'light' | 'dark';
};

const HERO_VIDEO_DESKTOP = '/media/hero/shababuna-hero-desktop.mp4';
const HERO_VIDEO_MOBILE = '/media/hero/shababuna-hero-mobile.mp4';
const DISCOVER_VIDEO_DESKTOP = '/media/editorial/discover-hero-desktop.mp4';
const DISCOVER_VIDEO_MOBILE = '/media/editorial/discover-hero-mobile.mp4';
const SHOP_VIDEO_DESKTOP = '/media/editorial/shop-campaign-desktop.mp4';
const SHOP_VIDEO_MOBILE = '/media/editorial/shop-campaign-mobile.mp4';

export const HOME_TRENDS: MerchandisingWorld[] = [
  {
    slug: 'new-this-week',
    title: { en: 'New this week', ar: 'جديد هذا الأسبوع' },
    eyebrow: { en: 'Fresh in', ar: 'وصل حديثًا' },
    to: '/discover/new-this-week',
    desktopMedia: '/images/products/kobe/goat/kobe-8-halo.webp',
    mobileMedia: '/images/products/kobe/goat/kobe-8-halo.webp',
    desktopVideo: DISCOVER_VIDEO_DESKTOP,
    mobileVideo: DISCOVER_VIDEO_MOBILE,
    theme: 'dark',
  },
  {
    slug: 'performance-picks',
    title: { en: 'Performance picks', ar: 'اختيارات الأداء' },
    eyebrow: { en: 'For the game', ar: 'للملعب' },
    to: '/discover/performance-picks',
    desktopMedia: '/images/products/kobe/goat/kobe-4-gold-medal.webp',
    mobileMedia: '/images/products/kobe/goat/kobe-4-gold-medal.webp',
    theme: 'dark',
  },
  {
    slug: 'court-essentials',
    title: { en: 'Court essentials', ar: 'أساسيات الملعب' },
    eyebrow: { en: 'Every session', ar: 'لكل حصة' },
    to: '/discover/court-essentials',
    desktopMedia: '/images/products/lha-elite-basketball-backpack-black.webp',
    mobileMedia: '/images/products/lha-elite-basketball-backpack-black.webp',
    theme: 'dark',
  },
];

export const CATEGORY_WORLDS: MerchandisingWorld[] = [
  {
    slug: 'footwear',
    title: { en: 'Footwear', ar: 'الأحذية' },
    to: '/shop/footwear',
    desktopMedia: '/images/products/kobe/goat/kobe-6-grinch.webp',
    mobileMedia: '/images/products/kobe/goat/kobe-6-grinch.webp',
    theme: 'dark',
  },
  {
    slug: 'clothing',
    title: { en: 'Apparel', ar: 'الملابس' },
    to: '/shop/clothing',
    desktopMedia: '/images/products/lha-premium-fleece-set-black.webp',
    mobileMedia: '/images/products/lha-premium-fleece-set-black.webp',
    theme: 'dark',
  },
  {
    slug: 'basketballs',
    title: { en: 'Basketballs', ar: 'كرات السلة' },
    to: '/shop/basketballs',
    desktopMedia: '/media/atmosphere/court-overhead-1600.webp',
    mobileMedia: '/media/atmosphere/court-overhead-1024.webp',
    theme: 'dark',
  },
  {
    slug: 'accessories',
    title: { en: 'Accessories', ar: 'الإكسسوارات' },
    to: '/shop/accessories',
    desktopMedia: '/images/products/lha-academy-backpack-black.webp',
    mobileMedia: '/images/products/lha-academy-backpack-black.webp',
    theme: 'dark',
  },
  {
    slug: 'equipment',
    title: { en: 'Equipment', ar: 'المعدات' },
    to: '/shop/equipment',
    desktopMedia: '/media/atmosphere/arena-wide-1600.webp',
    mobileMedia: '/media/atmosphere/arena-tall-1200.webp',
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
    copy: { en: 'An edit of established favourites from the current catalogue.', ar: 'مختارات من المنتجات المفضلة في الكتالوج الحالي.' },
    to: '/discover/trending-now',
    desktopMedia: '/images/products/kobe/goat/kobe-6-grinch.webp',
    mobileMedia: '/images/products/kobe/goat/kobe-6-grinch.webp',
    desktopVideo: DISCOVER_VIDEO_DESKTOP,
    mobileVideo: DISCOVER_VIDEO_MOBILE,
    theme: 'dark',
    rule: 'best',
  },
  {
    slug: 'just-dropped',
    title: { en: 'Just dropped', ar: 'وصل للتو' },
    eyebrow: { en: 'Latest', ar: 'الأحدث' },
    copy: { en: 'Recent additions to the live catalogue.', ar: 'أحدث الإضافات إلى الكتالوج الحالي.' },
    to: '/discover/just-dropped',
    desktopMedia: '/images/products/kobe/goat/kobe-8-halo.webp',
    mobileMedia: '/images/products/kobe/goat/kobe-8-halo.webp',
    theme: 'dark',
    rule: 'new',
  },
  {
    slug: 'new-this-week',
    title: { en: 'New this week', ar: 'جديد هذا الأسبوع' },
    eyebrow: { en: 'New in', ar: 'وصل حديثًا' },
    copy: { en: 'A focused edit of the newest products available to browse.', ar: 'اختيارات مركزة من أحدث المنتجات المتاحة للتصفح.' },
    to: '/discover/new-this-week',
    desktopMedia: '/images/products/own-the-game-essential-tee-white.webp',
    mobileMedia: '/images/products/own-the-game-essential-tee-white.webp',
    theme: 'dark',
    rule: 'new',
  },
  {
    slug: 'best-sellers',
    title: { en: 'Best sellers', ar: 'الأكثر مبيعًا' },
    eyebrow: { en: 'Popular', ar: 'الأكثر طلبًا' },
    copy: { en: 'Established favourites from the current catalogue.', ar: 'منتجات مفضلة من الكتالوج الحالي.' },
    to: '/discover/best-sellers',
    desktopMedia: '/images/products/lha-premium-fleece-set-black.webp',
    mobileMedia: '/images/products/lha-premium-fleece-set-black.webp',
    theme: 'dark',
    rule: 'best',
  },
  {
    slug: 'performance-picks',
    title: { en: 'Performance picks', ar: 'اختيارات الأداء' },
    eyebrow: { en: 'Basketball', ar: 'كرة السلة' },
    copy: { en: 'Footwear and gear selected for playing, training and movement.', ar: 'أحذية وتجهيزات للعب والتدريب والحركة.' },
    to: '/discover/performance-picks',
    desktopMedia: '/images/products/kobe/goat/kobe-4-gold-medal.webp',
    mobileMedia: '/images/products/kobe/goat/kobe-4-gold-medal.webp',
    theme: 'dark',
    rule: 'performance',
  },
  {
    slug: 'court-essentials',
    title: { en: 'Court essentials', ar: 'أساسيات الملعب' },
    eyebrow: { en: 'Every session', ar: 'لكل حصة' },
    copy: { en: 'Basketballs, accessories and equipment that keep the game moving.', ar: 'كرات وإكسسوارات ومعدات تخلي اللعب مستمر.' },
    to: '/discover/court-essentials',
    desktopMedia: '/media/atmosphere/court-overhead-1600.webp',
    mobileMedia: '/media/atmosphere/court-overhead-1024.webp',
    theme: 'dark',
    rule: 'court',
  },
  {
    slug: 'ready-now',
    title: { en: 'Ready now', ar: 'جاهز الآن' },
    eyebrow: { en: 'Verified stock', ar: 'مخزون موثق' },
    copy: { en: 'Only products with verified ready-to-ship inventory appear here.', ar: 'يعرض هنا فقط المخزون الموثق الجاهز للتسليم.' },
    to: '/discover/ready-now',
    desktopMedia: '/images/products/lha-elite-basketball-backpack-white.webp',
    mobileMedia: '/images/products/lha-elite-basketball-backpack-white.webp',
    theme: 'dark',
    rule: 'ready',
  },
  {
    slug: 'shababuna-selects',
    title: { en: 'Shababuna selects', ar: 'مختارات شبابنا' },
    eyebrow: { en: 'The edit', ar: 'مختاراتنا' },
    copy: { en: 'A rotating edit from the products already in the catalogue.', ar: 'اختيارات متجددة من المنتجات الموجودة في الكتالوج.' },
    to: '/discover/shababuna-selects',
    desktopMedia: '/images/products/own-the-game-zip-hoodie-grey.webp',
    mobileMedia: '/images/products/own-the-game-zip-hoodie-grey.webp',
    desktopVideo: DISCOVER_VIDEO_DESKTOP,
    mobileVideo: DISCOVER_VIDEO_MOBILE,
    theme: 'dark',
    rule: 'featured',
  },
];

export const SHOP_CAMPAIGN = {
  title: { en: 'Made for the court.', ar: 'مصنوع للملعب.' },
  copy: { en: 'Product first. Everything else stays out of the way.', ar: 'المنتج أولاً. والباقي يخليه واضح.' },
  desktopMedia: '/images/products/lha-premium-fleece-set-black.webp',
  mobileMedia: '/images/products/lha-premium-fleece-set-black.webp',
  desktopVideo: SHOP_VIDEO_DESKTOP,
  mobileVideo: SHOP_VIDEO_MOBILE,
};
