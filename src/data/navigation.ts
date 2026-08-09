/* `icon` names resolve against src/components/icons/Icon.tsx. The rail shows the
   icon when collapsed and the label when open, so every entry needs one. */
export const mainNav = [
  { to: '/', key: 'home', icon: 'home' },
  { to: '/shop', key: 'shop', mega: true, icon: 'shop' },
  { to: '/customize', key: 'customize', icon: 'customize' },
  { to: '/teams-wholesale', key: 'teamsWholesale', icon: 'teams' },
  { to: '/lha-store', key: 'lhaStore', icon: 'store' },
  { to: '/our-work', key: 'ourWork', icon: 'work' },
  { to: '/about', key: 'about', icon: 'about' },
];

export const megaMenu = {
  featured: [
    { to: '/shop/ready-to-ship', key: 'readyToShip' },
    { to: '/shop?new=1', key: 'newArrivals' },
    { to: '/shop?best=1', key: 'bestSellers' },
    { to: '/customize', key: 'customize' },
    { to: '/teams-wholesale', key: 'teamsWholesale' },
    { to: '/lha-store', key: 'lhaStore' },
  ],
  columns: [
    {
      title: { en: 'Shop', ar: 'تسوق' },
      links: [
        { to: '/shop/clothing', label: { en: 'Clothing', ar: 'الملابس' } },
        { to: '/shop/footwear', label: { en: 'Footwear', ar: 'الأحذية' } },
        { to: '/shop/accessories', label: { en: 'Accessories', ar: 'الإكسسوارات' } },
        { to: '/shop/basketballs', label: { en: 'Basketballs', ar: 'كرات السلة' } },
        { to: '/shop/equipment', label: { en: 'Equipment', ar: 'المعدات' } },
      ],
    },
    {
      title: { en: 'Services', ar: 'الخدمات' },
      links: [
        { to: '/customize', label: { en: 'Customize Everything', ar: 'صمّم كل شيء' } },
        { to: '/teams-wholesale', label: { en: 'Teams & Wholesale', ar: 'الأندية والجملة' } },
        { to: '/teams-wholesale#quote', label: { en: 'Request a Quote', ar: 'اطلب عرض سعر' } },
        { to: '/special-request', label: { en: 'Special Request', ar: 'طلب خاص' } },
        { to: '/our-work', label: { en: 'Our Work', ar: 'أعمالنا' } },
        { to: '/order-tracking', label: { en: 'Track Order', ar: 'تتبع الطلب' } },
      ],
    },
  ],
};

export const footerNav = {
  shop: [
    { to: '/shop/ready-to-ship', key: 'readyToShip' },
    { to: '/shop/clothing', label: { en: 'Clothing', ar: 'الملابس' } },
    { to: '/shop/footwear', label: { en: 'Footwear', ar: 'الأحذية' } },
    { to: '/shop/accessories', label: { en: 'Accessories', ar: 'الإكسسوارات' } },
    { to: '/shop/basketballs', label: { en: 'Basketballs', ar: 'كرات السلة' } },
    { to: '/shop/equipment', label: { en: 'Equipment', ar: 'المعدات' } },
  ],
  academy: [
    { to: '/customize', key: 'customize' },
    { to: '/teams-wholesale', key: 'teamsWholesale' },
    { to: '/lha-store', key: 'lhaStore' },
    { to: '/our-work', key: 'ourWork' },
    { to: '/about', key: 'about' },
    { to: '/contact', key: 'contact' },
    { to: '/special-request', label: { en: 'Special Request', ar: 'طلب خاص' } },
  ],
  help: [
    { to: '/faq', key: 'faq' },
    { to: '/size-guide', key: 'sizeGuide' },
    { to: '/shipping-returns', key: 'shipping' },
    { to: '/refund-policy', key: 'refund' },
    { to: '/contact', key: 'contact' },
    { to: '/order-tracking', key: 'orderTracking' },
  ],
  legal: [
    { to: '/privacy-policy', key: 'privacy' },
    { to: '/terms', key: 'terms' },
    { to: '/cookies', key: 'cookies' },
  ],
};
