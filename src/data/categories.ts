/** @typedef {{ en: string, ar: string }} LocalizedLabel
 * @typedef {{ slug: string, name: LocalizedLabel, image: string }} Subcategory
 * @typedef {{ slug: string, name: LocalizedLabel, image: string, virtual?: string, subcategories: Subcategory[] }} Category
 */
const yt = (id: string) => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
const EXT = {
  nikeBackpack: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/08d0700a-d0fc-4645-a3ff-d14ea52b3905/NK%2BVARSITY%2BELITE%2BBKPK.png',
  nikeBall: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/0b3db21c-204c-4b52-91c8-6a04a40aaea8/NK%2BELT%2BALL%2BCOURT%2B8P%2B2.0.png',
  nikeTournamentBall: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/e52eaec2-956d-40b2-b1c3-58d7d12bc694/NIKE%2BELITE%2BTOURNAMENT.png',
  nikeChampBall: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/5bbfb9b4-9f59-43e5-a4ab-e5238459b210/NK%2BELT%2BCHAMP%2B8P%2B2.0.png',
  uaJersey: 'https://underarmour.scene7.com/is/image/Underarmour/PS6014671-001_HF?bgc=f0f0f0&hei=1000&op_usm=1.75%2C0.3%2C2%2C0&qlt=85&rp=standard-0pad%7Cpdp&wid=800',
  uaSet: 'https://underarmour.scene7.com/is/image/Underarmour/PS6015648-481_F?bgc=f0f0f0&hei=1000&op_usm=1.75%2C0.3%2C2%2C0&qlt=85&rp=standard-0pad%7Cpdp&wid=800',
  adidasShorts: 'https://assets.adidas.com/images/w_500%2Cf_auto%2Cq_auto/49fb4ad3ab90450aa0b1a806fecd3038_9366/ADIDAS_BASKETBALL_WOVEN_SHORTS_Blue_KB7526_21_model.jpg',
  adidasTrack: 'https://assets.adidas.com/images/w_500%2Cf_auto%2Cq_auto/91da3015525041989f8eacff1c2e9888_9366/adidas_Basketball_Woven_Track_Jacket_Blue_KB7531_20_01_model.jpg',
  nikeHoodie: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/7abfa976-e388-47c9-98e7-5a9674283025/M%2BNK%2BTF%2BSI%2BBRSH%2BPO%2BHD.png',
  nikePants: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/0ed51568-d206-48eb-9269-da458f1fb596/M%2BNK%2BTF%2BSI%2BBRSH%2BOPHEM%2BPANT%2BSKU.png',
  uaCompression: 'https://underarmour.scene7.com/is/image/Underarmour/V5-1361522-001_FC?bgc=F0F0F0&hei=1000&qlt=85&resmode=sharp2&wid=800',
  nikeSleeve: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/96bc8662-7933-4af7-9dfa-736537b4ee1f/NIKE%2BDRI-FIT%2BSLEEVE%2BJ%2BMORANT.png',
  nikeSocks: 'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto%2Cq_auto%3Aeco%2Cc_scale%2Cw_300%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/ece71482-5a49-4d54-8d84-ae1e7656b13a/U%2BNK%2BELITE%2BCUSH%2BCREW%2B1PR.png',
  nikeTowel: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/5ba3c90e-8ab2-453e-b9e6-4d77d9406989/COOLING%2BTOWEL%2BSMALL.png',
  nikeWristbands: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto/73f47950-6418-495f-b852-9cd075f99ff9/NIKE%2BELITE%2BDOUBLEWIDE%2BWRISTBAN.png',
  nikeHeadband: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/19361c24-e2cb-41ad-bfb2-ba649b1eca0a/NIKE%2BHEADBAND%2BNBA.png',
  nikeBottle: 'https://static.nike.com/a/images/t_web_pdp_936_v2/f_auto/695403e5-3ed6-440a-9b12-a7a3793960cd/NK%2BREFUEL%2BBOTTLE%2B24%2BOZ.png',
  nikePump: 'https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/4ee92585-3ec9-43ae-abb2-e868b534bf0b/NIKE%2BESSENTIAL%2BBALL%2BPUMP.png',
} as const;

