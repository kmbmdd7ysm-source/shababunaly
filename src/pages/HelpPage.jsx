import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import PageHero from '../components/common/PageHero';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { normalizeSearchText } from '../utils/search';
import Icon from '../components/icons/Icon';

const HELP_TOPICS = [
  {
    id: 'returns',
    title: { en: 'Returns & Exchanges', ar: 'الإرجاع والاستبدال' },
    summary: {
      en: 'Review the official return and exchange conditions before sending an item back. Eligibility, timing and refund handling are governed by the current Shipping & Returns and Refund Policy pages.',
      ar: 'راجع شروط الإرجاع والاستبدال الرسمية قبل إعادة أي منتج. تخضع الأهلية والمدة وطريقة رد المبلغ لصفحات الشحن والإرجاع وسياسة الاسترداد الحالية.',
    },
    keywords: {
      en: ['return', 'exchange', 'refund', 'damaged item'],
      ar: ['إرجاع', 'استبدال', 'استرداد', 'منتج تالف'],
    },
    links: [
      { to: '/shipping-returns', label: { en: 'Shipping & Returns', ar: 'الشحن والإرجاع' } },
      { to: '/refund-policy', label: { en: 'Refund Policy', ar: 'سياسة الاسترداد' } },
    ],
  },
  {
    id: 'shipping',
    title: { en: 'Shipping & Delivery', ar: 'الشحن والتوصيل' },
    summary: {
      en: 'Find current delivery coverage, timing and return-shipping information on the Shipping & Returns page. Use Order Tracking for an order already placed.',
      ar: 'اعثر على نطاق التوصيل والمدد ومعلومات شحن الإرجاع الحالية في صفحة الشحن والإرجاع. استخدم تتبع الطلب للطلبات التي تم إنشاؤها بالفعل.',
    },
    keywords: {
      en: ['shipping', 'delivery', 'arrival', 'tracking'],
      ar: ['شحن', 'توصيل', 'وصول', 'تتبع'],
    },
    links: [
      { to: '/shipping-returns', label: { en: 'Shipping & Returns', ar: 'الشحن والإرجاع' } },
      { to: '/order-tracking', label: { en: 'Order Tracking', ar: 'تتبع الطلب' } },
    ],
  },
  {
    id: 'orders',
    title: { en: 'Orders & Payment', ar: 'الطلبات والدفع' },
    summary: {
      en: 'Guests can look up an order with both the order number and checkout email. Signed-in customers can review My Orders. Payment methods are shown only when configured; an online payment is never treated as paid without provider confirmation.',
      ar: 'يمكن للضيوف البحث عن الطلب باستخدام رقم الطلب والبريد المستخدم عند الدفع معاً. ويمكن للمستخدم المسجل مراجعة طلباتي. تظهر طرق الدفع فقط عند تهيئتها، ولا يعتبر الدفع الإلكتروني مدفوعاً دون تأكيد موثوق من مزود الدفع.',
    },
    keywords: {
      en: ['order', 'payment', 'cash on delivery', 'my orders', 'track'],
      ar: ['طلب', 'دفع', 'الدفع عند الاستلام', 'طلباتي', 'تتبع'],
    },
    links: [
      { to: '/order-tracking', label: { en: 'Order Tracking', ar: 'تتبع الطلب' } },
      { to: '/checkout', label: { en: 'Checkout', ar: 'إتمام الطلب' } },
      { to: '/account', label: { en: 'Account', ar: 'الحساب' } },
    ],
  },
  {
    id: 'shopping',
    title: { en: 'Shopping', ar: 'التسوق' },
    summary: {
      en: 'Browse real products and variants, check sizing, add items to the shared cart, save Favorites and use Compare without creating duplicate shopping state.',
      ar: 'تصفح المنتجات والخيارات الفعلية، وراجع المقاسات، وأضف العناصر إلى السلة المشتركة، واحفظ المفضلة واستخدم المقارنة دون إنشاء حالة تسوق مكررة.',
    },
    keywords: {
      en: ['shop', 'variant', 'cart', 'favorites', 'compare', 'size'],
      ar: ['متجر', 'خيار', 'سلة', 'مفضلة', 'مقارنة', 'مقاس'],
    },
    links: [
      { to: '/shop', label: { en: 'Shop', ar: 'المتجر' } },
      { to: '/size-guide', label: { en: 'Size Guide', ar: 'دليل المقاسات' } },
      { to: '/favorites', label: { en: 'Favorites', ar: 'المفضلة' } },
      { to: '/compare', label: { en: 'Compare', ar: 'المقارنة' } },
    ],
  },
  {
    id: 'custom-wholesale',
    title: { en: 'Custom, Teams & Wholesale', ar: 'التصميم الخاص والأندية والجملة' },
    summary: {
      en: 'Custom apparel starts from ten pieces, custom basketballs from six and basketball hoop systems from one unit. Approved custom and wholesale orders use 50% before production and 50% when the goods arrive, with a 30–60 day estimate.',
      ar: 'يبدأ تصنيع الملابس المخصصة من عشر قطع، والكرات المخصصة من ست كرات، ومنظومات السلات من وحدة واحدة. تُدفع 50% قبل التصنيع و50% عند وصول البضاعة، والمدة التقديرية 30–60 يومًا.',
    },
    keywords: {
      en: ['custom', 'uniform', 'wholesale', 'club', 'academy', 'minimum order'],
      ar: ['تصميم خاص', 'سيريا', 'جملة', 'نادي', 'أكاديمية', 'حد أدنى'],
    },
    links: [
      { to: '/customize', label: { en: 'Customize', ar: 'تصميم خاص' } },
      { to: '/teams-wholesale', label: { en: 'Teams & Wholesale', ar: 'الأندية والجملة' } },
      { to: '/faq', label: { en: 'Frequently Asked Questions', ar: 'الأسئلة الشائعة' } },
    ],
  },
  {
    id: 'account',
    title: { en: 'Account & Privacy', ar: 'الحساب والخصوصية' },
    summary: {
      en: 'Sign in to manage saved account information and view orders associated with your authenticated user ID. Privacy handling is described in the authoritative Privacy Policy.',
      ar: 'سجّل الدخول لإدارة بيانات الحساب المحفوظة وعرض الطلبات المرتبطة بمعرف المستخدم الموثق. توضح سياسة الخصوصية الرسمية كيفية التعامل مع البيانات.',
    },
    keywords: {
      en: ['account', 'sign in', 'privacy', 'saved details'],
      ar: ['حساب', 'تسجيل الدخول', 'خصوصية', 'بيانات محفوظة'],
    },
    links: [
      { to: '/account', label: { en: 'Account', ar: 'الحساب' } },
      { to: '/privacy-policy', label: { en: 'Privacy Policy', ar: 'سياسة الخصوصية' } },
      { to: '/terms', label: { en: 'Terms & Conditions', ar: 'الشروط والأحكام' } },
    ],
  },
  {
    id: 'product',
    title: { en: 'Product & Size Help', ar: 'مساعدة المنتجات والمقاسات' },
    summary: {
      en: 'Each product page contains the available product details and options. Use the Size Guide for measurement guidance, or contact support when a listed detail is unclear.',
      ar: 'تحتوي كل صفحة منتج على التفاصيل والخيارات المتاحة. استخدم دليل المقاسات لإرشادات القياس، أو تواصل مع الدعم عندما تكون إحدى التفاصيل غير واضحة.',
    },
    keywords: {
      en: ['product', 'size', 'fit', 'measurement', 'variant'],
      ar: ['منتج', 'مقاس', 'قياس', 'ملاءمة', 'خيار'],
    },
    links: [
      { to: '/size-guide', label: { en: 'Size Guide', ar: 'دليل المقاسات' } },
      { to: '/shop', label: { en: 'Shop', ar: 'المتجر' } },
      { to: '/contact', label: { en: 'Contact Us', ar: 'تواصل معنا' } },
    ],
  },
  {
    id: 'contact',
    title: { en: 'Contact Support', ar: 'التواصل مع الدعم' },
    summary: {
      en: 'Use the Contact page for order, product, custom production, wholesale or account questions that are not answered in the published help and policy pages.',
      ar: 'استخدم صفحة التواصل لأسئلة الطلبات أو المنتجات أو التصنيع المخصص أو الجملة أو الحسابات التي لا تجيب عنها صفحات المساعدة والسياسات المنشورة.',
    },
    keywords: {
      en: ['contact', 'support', 'message', 'question'],
      ar: ['تواصل', 'دعم', 'رسالة', 'سؤال'],
    },
    links: [{ to: '/contact', label: { en: 'Contact Us', ar: 'تواصل معنا' } }],
  },
];

