/** @typedef {{ en: string, ar: string }} LocalizedLabel
 * @typedef {{ slug: string, name: LocalizedLabel, image: string }} Subcategory
 * @typedef {{ slug: string, name: LocalizedLabel, image: string, virtual?: string, subcategories: Subcategory[] }} Category
 */
/** @type {Category[]} */
export const categories = [
  {
    slug: 'ready-to-ship',
    name: { en: 'Ready to Ship', ar: 'تسليم فوري' },
    image: '/images/catalog/ready.svg',
    virtual: 'readyToShip',
    subcategories: [],
  },
  {
    slug: 'clothing',
    name: { en: 'Clothing', ar: 'الملابس' },
    image: '/images/catalog/apparel.svg',
    subcategories: [
      { slug: 'game-jerseys', name: { en: 'Game Jerseys', ar: 'سيريات اللعب' }, image: '/images/catalog/jersey.svg' },
      { slug: 'game-shorts', name: { en: 'Game Shorts', ar: 'شورتات اللعب' }, image: '/images/catalog/shorts.svg' },
      { slug: 'game-sets', name: { en: 'Full Game Sets', ar: 'أطقم لعب كاملة' }, image: '/images/catalog/apparel.svg' },
      { slug: 'practice-jerseys', name: { en: 'Practice Jerseys', ar: 'سيريات التمرين' }, image: '/images/catalog/training.svg' },
      { slug: 'practice-shorts', name: { en: 'Practice Shorts', ar: 'شورتات التمرين' }, image: '/images/catalog/shorts.svg' },
      { slug: 't-shirts', name: { en: 'T-Shirts', ar: 'تيشيرتات' }, image: '/images/catalog/training.svg' },
      { slug: 'hoodies', name: { en: 'Hoodies', ar: 'هوديز' }, image: '/images/catalog/hoodie.svg' },
      { slug: 'pants', name: { en: 'Pants', ar: 'سراويل' }, image: '/images/catalog/pants.svg' },
      { slug: 'tracksuits', name: { en: 'Tracksuits', ar: 'بدلات رياضية' }, image: '/images/catalog/apparel.svg' },
      { slug: 'compression', name: { en: 'Compression', ar: 'ملابس ضاغطة' }, image: '/images/catalog/training.svg' },
      { slug: 'socks', name: { en: 'Socks', ar: 'جوارب' }, image: '/images/catalog/accessories.svg' },
    ],
  },
  {
    slug: 'footwear',
    name: { en: 'Footwear', ar: 'الأحذية' },
    image: '/images/catalog/shoe.svg',
    subcategories: [
      { slug: 'in-court', name: { en: 'In-Court', ar: 'داخل الملعب' }, image: '/images/catalog/shoe.svg' },
      { slug: 'off-court', name: { en: 'Off-Court', ar: 'خارج الملعب' }, image: '/images/catalog/lifestyle-shoe.svg' },
    ],
  },
  {
    slug: 'accessories',
    name: { en: 'Accessories', ar: 'الإكسسوارات' },
    image: '/images/catalog/accessories.svg',
    subcategories: [
      { slug: 'bags', name: { en: 'Bags', ar: 'حقائب' }, image: '/images/catalog/bag.svg' },
      { slug: 'socks', name: { en: 'Socks', ar: 'جوارب' }, image: '/images/catalog/accessories.svg' },
      { slug: 'sleeves', name: { en: 'Sleeves', ar: 'سليفس' }, image: '/images/catalog/sleeve.svg' },
      { slug: 'supports', name: { en: 'Supports & Protection', ar: 'الدعامات والحماية' }, image: '/images/catalog/sleeve.svg' },
      { slug: 'headwear', name: { en: 'Headwear', ar: 'قبعات وأغطية رأس' }, image: '/images/catalog/accessories.svg' },
      { slug: 'towels', name: { en: 'Towels', ar: 'مناشف' }, image: '/images/catalog/accessories.svg' },
      { slug: 'bottles', name: { en: 'Bottles', ar: 'قوارير' }, image: '/images/catalog/accessories.svg' },
      { slug: 'stickers-patches', name: { en: 'Stickers & Patches', ar: 'لاصقات وباتشات' }, image: '/images/catalog/accessories.svg' },
      { slug: 'training-accessories', name: { en: 'Training Accessories', ar: 'إكسسوارات التدريب' }, image: '/images/catalog/equipment.svg' },
    ],
  },
  {
    slug: 'basketballs',
    name: { en: 'Basketballs', ar: 'كرات السلة' },
    image: '/images/catalog/ball.svg',
    subcategories: [
      { slug: 'indoor', name: { en: 'Indoor', ar: 'داخل الصالات' }, image: '/images/catalog/ball.svg' },
      { slug: 'outdoor', name: { en: 'Outdoor', ar: 'خارج الصالات' }, image: '/images/catalog/ball.svg' },
      { slug: 'indoor-outdoor', name: { en: 'Indoor / Outdoor', ar: 'داخلي وخارجي' }, image: '/images/catalog/ball.svg' },
      { slug: 'custom-balls', name: { en: 'Custom Basketballs', ar: 'كرات بتصميم خاص' }, image: '/images/catalog/custom.svg' },
    ],
  },
  {
    slug: 'equipment',
    name: { en: 'Equipment', ar: 'المعدات' },
    image: '/images/catalog/equipment.svg',
    subcategories: [
      { slug: 'hoops-backboards', name: { en: 'Hoops & Backboards', ar: 'السلات والبوردات' }, image: '/images/catalog/hoop.svg' },
      { slug: 'rims-nets', name: { en: 'Rims & Nets', ar: 'الريمات والشبكات' }, image: '/images/catalog/hoop.svg' },
      { slug: 'scoreboards-shot-clocks', name: { en: 'Scoreboards & Shot Clocks', ar: 'لوحات النتائج وساعات 24 ثانية' }, image: '/images/catalog/shot-clock.svg' },
      { slug: 'ball-carts', name: { en: 'Ball Carts', ar: 'عربات الكرات' }, image: '/images/catalog/equipment.svg' },
      { slug: 'court-equipment', name: { en: 'Court Equipment', ar: 'تجهيزات الملاعب' }, image: '/images/catalog/equipment.svg' },
      { slug: 'pumps-needles', name: { en: 'Pumps & Needles', ar: 'مضخات وإبر' }, image: '/images/catalog/equipment.svg' },
    ],
  },
];

/** @param {string} slug */
export const getCategory = (slug) => categories.find((c) => c.slug === slug);
/** @param {string} categorySlug @param {string} subSlug */
export const getSubcategory = (categorySlug, subSlug) =>
  getCategory(categorySlug)?.subcategories.find((s) => s.slug === subSlug);
export const allSubcategories = categories.flatMap((c) =>
  c.subcategories.map((s) => ({ ...s, category: c.slug, categoryName: c.name })),
);
/** @param {string} subSlug */
export const findSubcategoryAnywhere = (subSlug) => allSubcategories.find((s) => s.slug === subSlug);