/** @type {Category[]} */
export const categories = [
  { slug:'ready-to-ship', name:{en:'Ready to Ship',ar:'تسليم فوري'}, image:EXT.nikeBackpack, virtual:'readyToShip', subcategories:[] },
  { slug:'clothing', name:{en:'Clothing',ar:'الملابس'}, image:EXT.uaJersey, subcategories:[
    {slug:'game-jerseys',name:{en:'Game Jerseys',ar:'سيريات اللعب'},image:EXT.uaJersey},
    {slug:'game-shorts',name:{en:'Game Shorts',ar:'شورتات اللعب'},image:EXT.adidasShorts},
    {slug:'game-sets',name:{en:'Full Game Sets',ar:'أطقم لعب كاملة'},image:EXT.uaSet},
    {slug:'practice-jerseys',name:{en:'Practice Jerseys',ar:'سيريات التمرين'},image:yt('rQKGGgr7pHE')},
    {slug:'practice-shorts',name:{en:'Practice Shorts',ar:'شورتات التمرين'},image:EXT.adidasShorts},
    {slug:'t-shirts',name:{en:'T-Shirts',ar:'تيشيرتات'},image:yt('AK1kNfqqe64')},
    {slug:'hoodies',name:{en:'Hoodies',ar:'هوديز'},image:EXT.nikeHoodie},
    {slug:'pants',name:{en:'Pants',ar:'سراويل'},image:EXT.nikePants},
    {slug:'tracksuits',name:{en:'Tracksuits',ar:'بدلات رياضية'},image:EXT.adidasTrack},
    {slug:'compression',name:{en:'Compression',ar:'ملابس ضاغطة'},image:EXT.uaCompression},
    {slug:'socks',name:{en:'Socks',ar:'جوارب'},image:EXT.nikeSocks},
  ]},
  { slug:'footwear', name:{en:'Footwear',ar:'الأحذية'}, image:yt('v6-FRL9Mpys'), subcategories:[
    {slug:'in-court',name:{en:'In-Court',ar:'داخل الملعب'},image:yt('G0sUuHddK_M')},
    {slug:'off-court',name:{en:'Off-Court',ar:'خارج الملعب'},image:yt('98dmoVm83Vs')},
  ]},
  { slug:'accessories', name:{en:'Accessories',ar:'الإكسسوارات'}, image:EXT.nikeBackpack, subcategories:[
    {slug:'bags',name:{en:'Bags',ar:'حقائب'},image:EXT.nikeBackpack},
    {slug:'socks',name:{en:'Socks',ar:'جوارب'},image:EXT.nikeSocks},
    {slug:'sleeves',name:{en:'Sleeves',ar:'سليفس'},image:EXT.nikeSleeve},
    {slug:'supports',name:{en:'Supports & Protection',ar:'الدعامات والحماية'},image:EXT.nikeWristbands},
    {slug:'headwear',name:{en:'Headwear',ar:'قبعات وأغطية رأس'},image:EXT.nikeHeadband},
    {slug:'towels',name:{en:'Towels',ar:'مناشف'},image:EXT.nikeTowel},
    {slug:'bottles',name:{en:'Bottles',ar:'قوارير'},image:EXT.nikeBottle},
    {slug:'stickers-patches',name:{en:'Stickers & Patches',ar:'لاصقات وباتشات'},image:yt('6rLg68TDNQM')},
    {slug:'training-accessories',name:{en:'Training Accessories',ar:'إكسسوارات التدريب'},image:yt('LRJP140fv3E')},
  ]},
  { slug:'basketballs', name:{en:'Basketballs',ar:'كرات السلة'}, image:EXT.nikeBall, subcategories:[
    {slug:'indoor',name:{en:'Indoor',ar:'داخل الصالات'},image:EXT.nikeChampBall},
    {slug:'outdoor',name:{en:'Outdoor',ar:'خارج الصالات'},image:EXT.nikeTournamentBall},
    {slug:'indoor-outdoor',name:{en:'Indoor / Outdoor',ar:'داخلي وخارجي'},image:yt('UCWkNZ5Y8-E')},
    {slug:'custom-balls',name:{en:'Custom Basketballs',ar:'كرات بتصميم خاص'},image:yt('rQKGGgr7pHE')},
  ]},
  { slug:'equipment', name:{en:'Equipment',ar:'المعدات'}, image:EXT.nikePump, subcategories:[
    {slug:'hoops-backboards',name:{en:'Hoops & Backboards',ar:'السلات والبوردات'},image:yt('UCWkNZ5Y8-E')},
    {slug:'rims-nets',name:{en:'Rims & Nets',ar:'الريمات والشبكات'},image:yt('d42Mjtalv70')},
    {slug:'scoreboards-shot-clocks',name:{en:'Scoreboards & Shot Clocks',ar:'لوحات النتائج وساعات 24 ثانية'},image:yt('AK1kNfqqe64')},
    {slug:'ball-carts',name:{en:'Ball Carts',ar:'عربات الكرات'},image:EXT.nikeTournamentBall},
    {slug:'court-equipment',name:{en:'Court Equipment',ar:'تجهيزات الملاعب'},image:yt('LRJP140fv3E')},
    {slug:'pumps-needles',name:{en:'Pumps & Needles',ar:'مضخات وإبر'},image:EXT.nikePump},
  ]},
];

export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);
export const getSubcategory = (categorySlug: string, subSlug: string) => getCategory(categorySlug)?.subcategories.find((s) => s.slug === subSlug);
export const allSubcategories = categories.flatMap((c) => c.subcategories.map((s) => ({ ...s, category: c.slug, categoryName: c.name })));
export const findSubcategoryAnywhere = (subSlug: string) => allSubcategories.find((s) => s.slug === subSlug);