export { HELP_TOPICS };

export default function HelpPage() {
  const { pick, lang } = useLanguage();
  const auth = useAuth();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState('');
  const normalizedQuery = normalizeSearchText(query);
  const filtered = useMemo(
    () =>
      HELP_TOPICS.filter((topic) => {
        if (!normalizedQuery) return true;
        const haystack = [
          topic.title[lang],
          topic.summary[lang],
          ...(topic.keywords[lang] || []),
          ...topic.links.map((link) => link.label[lang]),
        ].join(' ');
        return normalizeSearchText(haystack).includes(normalizedQuery);
      }),
    [normalizedQuery, lang],
  );

  return (
    <>
      <Seo
        title={pick({ en: 'Help', ar: 'المساعدة' })}
        description={pick({
          en: 'Support for orders, shopping, custom production and accounts.',
          ar: 'دعم للطلبات والتسوق والتصنيع المخصص والحسابات.',
        })}
        path="/help"
      />
      <PageHero
        label={pick({ en: 'Support', ar: 'الدعم' })}
        title={pick({ en: 'Get Help', ar: 'احصل على المساعدة' })}
        description={pick({
          en: 'Find clear answers and the right next step.',
          ar: 'اعثر على إجابات واضحة والخطوة المناسبة التالية.',
        })}
      />
      <section className="section help-page">
        <div className="container narrow">
          <div className="help-search">
            <label htmlFor="help-search-input">
              {pick({ en: 'What can we help you with?', ar: 'كيف يمكننا مساعدتك؟' })}
            </label>
            <div className="search-input-wrap">
              <input
                id="help-search-input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label={pick({ en: 'Clear help search', ar: 'مسح بحث المساعدة' })}
                >
                  <Icon name="close" size={20} />
                </button>
              )}
            </div>
          </div>
          <div className="help-account-callout">
            <h2>
              {auth.user
                ? pick({ en: 'Personalized support', ar: 'دعم مخصص' })
                : pick({ en: 'Get a personalized experience', ar: 'احصل على تجربة مخصصة' })}
            </h2>
            <p>
              {auth.user
                ? pick({
                    en: 'Review your orders and saved account details from one place.',
                    ar: 'راجع طلباتك وبيانات حسابك المحفوظة من مكان واحد.',
                  })
                : pick({
                    en: 'Sign in to access your orders and saved details.',
                    ar: 'سجّل الدخول للوصول إلى طلباتك وبياناتك المحفوظة.',
                  })}
            </p>
            <div className="button-row">
              <Link className="btn-primary" to={auth.user ? '/order-tracking' : '/account'}>
                {auth.user
                  ? pick({ en: 'My Orders', ar: 'طلباتي' })
                  : pick({ en: 'Sign In', ar: 'تسجيل الدخول' })}
              </Link>
              {!auth.user && (
                <Link className="btn-secondary" to="/account?mode=signup">
                  {pick({ en: 'Create Account', ar: 'إنشاء حساب' })}
                </Link>
              )}
            </div>
          </div>
          <h2>{pick({ en: 'Quick Assists', ar: 'مساعدة سريعة' })}</h2>
          <p className="help-result-count" role="status" aria-live="polite">
            {pick({ en: `${filtered.length} topics`, ar: `${filtered.length} مواضيع` })}
          </p>
          <div className="help-accordions">
            {filtered.map((topic) => {
              const panelId = `help-${topic.id}`;
              const expanded = open === topic.id;
              return (
                <section className="help-topic" key={topic.id}>
                  <h3>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      onClick={() => setOpen(expanded ? '' : topic.id)}
                    >
                      <span>{pick(topic.title)}</span>
                      <Icon name={expanded ? 'minus' : 'plus'} size={20} />
                    </button>
                  </h3>
                  <div id={panelId} hidden={!expanded}>
                    <p>{pick(topic.summary)}</p>
                    <div className="help-topic-links">
                      {topic.links.map((link) => (
                        <Link key={link.to} to={link.to}>
                          {pick(link.label)}
                        </Link>
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}
            {!filtered.length && (
              <div className="notice notice--muted" role="status">
                <p>
                  {pick({
                    en: 'No help topics match your search.',
                    ar: 'لا توجد مواضيع مساعدة مطابقة لبحثك.',
                  })}
                </p>
                <button type="button" className="link-btn" onClick={() => setQuery('')}>
                  {pick({ en: 'Clear search', ar: 'مسح البحث' })}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
