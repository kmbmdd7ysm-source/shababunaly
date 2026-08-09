const S = (hEn, hAr, pEn, pAr) => ({ h: { en: hEn, ar: hAr }, p: { en: pEn, ar: pAr } });

export const legal = {
  'privacy-policy': {
    title: { en: 'Privacy Policy', ar: 'سياسة الخصوصية' },
    intro: {
      en: 'How Shababuna handles information used for accounts, orders, quotations, delivery and support.',
      ar: 'كيفية تعامل شبابنا مع المعلومات المستخدمة للحسابات والطلبات وعروض الأسعار والتوصيل والدعم.',
    },
    sections: [
      S(
        'Information We Collect',
        'المعلومات التي نجمعها',
        'We collect details you submit, including identity, contact, delivery, organization, roster, design and order information. We also process limited device and website data required for security and operation.',
        'نجمع البيانات التي تقدمها، ومنها الهوية والتواصل والتوصيل والمؤسسة وقوائم الفرق والتصاميم والطلبات. كما نعالج بيانات محدودة عن الجهاز والموقع لازمة للأمان والتشغيل.',
      ),
      S(
        'Accounts & Orders',
        'الحسابات والطلبات',
        'Information is used to create and secure accounts, process retail and wholesale orders, prepare quotes, approve designs, manage payments, arrange delivery and provide order tracking.',
        'تُستخدم المعلومات لإنشاء الحسابات وحمايتها ومعالجة طلبات الأفراد والجملة وإعداد العروض واعتماد التصاميم وإدارة الدفعات وترتيب التوصيل وتتبع الطلب.',
      ),
      S(
        'Files & Custom Designs',
        'الملفات والتصاميم الخاصة',
        'Logos, rosters and reference files are used only to review and produce the requested work, subject to the permissions you have to submit them.',
        'تُستخدم الشعارات وقوائم اللاعبين والملفات المرجعية فقط لمراجعة وتنفيذ العمل المطلوب، على أن تكون لديك صلاحية إرسالها.',
      ),
      S(
        'Payments',
        'المدفوعات',
        'Shababuna does not store full card details. Card data is handled by the connected bank or payment provider. Cash and pending-payment records contain only the payment status and business references required to manage the order.',
        'لا تخزن شبابنا بيانات البطاقة كاملة. تتم معالجة بيانات البطاقة عبر المصرف أو مزود الدفع المرتبط. وتحتوي سجلات الدفع النقدي أو المعلق فقط على حالة الدفع والمراجع اللازمة لإدارة الطلب.',
      ),
      S(
        'Storage, Security & Retention',
        'التخزين والأمان والاحتفاظ',
        'We use reasonable technical and organizational safeguards. Order and account records may be retained as needed for service, legal, accounting, fraud-prevention and support purposes.',
        'نستخدم إجراءات تقنية وتنظيمية معقولة. وقد نحتفظ بسجلات الحسابات والطلبات للمدة اللازمة للخدمة والمتطلبات القانونية والمحاسبة ومنع الاحتيال والدعم.',
      ),
      S(
        'Your Choices',
        'خياراتك',
        'You may request access, correction or deletion where applicable by contacting shababuna.info@gmail.com. Some order records may need to be retained for legal or operational reasons.',
        'يمكنك طلب الوصول أو التصحيح أو الحذف حيث ينطبق عبر shababuna.info@gmail.com. وقد يلزم الاحتفاظ ببعض سجلات الطلبات لأسباب قانونية أو تشغيلية.',
      ),
    ],
  },
  terms: {
    title: { en: 'Terms & Conditions', ar: 'الشروط والأحكام' },
    intro: {
      en: 'These terms govern use of shababuna.ly and purchases from Shababuna.',
      ar: 'تنظم هذه الشروط استخدام shababuna.ly والشراء من شبابنا.',
    },
    sections: [
      S(
        'Product Information & Currency',
        'معلومات المنتجات والعملة',
        'The system stores base prices in USD. LYD display prices are calculated using Shababuna’s editable exchange rate. The price, quantity, discount and payment amount shown in the final order summary control that order.',
        'يحفظ النظام الأسعار الأساسية بالدولار. وتُحسب أسعار الدينار حسب سعر التحويل القابل للتعديل في شبابنا. ويُعتمد السعر والكمية والخصم ومبلغ الدفع الظاهر في الملخص النهائي لذلك الطلب.',
      ),
      S(
        'Retail, Wholesale & Minimum Quantities',
        'البيع بالقطعة والجملة والحد الأدنى',
        'Some products are offered by the piece and at a lower wholesale price from the stated minimum. Custom apparel normally starts from 10 pieces, custom basketballs from 6, and hoop systems from 1 unless the product page or quote states otherwise.',
        'تتوفر بعض المنتجات بالقطعة وبسعر جملة أقل ابتداءً من الحد المعلن. يبدأ تصنيع الملابس المخصصة عادةً من 10 قطع والكرات المخصصة من 6 والسلات من وحدة واحدة، ما لم تنص صفحة المنتج أو العرض على غير ذلك.',
      ),
      S(
        'Custom Design Approval',
        'اعتماد التصميم الخاص',
        'Production begins only after the required deposit and written or digital approval of the final proof. Approval confirms names, numbers, colors, logos, sizes and placement. Changes after approval may require a new quote, fee or timeline.',
        'يبدأ التصنيع فقط بعد الدفعة المطلوبة واعتماد البروفة النهائية كتابيًا أو إلكترونيًا. ويشمل الاعتماد الأسماء والأرقام والألوان والشعارات والمقاسات والأماكن. قد تتطلب التعديلات بعد الاعتماد عرضًا أو رسومًا أو مدة جديدة.',
      ),
      S(
        'Payment Terms',
        'شروط الدفع',
        'Retail cash orders inside Libya may be confirmed with 50% or paid in full. Retail card and digital-payment orders require full payment. Custom, club and wholesale orders normally require 50% before production and 50% when the goods arrive, unless the approved quote states otherwise.',
        'يمكن تأكيد طلبات الأفراد النقدية داخل ليبيا بدفع 50% أو دفع القيمة كاملة. وتتطلب طلبات الأفراد بالبطاقة أو الدفع الإلكتروني الدفع الكامل. وتتطلب طلبات التصميم والأندية والجملة عادةً 50% قبل التصنيع و50% عند وصول البضاعة، ما لم ينص العرض المعتمد على غير ذلك.',
      ),
      S(
        'International Orders',
        'الطلبات الدولية',
        'Worldwide shipping is available. When a destination shipping price has not been configured, the order remains pending and no final payment is collected until the shipping quote is added and approved. Import duties, taxes or local fees may be the customer’s responsibility.',
        'الشحن متاح عالميًا. عندما لا يكون سعر وجهة ما مضافًا، يبقى الطلب معلقًا ولا يتم تحصيل الدفع النهائي حتى إضافة واعتماد سعر الشحن. وقد تكون الرسوم الجمركية أو الضرائب أو الرسوم المحلية مسؤولية العميل.',
      ),
      S(
        'Intellectual Property',
        'الملكية الفكرية',
        'Shababuna and LHA names, marks, designs and website content may not be copied or used without permission. Customers must have the right to submit every logo, sponsor mark, name and design supplied for custom production.',
        'لا يجوز نسخ أو استخدام أسماء أو علامات أو تصاميم أو محتوى شبابنا وLHA دون إذن. ويجب أن يملك العميل حق استخدام كل شعار أو علامة راعٍ أو اسم أو تصميم يرسله للتصنيع المخصص.',
      ),
    ],
  },
  cookies: {
    title: { en: 'Cookie Policy', ar: 'سياسة ملفات الارتباط' },
    intro: {
      en: 'How Shababuna uses browser storage and optional analytics.',
      ar: 'كيفية استخدام شبابنا لتخزين المتصفح والتحليلات الاختيارية.',
    },
    sections: [
      S(
        'Necessary Storage',
        'التخزين الضروري',
        'Necessary storage remembers language, currency, country, cart, authentication state, favorites, account preferences and cookie choices. It is required for core site functions.',
        'يتذكر التخزين الضروري اللغة والعملة والدولة والسلة وحالة الدخول والمفضلة وتفضيلات الحساب وخيارات ملفات الارتباط، وهو ضروري للوظائف الأساسية.',
      ),
      S(
        'Optional Analytics',
        'التحليلات الاختيارية',
        'Analytics and marketing technologies run only when enabled and consented to where required. They help measure performance, navigation and campaign results.',
        'تعمل تقنيات التحليل والتسويق فقط عند تفعيلها والحصول على الموافقة حيث يلزم، وتساعد في قياس الأداء والتنقل ونتائج الحملات.',
      ),
      S(
        'Control',
        'التحكم',
        'You can change cookie preferences from the footer. Browser controls may also remove stored data, although this can clear the cart or signed-in state.',
        'يمكن تغيير التفضيلات من التذييل. كما يمكن حذف البيانات من إعدادات المتصفح، وقد يؤدي ذلك إلى مسح السلة أو حالة تسجيل الدخول.',
      ),
    ],
  },
  'shipping-returns': {
    title: { en: 'Shipping & Returns', ar: 'الشحن والإرجاع' },
    intro: {
      en: 'Delivery rules for Libya, international destinations, ready stock and custom production.',
      ar: 'قواعد التوصيل داخل ليبيا والوجهات الدولية والمخزون الجاهز والتصنيع المخصص.',
    },
    sections: [
      S(
        'Libya Delivery Cost',
        'سعر التوصيل داخل ليبيا',
        'Standard delivery inside Libya is 20 LYD and is free when the product subtotal reaches 70 USD (630 LYD at the store rate) or more. Large equipment or a quote may specify a separate delivery cost.',
        'التوصيل العادي داخل ليبيا 20 د.ل، ويصبح مجانيًا عندما يصل إجمالي المنتجات إلى 70 دولارًا أمريكيًا (630 د.ل بسعر المتجر) أو أكثر. وقد تحدد المعدات الكبيرة أو عروض الأسعار تكلفة مختلفة.',
      ),
      S(
        'Ready to Ship',
        'التسليم الفوري',
        'The green Ready to Ship mark applies only to stock available in Libya. Estimated delivery is 24–72 hours, subject to address confirmation and operational conditions.',
        'تطبق علامة التسليم الفوري الخضراء فقط على المخزون المتوفر داخل ليبيا. والمدة التقديرية 24–72 ساعة، مع مراعاة تأكيد العنوان والظروف التشغيلية.',
      ),
      S(
        'Standard Libya Orders',
        'الطلبات العادية إلى ليبيا',
        'Products not marked Ready to Ship have an estimated delivery time of 14–18 days to Libya unless the product or confirmed order states another timeline.',
        'المنتجات غير المميزة بالتسليم الفوري تصل إلى ليبيا تقديريًا خلال 14–18 يومًا ما لم تحدد صفحة المنتج أو الطلب المؤكد مدة أخرى.',
      ),
      S(
        'Custom, Club & Wholesale',
        'التصميم والأندية والجملة',
        'Estimated production and delivery is normally 30–60 days depending on the product, quantity, approval date, materials and order timing. Estimates begin after deposit and final design approval.',
        'تبلغ مدة التصنيع والوصول عادةً 30–60 يومًا حسب المنتج والكمية وتاريخ الاعتماد والخامات ووقت الطلب. ويبدأ التقدير بعد دفع العربون واعتماد التصميم النهائي.',
      ),
      S(
        'Worldwide Shipping',
        'الشحن العالمي',
        'Shipping is available worldwide. Cost and delivery time are set per destination. If no rate exists, the order remains pending until Shababuna adds the shipping quote and the customer approves it.',
        'الشحن متاح لجميع دول العالم. يتم تحديد التكلفة والمدة لكل وجهة. وإذا لم يوجد سعر، يبقى الطلب معلقًا حتى تضيف شبابنا عرض الشحن ويعتمده العميل.',
      ),
      S(
        'Returns',
        'الإرجاع',
        'Unused standard products may be eligible for return after inspection and prior authorization. Personalized, printed, custom-made, worn, used or hygiene-sensitive products are generally not returnable unless defective or required by law.',
        'قد تكون المنتجات العادية غير المستخدمة مؤهلة للإرجاع بعد الفحص والموافقة المسبقة. أما المنتجات المخصصة أو المطبوعة أو المصنّعة حسب الطلب أو المستخدمة أو الحساسة صحيًا فلا تقبل الإرجاع عادةً إلا عند وجود عيب أو إذا تطلب القانون ذلك.',
      ),
    ],
  },
  'refund-policy': {
    title: { en: 'Refund Policy', ar: 'سياسة الاسترداد' },
    intro: {
      en: 'How deposits, standard purchases and custom orders are handled.',
      ar: 'كيفية التعامل مع العربون والمشتريات العادية والطلبات المخصصة.',
    },
    sections: [
      S(
        'Standard Products',
        'المنتجات العادية',
        'Approved refunds for eligible standard products are issued after the item is received and inspected. Original delivery charges may be non-refundable unless the order was incorrect or defective.',
        'تتم إعادة قيمة المنتجات العادية المؤهلة بعد استلام المنتج وفحصه. وقد لا تكون رسوم التوصيل الأصلية قابلة للاسترداد إلا إذا كان الطلب خاطئًا أو معيبًا.',
      ),
      S(
        'Custom Deposits',
        'عربون الطلبات المخصصة',
        'Before design work, material reservation or production starts, Shababuna may approve a cancellation. After work or production begins, the deposit is generally non-refundable because it covers committed design, material and manufacturing costs.',
        'قبل بدء التصميم أو حجز الخامات أو التصنيع، قد توافق شبابنا على الإلغاء. وبعد بدء العمل أو الإنتاج يكون العربون غير قابل للاسترداد عادةً لأنه يغطي تكاليف التصميم والخامات والتصنيع الملتزم بها.',
      ),
      S(
        'Approved Custom Products',
        'المنتجات المخصصة المعتمدة',
        'Products produced according to an approved proof, roster and size list are not refundable for preference changes, spelling, number, color, logo or size choices that were approved by the customer.',
        'لا تسترد قيمة المنتجات المصنعة وفق بروفة وقائمة أسماء ومقاسات معتمدة بسبب تغيير الرأي أو أخطاء الاسم أو الرقم أو اللون أو الشعار أو المقاس التي اعتمدها العميل.',
      ),
      S(
        'Defects or Production Errors',
        'العيوب أو أخطاء التصنيع',
        'Contact Shababuna promptly with clear photos and the order number. Verified defects or production differences from the approved proof will be reviewed for repair, replacement, credit or refund as appropriate.',
        'تواصل مع شبابنا سريعًا مع صور واضحة ورقم الطلب. وتتم مراجعة العيوب المؤكدة أو الاختلاف عن البروفة المعتمدة للإصلاح أو الاستبدال أو الرصيد أو الاسترداد حسب الحالة.',
      ),
      S(
        'Requesting a Review',
        'طلب المراجعة',
        'Send the order number, item, issue and supporting media to shababuna.info@gmail.com or WhatsApp +218 92 657 8062.',
        'أرسل رقم الطلب والمنتج والمشكلة والصور الداعمة إلى shababuna.info@gmail.com أو واتساب +218 92 657 8062.',
      ),
    ],
  },
};
export const getLegal = (key) => legal[key];
