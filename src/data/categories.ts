/** @typedef {{ en: string, ar: string }} LocalizedLabel
 * @typedef {{ slug: string, name: LocalizedLabel, image: string }} Subcategory
 * @typedef {{ slug: string, name: LocalizedLabel, image: string, virtual?: string, subcategories: Subcategory[] }} Category
 */
const S = '/media/official-brand/sections';
/** @type {Category[]} */
export const categories = [
  { slug:'ready-to-ship', name:{en:'Ready to Ship',ar:'تسليم فوري'}, image:`${S}/discover-ready.webp`, virtual:'readyToShip', subcategories:[] },
  {
    slug:'clothing', name:{en:'Clothing',ar:'الملابس'}, image:`${S}/clothing-00.webp`,
    subcategories:[
      {slug:'game-jerseys',name:{en:'Game Jerseys',ar:'سيريات اللعب'},image:`${S}/clothing-01.webp`},
      {slug:'game-shorts',name:{en:'Game Shorts',ar:'شورتات اللعب'},image:`${S}/clothing-02.webp`},
      {slug:'game-sets',name:{en:'Full Game Sets',ar:'أطقم لعب كاملة'},image:`${S}/clothing-03.webp`},
      {slug:'practice-jerseys',name:{en:'Practice Jerseys',ar:'سيريات التمرين'},image:`${S}/clothing-04.webp`},
      {slug:'practice-shorts',name:{en:'Practice Shorts',ar:'شورتات التمرين'},image:`${S}/clothing-05.webp`},
      {slug:'t-shirts',name:{en:'T-Shirts',ar:'تيشيرتات'},image:`${S}/clothing-06.webp`},
      {slug:'hoodies',name:{en:'Hoodies',ar:'هوديز'},image:`${S}/clothing-07.webp`},
      {slug:'pants',name:{en:'Pants',ar:'سراويل'},image:`${S}/clothing-08.webp`},
      {slug:'tracksuits',name:{en:'Tracksuits',ar:'بدلات رياضية'},image:`${S}/clothing-09.webp`},
      {slug:'compression',name:{en:'Compression',ar:'ملابس ضاغطة'},image:`${S}/clothing-10.webp`},
      {slug:'socks',name:{en:'Socks',ar:'جوارب'},image:`${S}/clothing-11.webp`},
    ],
  },
  { slug:'footwear', name:{en:'Footwear',ar:'الأحذية'}, image:`${S}/footwear-00.webp`, subcategories:[
    {slug:'in-court',name:{en:'In-Court',ar:'داخل الملعب'},image:`${S}/footwear-01.webp`},
    {slug:'off-court',name:{en:'Off-Court',ar:'خارج الملعب'},image:`${S}/footwear-02.webp`},
  ]},
  { slug:'accessories', name:{en:'Accessories',ar:'الإكسسوارات'}, image:`${S}/accessories-00.webp`, subcategories:[
    {slug:'bags',name:{en:'Bags',ar:'حقائب'},image:`${S}/accessories-01.webp`},
    {slug:'socks',name:{en:'Socks',ar:'جوارب'},image:`${S}/accessories-02.webp`},
    {slug:'sleeves',name:{en:'Sleeves',ar:'سليفس'},image:`${S}/accessories-03.webp`},
    {slug:'supports',name:{en:'Supports & Protection',ar:'الدعامات والحماية'},image:`${S}/accessories-04.webp`},
    {slug:'headwear',name:{en:'Headwear',ar:'قبعات وأغطية رأس'},image:`${S}/accessories-05.webp`},
    {slug:'towels',name:{en:'Towels',ar:'مناشف'},image:`${S}/accessories-06.webp`},
    {slug:'bottles',name:{en:'Bottles',ar:'قوارير'},image:`${S}/accessories-07.webp`},
    {slug:'stickers-patches',name:{en:'Stickers & Patches',ar:'لاصقات وباتشات'},image:`${S}/accessories-08.webp`},
    {slug:'training-accessories',name:{en:'Training Accessories',ar:'إكسسوارات التدريب'},image:`${S}/accessories-09.webp`},
  ]},
  { slug:'basketballs', name:{en:'Basketballs',ar:'كرات السلة'}, image:`${S}/basketballs-00.webp`, subcategories:[
    {slug:'indoor',name:{en:'Indoor',ar:'داخل الصالات'},image:`${S}/basketballs-01.webp`},
    {slug:'outdoor',name:{en:'Outdoor',ar:'خارج الصالات'},image:`${S}/basketballs-02.webp`},
    {slug:'indoor-outdoor',name:{en:'Indoor / Outdoor',ar:'داخلي وخارجي'},image:`${S}/basketballs-03.webp`},
    {slug:'custom-balls',name:{en:'Custom Basketballs',ar:'كرات بتصميم خاص'},image:`${S}/basketballs-04.webp`},
  ]},
  { slug:'equipment', name:{en:'Equipment',ar:'المعدات'}, image:`${S}/equipment-00.webp`, subcategories:[
    {slug:'hoops-backboards',name:{en:'Hoops & Backboards',ar:'السلات والبوردات'},image:`${S}/equipment-01.webp`},
    {slug:'rims-nets',name:{en:'Rims & Nets',ar:'الريمات والشبكات'},image:`${S}/equipment-02.webp`},
    {slug:'scoreboards-shot-clocks',name:{en:'Scoreboards & Shot Clocks',ar:'لوحات النتائج وساعات 24 ثانية'},image:`${S}/equipment-03.webp`},
    {slug:'ball-carts',name:{en:'Ball Carts',ar:'عربات الكرات'},image:`${S}/equipment-04.webp`},
    {slug:'court-equipment',name:{en:'Court Equipment',ar:'تجهيزات الملاعب'},image:`${S}/equipment-05.webp`},
    {slug:'pumps-needles',name:{en:'Pumps & Needles',ar:'مضخات وإبر'},image:`${S}/equipment-06.webp`},
  ]},
];

export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);
export const getSubcategory = (categorySlug: string, subSlug: string) => getCategory(categorySlug)?.subcategories.find((s) => s.slug === subSlug);
export const allSubcategories = categories.flatMap((c) => c.subcategories.map((s) => ({ ...s, category: c.slug, categoryName: c.name })));
export const findSubcategoryAnywhere = (subSlug: string) => allSubcategories.find((s) => s.slug === subSlug);
