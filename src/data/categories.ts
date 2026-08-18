/** @typedef {{ en: string, ar: string }} LocalizedLabel
 * @typedef {{ slug: string, name: LocalizedLabel, image: string }} Subcategory
 * @typedef {{ slug: string, name: LocalizedLabel, image: string, virtual?: string, subcategories: Subcategory[] }} Category
 */
const S = '/media/official-brand/sections';
const GLOBAL_BASKETBALL_MEDIA = {
  nikeEliteSocks: 'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto%2Cq_auto%3Aeco%2Cc_scale%2Cw_300%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/ece71482-5a49-4d54-8d84-ae1e7656b13a/U%2BNK%2BELITE%2BCUSH%2BCREW%2B1PR.png',
  nikeEliteSocksAlt: 'https://content.stylitics.com/images/items/27529162',
  nikeBasketballBag: 'https://content.stylitics.com/images/items/27529254',
  nikeJaSleeve: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/96bc8662-7933-4af7-9dfa-736537b4ee1f/NIKE%2BDRI-FIT%2BSLEEVE%2BJ%2BMORANT.png',
  nikeWristSupport: 'https://content.stylitics.com/images/items/10227856',
  nikeHeadband: 'https://content.stylitics.com/images/items/27605163',
  nikeCoolingTowel: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/5ba3c90e-8ab2-453e-b9e6-4d77d9406989/COOLING%2BTOWEL%2BSMALL.png',
  nikeBottle: 'https://content.stylitics.com/images/items/12828521',
  nikeHeadTie: 'https://content.stylitics.com/images/items/5769632',
  nikePlaygroundBall: 'https://content.stylitics.com/images/items/24600049',
  nikeKobeBall: 'https://content.stylitics.com/images/items/24463906',
} as const;
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
      {slug:'socks',name:{en:'Socks',ar:'جوارب'},image:GLOBAL_BASKETBALL_MEDIA.nikeEliteSocks},
    ],
  },
  { slug:'footwear', name:{en:'Footwear',ar:'الأحذية'}, image:`${S}/footwear-00.webp`, subcategories:[
    {slug:'in-court',name:{en:'In-Court',ar:'داخل الملعب'},image:`${S}/footwear-01.webp`},
    {slug:'off-court',name:{en:'Off-Court',ar:'خارج الملعب'},image:`${S}/footwear-02.webp`},
  ]},
  { slug:'accessories', name:{en:'Accessories',ar:'الإكسسوارات'}, image:`${S}/accessories-00.webp`, subcategories:[
    {slug:'bags',name:{en:'Bags',ar:'حقائب'},image:GLOBAL_BASKETBALL_MEDIA.nikeBasketballBag},
    {slug:'socks',name:{en:'Socks',ar:'جوارب'},image:GLOBAL_BASKETBALL_MEDIA.nikeEliteSocksAlt},
    {slug:'sleeves',name:{en:'Sleeves',ar:'سليفس'},image:GLOBAL_BASKETBALL_MEDIA.nikeJaSleeve},
    {slug:'supports',name:{en:'Supports & Protection',ar:'الدعامات والحماية'},image:GLOBAL_BASKETBALL_MEDIA.nikeWristSupport},
    {slug:'headwear',name:{en:'Headwear',ar:'قبعات وأغطية رأس'},image:GLOBAL_BASKETBALL_MEDIA.nikeHeadband},
    {slug:'towels',name:{en:'Towels',ar:'مناشف'},image:GLOBAL_BASKETBALL_MEDIA.nikeCoolingTowel},
    {slug:'bottles',name:{en:'Bottles',ar:'قوارير'},image:GLOBAL_BASKETBALL_MEDIA.nikeBottle},
    {slug:'stickers-patches',name:{en:'Stickers & Patches',ar:'لاصقات وباتشات'},image:`${S}/accessories-08.webp`},
    {slug:'training-accessories',name:{en:'Training Accessories',ar:'إكسسوارات التدريب'},image:GLOBAL_BASKETBALL_MEDIA.nikeHeadTie},
  ]},
  { slug:'basketballs', name:{en:'Basketballs',ar:'كرات السلة'}, image:GLOBAL_BASKETBALL_MEDIA.nikePlaygroundBall, subcategories:[
    {slug:'indoor',name:{en:'Indoor',ar:'داخل الصالات'},image:`${S}/basketballs-01.webp`},
    {slug:'outdoor',name:{en:'Outdoor',ar:'خارج الصالات'},image:`${S}/basketballs-02.webp`},
    {slug:'indoor-outdoor',name:{en:'Indoor / Outdoor',ar:'داخلي وخارجي'},image:`${S}/basketballs-03.webp`},
    {slug:'custom-balls',name:{en:'Custom Basketballs',ar:'كرات بتصميم خاص'},image:GLOBAL_BASKETBALL_MEDIA.nikeKobeBall},
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
