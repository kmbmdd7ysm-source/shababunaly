/** @typedef {{ en: string, ar: string }} LocalizedLabel
 * @typedef {{ slug: string, name: LocalizedLabel, image: string }} Subcategory
 * @typedef {{ slug: string, name: LocalizedLabel, image: string, virtual?: string, subcategories: Subcategory[] }} Category
 */
const L='/media/localized-brand';
const P='/images/products';
const H='/media/hero-posters';
const IMG = {
  backpack: `${P}/lha-elite-basketball-backpack-black.webp`,
  ball: `${H}/basketballs.webp`,
  jersey: `${L}/adidas_team.png`,
  set: `${L}/nike-teamwear-courtside.webp`,
  shorts: `${P}/lha-performance-shorts-black.webp`,
  track: `${P}/lha-premium-fleece-set-black.webp`,
  hoodie: `${P}/own-the-game-pullover-hoodie-black.webp`,
  pants: `${P}/own-the-game-fleece-pants-black.webp`,
  compression: `${P}/compression-top-black.webp`,
  socks: `${P}/lha-court-socks-black.webp`,
  footwear: `${L}/square_sabrina.webp`,
  shoeAlt: `${L}/nike_white_shoe.png`,
  sleeveContext: `${L}/portrait_atwo.webp`,
  court: `${L}/puma_court.png`,
  athlete: `${L}/ua_dribble.png`,
  pumpContext: `${L}/nb_ball_hoodie.png`,
} as const;

/** @type {Category[]} */
export const categories = [
  { slug:'ready-to-ship', name:{en:'Ready to Ship',ar:'تسليم فوري'}, image:IMG.backpack, virtual:'readyToShip', subcategories:[] },
  { slug:'clothing', name:{en:'Clothing',ar:'الملابس'}, image:IMG.jersey, subcategories:[
    {slug:'game-jerseys',name:{en:'Game Jerseys',ar:'سيريات اللعب'},image:IMG.jersey},
    {slug:'game-shorts',name:{en:'Game Shorts',ar:'شورتات اللعب'},image:IMG.shorts},
    {slug:'game-sets',name:{en:'Full Game Sets',ar:'أطقم لعب كاملة'},image:IMG.set},
    {slug:'practice-jerseys',name:{en:'Practice Jerseys',ar:'سيريات التمرين'},image:IMG.athlete},
    {slug:'practice-shorts',name:{en:'Practice Shorts',ar:'شورتات التمرين'},image:IMG.shorts},
    {slug:'t-shirts',name:{en:'T-Shirts',ar:'تيشيرتات'},image:`${P}/hoopers-performance-tee-black.webp`},
    {slug:'hoodies',name:{en:'Hoodies',ar:'هوديز'},image:IMG.hoodie},
    {slug:'pants',name:{en:'Pants',ar:'سراويل'},image:IMG.pants},
    {slug:'tracksuits',name:{en:'Tracksuits',ar:'بدلات رياضية'},image:IMG.track},
    {slug:'compression',name:{en:'Compression',ar:'ملابس ضاغطة'},image:IMG.compression},
    {slug:'socks',name:{en:'Socks',ar:'جوارب'},image:IMG.socks},
  ]},
  { slug:'footwear', name:{en:'Footwear',ar:'الأحذية'}, image:IMG.footwear, subcategories:[
    {slug:'in-court',name:{en:'In-Court',ar:'داخل الملعب'},image:IMG.footwear},
    {slug:'off-court',name:{en:'Off-Court',ar:'خارج الملعب'},image:IMG.shoeAlt},
  ]},
  { slug:'accessories', name:{en:'Accessories',ar:'الإكسسوارات'}, image:IMG.backpack, subcategories:[
    {slug:'bags',name:{en:'Bags',ar:'حقائب'},image:IMG.backpack},
    {slug:'socks',name:{en:'Socks',ar:'جوارب'},image:IMG.socks},
    {slug:'sleeves',name:{en:'Sleeves',ar:'سليفس'},image:IMG.sleeveContext},
    {slug:'supports',name:{en:'Supports & Protection',ar:'الدعامات والحماية'},image:IMG.compression},
    {slug:'headwear',name:{en:'Headwear',ar:'قبعات وأغطية رأس'},image:`${L}/puma_athlete.png`},
    {slug:'towels',name:{en:'Towels',ar:'مناشف'},image:`${L}/portrait_closeup.webp`},
    {slug:'bottles',name:{en:'Bottles',ar:'قوارير'},image:`${L}/nb_ball_hoodie.png`},
    {slug:'stickers-patches',name:{en:'Stickers & Patches',ar:'لاصقات وباتشات'},image:`${P}/performance-socks-black-white.webp`},
    {slug:'training-accessories',name:{en:'Training Accessories',ar:'إكسسوارات التدريب'},image:IMG.athlete},
  ]},
  { slug:'basketballs', name:{en:'Basketballs',ar:'كرات السلة'}, image:IMG.ball, subcategories:[
    {slug:'indoor',name:{en:'Indoor',ar:'داخل الصالات'},image:IMG.ball},
    {slug:'outdoor',name:{en:'Outdoor',ar:'خارج الصالات'},image:IMG.court},
    {slug:'indoor-outdoor',name:{en:'Indoor / Outdoor',ar:'داخلي وخارجي'},image:IMG.athlete},
    {slug:'custom-balls',name:{en:'Custom Basketballs',ar:'كرات بتصميم خاص'},image:IMG.ball},
  ]},
  { slug:'equipment', name:{en:'Equipment',ar:'المعدات'}, image:IMG.court, subcategories:[
    {slug:'hoops-backboards',name:{en:'Hoops & Backboards',ar:'السلات والبوردات'},image:IMG.court},
    {slug:'rims-nets',name:{en:'Rims & Nets',ar:'الريمات والشبكات'},image:IMG.court},
    {slug:'scoreboards-shot-clocks',name:{en:'Scoreboards & Shot Clocks',ar:'لوحات النتائج وساعات 24 ثانية'},image:`${L}/nb_harden_bw.png`},
    {slug:'ball-carts',name:{en:'Ball Carts',ar:'عربات الكرات'},image:IMG.ball},
    {slug:'court-equipment',name:{en:'Court Equipment',ar:'تجهيزات الملاعب'},image:IMG.court},
    {slug:'pumps-needles',name:{en:'Pumps & Needles',ar:'مضخات وإبر'},image:IMG.pumpContext},
  ]},
];

export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);
export const getSubcategory = (categorySlug: string, subSlug: string) => getCategory(categorySlug)?.subcategories.find((s) => s.slug === subSlug);
export const allSubcategories = categories.flatMap((c) => c.subcategories.map((s) => ({ ...s, category: c.slug, categoryName: c.name })));
export const findSubcategoryAnywhere = (subSlug: string) => allSubcategories.find((s) => s.slug === subSlug);
