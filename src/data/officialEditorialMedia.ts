export type OfficialMediaEntry = { source: string; alt: string; width?: number; height?: number };
const createEntry = (source: string, alt: string, width?: number, height?: number): OfficialMediaEntry => ({ source, alt, width, height });
const YT=(id:string)=>`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
const ADIDAS='https://preview.thenewsmarket.com/Previews/ADID/StillAssets/640x480/691341_v3.jpg';
const NB='https://preview.thenewsmarket.com/Previews/NBAS/StillAssets/1920x1080/557260.png';
const UA='https://about.underarmour.com/content/ua/about/en/stories/2026/02/under-armour-drops-the-curry-13---the-final-chapter-in-a-signatu/_jcr_content/root/container/image.coreimg.jpg';
const UATEAM='https://about.underarmour.com/content/ua/about/en/stories/2025/02/under-armour-and-curry-brand-celebrate-a-good-weekend-in-the-bay/_jcr_content/root/container/container/multiimage_1789046347/images/images1_245081.coreimg.jpg';
const NIKE_BAG='https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/08d0700a-d0fc-4645-a3ff-d14ea52b3905/NK%2BVARSITY%2BELITE%2BBKPK.png';
const NIKE_BALL='https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/0b3db21c-204c-4b52-91c8-6a04a40aaea8/NK%2BELT%2BALL%2BCOURT%2B8P%2B2.0.png';
const UA_JERSEY='https://underarmour.scene7.com/is/image/Underarmour/V5-6014671-001_BC?bgc=f0f0f0&hei=1000&op_usm=1.75%2C0.3%2C2%2C0&qlt=85&rp=standard-0pad%7Cpdp&wid=800';
const UA_SET='https://underarmour.scene7.com/is/image/Underarmour/PS6015648-481_F?bgc=f0f0f0&hei=1000&op_usm=1.75%2C0.3%2C2%2C0&qlt=85&rp=standard-0pad%7Cpdp&wid=800';
const ADIDAS_SHORTS='https://assets.adidas.com/images/w_500%2Cf_auto%2Cq_auto/49fb4ad3ab90450aa0b1a806fecd3038_9366/ADIDAS_BASKETBALL_WOVEN_SHORTS_Blue_KB7526_21_model.jpg';
const ADIDAS_TRACK='https://assets.adidas.com/images/w_500%2Cf_auto%2Cq_auto/91da3015525041989f8eacff1c2e9888_9366/adidas_Basketball_Woven_Track_Jacket_Blue_KB7531_20_01_model.jpg';
export const OFFICIAL_MEDIA = {
  nikeWinningPoster:createEntry(YT('_Ra6wkIoJp0'),'Nike basketball campaign film still.',1280,720),
  nikeWinningCollage:createEntry(YT('EiTqiIy80G8'),'Nike LeBron basketball campaign still.',1280,720),
  nikeKobeHeroDesktop:createEntry(YT('98dmoVm83Vs'),'Nike LeBron basketball design film still.',1280,720),
  nikeKobeHeroMobile:createEntry(YT('ucuL5-dyFzs'),'Nike A\'ja Wilson basketball film still.',1280,720),
  nikeKobeGroup:createEntry(YT('_Ra6wkIoJp0'),'Nike basketball campaign still.',1280,720),
  nikeKobeOne:createEntry(YT('EiTqiIy80G8'),'Nike basketball campaign still.',1280,720),
  nikeKobeTwo:createEntry(YT('ucuL5-dyFzs'),'Nike basketball campaign still.',1280,720),
  nikeKobeThree:createEntry(YT('98dmoVm83Vs'),'Nike basketball product story still.',1280,720),
  nikeCustomGameTop:createEntry(ADIDAS,'adidas women\'s basketball teamwear still.',640,480),
  nikeCustomGameShorts:createEntry(ADIDAS_SHORTS,'adidas basketball shorts product image.',500,500),
  nikeCustomShootingShirt:createEntry(UA_SET,'Under Armour basketball set product image.',800,1000),
  nikeCustomHoodie:createEntry(YT('57FHMzbXycg'),'New Balance Hoops campaign still.',1280,720),
  nikeCustomTracksuit:createEntry(ADIDAS_TRACK,'adidas basketball track jacket product image.',500,500),
  nikeCustomBag:createEntry(NIKE_BAG,'Nike basketball backpack product image.',800,1000),
  nikeCustomBasketball:createEntry(NIKE_BALL,'Nike Elite All-Court basketball product image.',800,1000),
  nikeCustomDuffle:createEntry(YT('rQKGGgr7pHE'),'New Balance Hoops campaign still.',1280,720),
  spaldingGameBall:createEntry(NIKE_BALL,'Nike Elite All-Court basketball product image.',800,1000),
  spaldingBackboard:createEntry(YT('LRJP140fv3E'),'PUMA Hoops campaign court still.',1280,720),
  spaldingPolePad:createEntry(UATEAM,'Under Armour basketball court still.',1000,667),
  spaldingPump:createEntry(UA,'Under Armour Curry performance footwear image.',766,578),
  nbKawhi:createEntry(NB,'New Balance Kawhi basketball campaign image.',1920,1080),
  nbTyrese:createEntry(YT('AK1kNfqqe64'),'New Balance Tyrese Maxey campaign still.',1280,720),
  nbCameron:createEntry(YT('57FHMzbXycg'),'New Balance Hoops campaign still.',1280,720),
  nbCooper:createEntry(YT('rQKGGgr7pHE'),'New Balance Hoops campaign still.',1280,720),
  nbDejounte:createEntry(YT('EcxqO7VOB9Q'),'New Balance basketball campaign still.',1280,720),
  nbZach:createEntry(ADIDAS,'adidas basketball campaign still.',640,480),
  nbJamal:createEntry(YT('v6-FRL9Mpys'),'adidas Anthony Edwards basketball campaign still.',1280,720),
  nbAaron:createEntry(YT('LRJP140fv3E'),'PUMA Hoops global campaign still.',1280,720),
  nbNickSmith:createEntry(UA,'Under Armour Curry basketball footwear image.',766,578),
  nbDarius:createEntry(UATEAM,'Under Armour basketball team still.',1000,667),
} as const;
