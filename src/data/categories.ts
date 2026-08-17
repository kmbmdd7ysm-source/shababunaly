import { OFFICIAL_MEDIA } from './officialEditorialMedia.ts';

/** @typedef {{ en: string, ar: string }} LocalizedLabel
 * @typedef {{ slug: string, name: LocalizedLabel, image: string }} Subcategory
 * @typedef {{ slug: string, name: LocalizedLabel, image: string, virtual?: string, subcategories: Subcategory[] }} Category
 */
/** @type {Category[]} */
export const categories = [
  {
    slug: 'ready-to-ship',
    name: { en: 'Ready to Ship', ar: 'تسليم فوري' },
    image: OFFICIAL_MEDIA.nikeKobeHeroDesktop,
    virtual: 'readyToShip',
    subcategories: [],
  },
  {
    slug: 'clothing',
    name: { en: 'Clothing', ar: 'الملابس' },
    image: OFFICIAL_MEDIA.nbKawhi,
    subcategories: [
      {
        slug: 'game-jerseys',
        name: { en: 'Game Jerseys', ar: 'سيريات اللعب' },
        image: OFFICIAL_MEDIA.nbKawhi,
      },
      {
        slug: 'game-shorts',
        name: { en: 'Game Shorts', ar: 'شورتات اللعب' },
        image: OFFICIAL_MEDIA.nbKawhi,
      },
      {
        slug: 'game-sets',
        name: { en: 'Full Game Sets', ar: 'أطقم لعب كاملة' },
        image: OFFICIAL_MEDIA.nbKawhi,
      },
      {
        slug: 'practice-jerseys',
        name: { en: 'Practice Jerseys', ar: 'سيريات التمرين' },
        image: OFFICIAL_MEDIA.nbKawhi,
      },
      {
        slug: 'practice-shorts',
        name: { en: 'Practice Shorts', ar: 'شورتات التمرين' },
        image: OFFICIAL_MEDIA.nbKawhi,
      },
      {
        slug: 't-shirts',
        name: { en: 'T-Shirts', ar: 'تيشيرتات' },
        image: OFFICIAL_MEDIA.nbKawhi,
      },
      {
        slug: 'hoodies',
        name: { en: 'Hoodies', ar: 'هوديز' },
        image: OFFICIAL_MEDIA.nbKawhi,
      },
      { slug: 'pants', name: { en: 'Pants', ar: 'سراويل' }, image: OFFICIAL_MEDIA.nbKawhi },
      {
        slug: 'tracksuits',
        name: { en: 'Tracksuits', ar: 'بدلات رياضية' },
        image: OFFICIAL_MEDIA.nbKawhi,
      },
      {
        slug: 'compression',
        name: { en: 'Compression', ar: 'ملابس ضاغطة' },
        image: OFFICIAL_MEDIA.nbKawhi,
      },
      {
        slug: 'socks',
        name: { en: 'Socks', ar: 'جوارب' },
        image: OFFICIAL_MEDIA.spaldingPump,
      },
    ],
  },
  {
    slug: 'footwear',
    name: { en: 'Footwear', ar: 'الأحذية' },
    image: OFFICIAL_MEDIA.nikeKobeGroup,
    subcategories: [
      {
        slug: 'in-court',
        name: { en: 'In-Court', ar: 'داخل الملعب' },
        image: OFFICIAL_MEDIA.nikeKobeGroup,
      },
      {
        slug: 'off-court',
        name: { en: 'Off-Court', ar: 'خارج الملعب' },
        image: OFFICIAL_MEDIA.nikeKobeGroup,
      },
    ],
  },
  {
    slug: 'accessories',
    name: { en: 'Accessories', ar: 'الإكسسوارات' },
    image: OFFICIAL_MEDIA.spaldingPump,
    subcategories: [
      { slug: 'bags', name: { en: 'Bags', ar: 'حقائب' }, image: OFFICIAL_MEDIA.spaldingPump },
      {
        slug: 'socks',
        name: { en: 'Socks', ar: 'جوارب' },
        image: OFFICIAL_MEDIA.spaldingPump,
      },
      {
        slug: 'sleeves',
        name: { en: 'Sleeves', ar: 'سليفس' },
        image: OFFICIAL_MEDIA.spaldingPump,
      },
      {
        slug: 'supports',
        name: { en: 'Supports & Protection', ar: 'الدعامات والحماية' },
        image: OFFICIAL_MEDIA.spaldingPump,
      },
      {
        slug: 'headwear',
        name: { en: 'Headwear', ar: 'قبعات وأغطية رأس' },
        image: OFFICIAL_MEDIA.spaldingPump,
      },
      {
        slug: 'towels',
        name: { en: 'Towels', ar: 'مناشف' },
        image: OFFICIAL_MEDIA.spaldingPump,
      },
      {
        slug: 'bottles',
        name: { en: 'Bottles', ar: 'قوارير' },
        image: OFFICIAL_MEDIA.spaldingPump,
      },
      {
        slug: 'stickers-patches',
        name: { en: 'Stickers & Patches', ar: 'لاصقات وباتشات' },
        image: OFFICIAL_MEDIA.spaldingPump,
      },
      {
        slug: 'training-accessories',
        name: { en: 'Training Accessories', ar: 'إكسسوارات التدريب' },
        image: OFFICIAL_MEDIA.spaldingBackboard,
      },
    ],
  },
  {
    slug: 'basketballs',
    name: { en: 'Basketballs', ar: 'كرات السلة' },
    image: OFFICIAL_MEDIA.spaldingBall,
    subcategories: [
      {
        slug: 'indoor',
        name: { en: 'Indoor', ar: 'داخل الصالات' },
        image: OFFICIAL_MEDIA.spaldingBall,
      },
      {
        slug: 'outdoor',
        name: { en: 'Outdoor', ar: 'خارج الصالات' },
        image: OFFICIAL_MEDIA.spaldingBall,
      },
      {
        slug: 'indoor-outdoor',
        name: { en: 'Indoor / Outdoor', ar: 'داخلي وخارجي' },
        image: OFFICIAL_MEDIA.spaldingBall,
      },
      {
        slug: 'custom-balls',
        name: { en: 'Custom Basketballs', ar: 'كرات بتصميم خاص' },
        image: OFFICIAL_MEDIA.spaldingBall,
      },
    ],
  },
  {
    slug: 'equipment',
    name: { en: 'Equipment', ar: 'المعدات' },
    image: OFFICIAL_MEDIA.spaldingBackboard,
    subcategories: [
      {
        slug: 'hoops-backboards',
        name: { en: 'Hoops & Backboards', ar: 'السلات والبوردات' },
        image: OFFICIAL_MEDIA.spaldingBackboard,
      },
      {
        slug: 'rims-nets',
        name: { en: 'Rims & Nets', ar: 'الريمات والشبكات' },
        image: OFFICIAL_MEDIA.spaldingBackboard,
      },
      {
        slug: 'scoreboards-shot-clocks',
        name: { en: 'Scoreboards & Shot Clocks', ar: 'لوحات النتائج وساعات 24 ثانية' },
        image: OFFICIAL_MEDIA.spaldingBackboard,
      },
      {
        slug: 'ball-carts',
        name: { en: 'Ball Carts', ar: 'عربات الكرات' },
        image: OFFICIAL_MEDIA.spaldingBackboard,
      },
      {
        slug: 'court-equipment',
        name: { en: 'Court Equipment', ar: 'تجهيزات الملاعب' },
        image: OFFICIAL_MEDIA.spaldingBackboard,
      },
      {
        slug: 'pumps-needles',
        name: { en: 'Pumps & Needles', ar: 'مضخات وإبر' },
        image: OFFICIAL_MEDIA.spaldingBackboard,
      },
    ],
  },
];

export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);
export const getSubcategory = (categorySlug: string, subSlug: string) =>
  getCategory(categorySlug)?.subcategories.find((s) => s.slug === subSlug);
export const allSubcategories = categories.flatMap((c) =>
  c.subcategories.map((s) => ({ ...s, category: c.slug, categoryName: c.name })),
);
export const findSubcategoryAnywhere = (subSlug: string) =>
  allSubcategories.find((s) => s.slug === subSlug);
