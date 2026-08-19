import { EDITORIAL as E } from './editorialAssets.ts';
/** @typedef {{ en: string, ar: string }} LocalizedLabel
 * @typedef {{ slug: string, name: LocalizedLabel, image: string }} Subcategory
 * @typedef {{ slug: string, name: LocalizedLabel, image: string, virtual?: string, subcategories: Subcategory[] }} Category */
export const categories = [
  { slug:'ready-to-ship', name:{en:'Ready to Ship',ar:'تسليم فوري'}, image:E.jordanShoesOrange, virtual:'readyToShip', subcategories:[] },
  { slug:'clothing', name:{en:'Clothing',ar:'الملابس'}, image:E.lebronFullBody, subcategories:[
    {slug:'game-jerseys',name:{en:'Game Jerseys',ar:'سيريات اللعب'},image:E.usaWomanCelebrate},
    {slug:'game-shorts',name:{en:'Game Shorts',ar:'شورتات اللعب'},image:E.curryPatternRear},
    {slug:'game-sets',name:{en:'Full Game Sets',ar:'أطقم لعب كاملة'},image:E.shanghaiPlayers},
    {slug:'practice-jerseys',name:{en:'Practice Jerseys',ar:'سيريات التمرين'},image:E.curryLayupWide},
    {slug:'practice-shorts',name:{en:'Practice Shorts',ar:'شورتات التمرين'},image:E.curryPatternShot},
    {slug:'t-shirts',name:{en:'T-Shirts',ar:'تيشيرتات'},image:E.tatumSigning},
    {slug:'hoodies',name:{en:'Hoodies',ar:'هوديز'},image:E.curryWhiteHoodClose},
    {slug:'pants',name:{en:'Pants',ar:'سراويل'},image:E.lameloSpaceStanding},
    {slug:'tracksuits',name:{en:'Tracksuits',ar:'بدلات رياضية'},image:E.lameloSpaceSeated},
    {slug:'compression',name:{en:'Compression',ar:'ملابس ضاغطة'},image:E.lebronUsa},
    {slug:'socks',name:{en:'Socks',ar:'جوارب'},image:E.curryPatternRear},
  ]},
  { slug:'footwear', name:{en:'Footwear',ar:'الأحذية'}, image:E.curryShoeColor, subcategories:[
    {slug:'in-court',name:{en:'In-Court',ar:'داخل الملعب'},image:E.lameloSpaceShoe},
    {slug:'off-court',name:{en:'Off-Court',ar:'خارج الملعب'},image:E.whiteShoeOrange},
  ]},
  { slug:'accessories', name:{en:'Accessories',ar:'الإكسسوارات'}, image:E.lebronCrown, subcategories:[
    {slug:'bags',name:{en:'Bags',ar:'حقائب'},image:E.jordanShoeBox},
    {slug:'socks',name:{en:'Socks',ar:'جوارب'},image:E.femaleSole},
    {slug:'sleeves',name:{en:'Sleeves',ar:'سليفس'},image:E.lebronClose},
    {slug:'supports',name:{en:'Supports & Protection',ar:'الدعامات والحماية'},image:E.tatumDark},
    {slug:'headwear',name:{en:'Headwear',ar:'قبعات وأغطية رأس'},image:E.lebronShanghai},
    {slug:'towels',name:{en:'Towels',ar:'مناشف'},image:E.wheelchairWoman},
    {slug:'bottles',name:{en:'Bottles',ar:'قوارير'},image:E.bwMalePortrait},
    {slug:'stickers-patches',name:{en:'Stickers & Patches',ar:'لاصقات وباتشات'},image:E.eventSigning},
    {slug:'training-accessories',name:{en:'Training Accessories',ar:'إكسسوارات التدريب'},image:E.kidsTunnel},
  ]},
  { slug:'basketballs', name:{en:'Basketballs',ar:'كرات السلة'}, image:E.curryPortraitBall, subcategories:[
    {slug:'indoor',name:{en:'Indoor',ar:'داخل الصالات'},image:E.curryHeroBall},
    {slug:'outdoor',name:{en:'Outdoor',ar:'خارج الصالات'},image:E.lukaFanSelfie},
    {slug:'indoor-outdoor',name:{en:'Indoor / Outdoor',ar:'داخلي وخارجي'},image:E.lukaRedCourt},
    {slug:'custom-balls',name:{en:'Custom Basketballs',ar:'كرات بتصميم خاص'},image:E.blueDunk},
  ]},
  { slug:'equipment', name:{en:'Equipment',ar:'المعدات'}, image:E.jordanDunkEvent, subcategories:[
    {slug:'hoops-backboards',name:{en:'Hoops & Backboards',ar:'السلات والبوردات'},image:E.jordanBuilding},
    {slug:'rims-nets',name:{en:'Rims & Nets',ar:'الريمات والشبكات'},image:E.jordanDunkVertical},
    {slug:'scoreboards-shot-clocks',name:{en:'Scoreboards & Shot Clocks',ar:'لوحات النتائج وساعات 24 ثانية'},image:E.lukaStylized},
    {slug:'ball-carts',name:{en:'Ball Carts',ar:'عربات الكرات'},image:E.curryPortraitBall},
    {slug:'court-equipment',name:{en:'Court Equipment',ar:'تجهيزات الملاعب'},image:E.jordanBuilding},
    {slug:'pumps-needles',name:{en:'Pumps & Needles',ar:'مضخات وإبر'},image:E.curryBallPortrait},
  ]},
];
export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);
export const getSubcategory = (categorySlug: string, subSlug: string) => getCategory(categorySlug)?.subcategories.find((s) => s.slug === subSlug);
export const allSubcategories = categories.flatMap((c) => c.subcategories.map((s) => ({ ...s, category: c.slug, categoryName: c.name })));
export const findSubcategoryAnywhere = (subSlug: string) => allSubcategories.find((s) => s.slug === subSlug);
