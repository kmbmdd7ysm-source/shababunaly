export const mainNav = [
  { to: '/discover/new-this-week', key: 'new', label: { en: 'New', ar: 'جديد' }, icon: 'spark' },
  { to: '/shop', key: 'shop', label: { en: 'Shop', ar: 'تسوق' }, mega: true, icon: 'shop' },
  { to: '/shop/footwear', key: 'footwear', label: { en: 'Footwear', ar: 'الأحذية' }, icon: 'shoe' },
  { to: '/shop/clothing', key: 'apparel', label: { en: 'Apparel', ar: 'الملابس' }, icon: 'shirt' },
  { to: '/basketball/shoe-finder', key: 'basketball', label: { en: 'Basketball', ar: 'كرة السلة' }, icon: 'basketball' },
  { to: '/customize', key: 'customize', label: { en: 'Custom', ar: 'صمّم' }, icon: 'customize' },
  { to: '/discover', key: 'discover', label: { en: 'Discover', ar: 'اكتشف' }, icon: 'compass' },
  { to: '/releases', key: 'releases', label: { en: 'Releases', ar: 'الإصدارات' }, icon: 'calendar' },
];

export const megaMenu = {
  featured: [
    { to: '/discover/new-this-week', label: { en: 'New this week', ar: 'جديد هذا الأسبوع' } },
    { to: '/discover/trending-now', label: { en: 'Trending now', ar: 'الرائج الآن' } },
    { to: '/discover/performance-picks', label: { en: 'Performance picks', ar: 'اختيارات الأداء' } },
    { to: '/shop/ready-to-ship', label: { en: 'Ready to Ship', ar: 'تسليم فوري' } },
  ],
  columns: [
    {
      title: { en: 'Shop', ar: 'تسوق' },
      links: [
        { to: '/shop/footwear', label: { en: 'Footwear', ar: 'الأحذية' } },
        { to: '/shop/clothing', label: { en: 'Apparel', ar: 'الملابس' } },
        { to: '/shop/accessories', label: { en: 'Accessories', ar: 'الإكسسوارات' } },
        { to: '/shop/basketballs', label: { en: 'Basketballs', ar: 'كرات السلة' } },
        { to: '/shop/equipment', label: { en: 'Equipment', ar: 'المعدات' } },
      ],
    },
    {
      title: { en: 'Discover', ar: 'اكتشف' },
      links: [
        { to: '/discover/just-dropped', label: { en: 'Just dropped', ar: 'وصل للتو' } },
        { to: '/discover/best-sellers', label: { en: 'Best sellers', ar: 'الأكثر مبيعًا' } },
        { to: '/discover/court-essentials', label: { en: 'Court essentials', ar: 'أساسيات الملعب' } },
        { to: '/discover/shababuna-selects', label: { en: 'Shababuna selects', ar: 'مختارات شبابنا' } },
        { to: '/releases', label: { en: 'Release calendar', ar: 'تقويم الإصدارات' } },
      ],
    },
    {
      title: { en: 'More', ar: 'المزيد' },
      links: [
        { to: '/customize', label: { en: 'Custom', ar: 'التخصيص' } },
        { to: '/teams-wholesale', label: { en: 'Teams & Wholesale', ar: 'الأندية والجملة' } },
        { to: '/stories', label: { en: 'Stories', ar: 'القصص' } },
        { to: '/lha-store', label: { en: 'LHA', ar: 'LHA' } },
        { to: '/about', label: { en: 'About', ar: 'عن شبابنا' } },
      ],
    },
  ],
};

export const footerNav = {
  shop: [
    { to: '/discover/new-this-week', label: { en: 'New', ar: 'جديد' } },
    { to: '/shop/footwear', label: { en: 'Footwear', ar: 'الأحذية' } },
    { to: '/shop/clothing', label: { en: 'Apparel', ar: 'الملابس' } },
    { to: '/shop/accessories', label: { en: 'Accessories', ar: 'الإكسسوارات' } },
    { to: '/shop/basketballs', label: { en: 'Basketballs', ar: 'كرات السلة' } },
    { to: '/shop/equipment', label: { en: 'Equipment', ar: 'المعدات' } },
  ],
  discover: [
    { to: '/discover', label: { en: 'Discover', ar: 'اكتشف' } },
    { to: '/discover/trending-now', label: { en: 'Trending now', ar: 'الرائج الآن' } },
    { to: '/discover/just-dropped', label: { en: 'Just dropped', ar: 'وصل للتو' } },
    { to: '/discover/performance-picks', label: { en: 'Performance picks', ar: 'اختيارات الأداء' } },
    { to: '/releases', label: { en: 'Releases', ar: 'الإصدارات' } },
  ],
  company: [
    { to: '/customize', label: { en: 'Custom', ar: 'التخصيص' } },
    { to: '/teams-wholesale', label: { en: 'Teams & Wholesale', ar: 'الأندية والجملة' } },
    { to: '/stories', label: { en: 'Stories', ar: 'القصص' } },
    { to: '/about', label: { en: 'About', ar: 'عن شبابنا' } },
    { to: '/contact', label: { en: 'Contact', ar: 'تواصل' } },
  ],
  help: [
    { to: '/help', label: { en: 'Help', ar: 'المساعدة' } },
    { to: '/size-guide', label: { en: 'Size guide', ar: 'دليل المقاسات' } },
    { to: '/shipping-returns', label: { en: 'Shipping & returns', ar: 'الشحن والإرجاع' } },
    { to: '/order-tracking', label: { en: 'Track order', ar: 'تتبع الطلب' } },
    { to: '/special-request', label: { en: 'Special request', ar: 'طلب خاص' } },
  ],
  legal: [
    { to: '/privacy-policy', label: { en: 'Privacy', ar: 'الخصوصية' } },
    { to: '/terms', label: { en: 'Terms', ar: 'الشروط' } },
    { to: '/cookies', label: { en: 'Cookies', ar: 'ملفات الارتباط' } },
  ],
};
