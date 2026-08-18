export const faqCategories = [
  {
    key: 'shop',
    title: { en: 'Shop', ar: 'المتجر' },
    items: [
      {
        q: { en: 'Can I buy one piece?', ar: 'هل يمكنني شراء قطعة واحدة؟' },
        a: {
          en: 'Yes. Products marked for retail can be purchased by the piece. Many also have a lower wholesale price from the minimum shown on the product page.',
          ar: 'نعم. المنتجات المتاحة للأفراد يمكن شراؤها بالقطعة. ويتوفر للعديد منها سعر جملة أقل ابتداءً من الحد الظاهر في صفحة المنتج.',
        },
      },
      {
        q: {
          en: 'What does the green Ready to Ship mark mean?',
          ar: 'ماذا تعني علامة التسليم الفوري الخضراء؟',
        },
        a: {
          en: 'It means the item is in stock in Libya and is estimated to arrive in 24–72 hours. This status is shown only for delivery inside Libya.',
          ar: 'تعني أن المنتج موجود في المخزون داخل ليبيا ويصل تقديريًا خلال 24–72 ساعة. وتظهر هذه الحالة للتوصيل داخل ليبيا فقط.',
        },
      },
    ],
  },
  {
    key: 'currency',
    title: { en: 'Currency & Prices', ar: 'العملة والأسعار' },
    items: [
      {
        q: {
          en: 'How are USD and LYD prices calculated?',
          ar: 'كيف يتم حساب أسعار الدولار والدينار؟',
        },
        a: {
          en: 'All base prices are stored in USD. LYD prices are converted using Shababuna’s current editable exchange rate. You can switch currency at any time.',
          ar: 'تُحفظ الأسعار الأساسية بالدولار، وتُحوّل إلى الدينار بسعر التحويل الحالي القابل للتعديل لدى شبابنا. ويمكنك تغيير العملة في أي وقت.',
        },
      },
      {
        q: { en: 'Is wholesale cheaper?', ar: 'هل سعر الجملة أقل؟' },
        a: {
          en: 'Where offered, the wholesale unit price is lower and starts from the minimum quantity shown for that product.',
          ar: 'عندما يكون متوفرًا، يكون سعر القطعة في الجملة أقل ويبدأ من الحد الأدنى الظاهر لذلك المنتج.',
        },
      },
    ],
  },
  {
    key: 'custom',
    title: { en: 'Customize', ar: 'التصميم الخاص' },
    items: [
      {
        q: { en: 'What are the minimum quantities?', ar: 'ما الحد الأدنى للكميات؟' },
        a: {
          en: 'Custom apparel starts from 10 pieces, custom basketballs from 6, and hoop or equipment products can start from 1. Other products show their own minimum.',
          ar: 'تبدأ الملابس المخصصة من 10 قطع والكرات المخصصة من 6، ويمكن أن تبدأ السلات أو المعدات من وحدة واحدة. ويظهر لكل منتج آخر حده الخاص.',
        },
      },
      {
        q: { en: 'When does custom production begin?', ar: 'متى يبدأ التصنيع المخصص؟' },
        a: {
          en: 'Only after the approved quote states the required payment terms and the final design proof, names, numbers, colors and sizes are approved.',
          ar: 'فقط بعد أن يحدد عرض السعر المعتمد شروط الدفع المطلوبة واعتماد البروفة النهائية والأسماء والأرقام والألوان والمقاسات.',
        },
      },
      {
        q: { en: 'How long does custom production take?', ar: 'كم يستغرق التصنيع المخصص؟' },
        a: {
          en: 'The timeline is confirmed in the approved quote after the product, quantity, materials, destination and approval requirements are reviewed.',
          ar: 'يتم تأكيد المدة في عرض السعر المعتمد بعد مراجعة المنتج والكمية والخامات والوجهة ومتطلبات الاعتماد.',
        },
      },
    ],
  },
  {
    key: 'payments',
    title: { en: 'Payments', ar: 'المدفوعات' },
    items: [
      {
        q: { en: 'Which payment methods are supported?', ar: 'ما طرق الدفع المتاحة؟' },
        a: {
          en: 'Inside Libya, cash is available when the order is eligible. Card or digital-payment methods appear only when their production provider is actually connected. Outside Libya, payment and shipping options are confirmed for the destination before fulfilment.',
          ar: 'داخل ليبيا يتوفر الدفع النقدي عندما يكون الطلب مؤهلاً. ولا تظهر طرق البطاقة أو الدفع الرقمي إلا عندما يكون مزودها الفعلي مربوطًا وجاهزًا. وخارج ليبيا يتم تأكيد خيارات الدفع والشحن للوجهة قبل التنفيذ.',
        },
      },
      {
        q: { en: 'Can I pay 50%?', ar: 'هل يمكن دفع 50%؟' },
        a: {
          en: 'Retail cash orders inside Libya can use the options shown at checkout. Card methods appear only when a production provider is connected. Custom, club and wholesale payment terms are defined by the approved quote before any payment is requested.',
          ar: 'تستخدم طلبات الأفراد النقدية داخل ليبيا الخيارات الظاهرة في صفحة الدفع. ولا تظهر طرق البطاقة إلا عند ربط مزود فعلي. أما شروط دفع التصميم والأندية والجملة فتُحدد في عرض السعر المعتمد قبل طلب أي دفعة.',
        },
      },
    ],
  },
  {
    key: 'shipping',
    title: { en: 'Shipping', ar: 'الشحن' },
    items: [
      {
        q: { en: 'How much is delivery inside Libya?', ar: 'كم سعر التوصيل داخل ليبيا؟' },
        a: {
          en: 'Standard delivery is 20 LYD and is free when the product subtotal reaches 70 USD (630 LYD at the store rate) or more.',
          ar: 'التوصيل العادي 20 د.ل، ويصبح مجانيًا عندما يصل إجمالي المنتجات إلى 70 دولارًا أمريكيًا (630 د.ل بسعر المتجر) أو أكثر.',
        },
      },
      {
        q: { en: 'Do you ship worldwide?', ar: 'هل يوجد شحن عالمي؟' },
        a: {
          en: 'Yes. Each destination has its own price. If a country rate has not been added yet, the order stays pending until Shababuna adds the shipping price and you approve it.',
          ar: 'نعم. لكل وجهة سعرها. وإذا لم تتم إضافة سعر دولة بعد، يبقى الطلب معلقًا حتى تضيف شبابنا تكلفة الشحن وتعتمدها أنت.',
        },
      },
    ],
  },
  {
    key: 'accounts',
    title: { en: 'Accounts & Orders', ar: 'الحسابات والطلبات' },
    items: [
      {
        q: { en: 'Do I need an account?', ar: 'هل أحتاج إلى حساب؟' },
        a: {
          en: 'No. You can order as a guest or create an account. Club and wholesale accounts add saved designs, rosters, quotes, invoices and reorder tools.',
          ar: 'لا. يمكنك الطلب كزائر أو إنشاء حساب. وتضيف حسابات الأندية والجملة التصاميم المحفوظة والقوائم والعروض والفواتير وأدوات إعادة الطلب.',
        },
      },
      {
        q: {
          en: 'How do international pending orders work?',
          ar: 'كيف تعمل الطلبات الدولية المعلقة؟',
        },
        a: {
          en: 'The order is saved with no final payment collected while shipping is unknown. After the rate is added, you review the updated total and complete payment.',
          ar: 'يُحفظ الطلب بدون تحصيل الدفع النهائي عندما يكون الشحن غير معروف. وبعد إضافة السعر تراجع الإجمالي المحدث وتكمل الدفع.',
        },
      },
    ],
  },
];
export const allFaqs = faqCategories.flatMap((category) => category.items);
