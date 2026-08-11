import type { CatalogProduct } from '../../context/CatalogContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  PERFORMANCE_METRICS,
  getPerformanceProfile,
  hasVerifiedPerformanceData,
} from '../../utils/productIntelligence';

export default function PerformanceProfile({ product }: { product: CatalogProduct }) {
  const { pick } = useLanguage();
  const profile = getPerformanceProfile(product);
  const verified = hasVerifiedPerformanceData(product);
  const visibleMetrics = PERFORMANCE_METRICS.filter(({ key }) => profile[key]);

  return (
    <section className="px-performance" aria-labelledby="px-performance-title">
      <div className="px-section-head">
        <p className="px-eyebrow">{pick({ en: 'Basketball intelligence', ar: 'ذكاء كرة السلة' })}</p>
        <h2 id="px-performance-title">{pick({ en: 'Performance profile', ar: 'ملف الأداء' })}</h2>
        <p>
          {verified
            ? pick({
                en: 'Only verified product data is shown here. Unknown attributes stay unknown.',
                ar: 'نعرض هنا بيانات المنتج الموثقة فقط. أي خاصية غير موثقة تبقى غير موثقة.',
              })
            : pick({
                en: 'Performance testing has not been verified for this catalogue item yet. We do not invent scores.',
                ar: 'لم يتم توثيق اختبارات الأداء لهذا المنتج بعد. لا نختلق درجات أو تقييمات.',
              })}
        </p>
      </div>

      {visibleMetrics.length > 0 ? (
        <div className="px-performance-grid">
          {visibleMetrics.map(({ key, en, ar }) => {
            const item = profile[key];
            if (!item) return null;
            return (
              <div className="px-metric" key={key}>
                <div className="px-metric-top">
                  <span>{pick({ en, ar })}</span>
                  <strong>{item.value.toFixed(1)}/10</strong>
                </div>
                <progress className="px-meter" max={10} value={item.value} aria-label={`${pick({ en, ar })} ${item.value} / 10`} />
                {item.source ? <small>{item.source}</small> : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-unverified" role="note">
          <strong>{pick({ en: 'Not verified', ar: 'غير موثق' })}</strong>
          <span>{pick({ en: 'Cushioning · traction · support · stability · court feel', ar: 'التبطين · التماسك · الدعم · الثبات · الإحساس بالملعب' })}</span>
        </div>
      )}

      <dl className="px-profile-facts">
        <div>
          <dt>{pick({ en: 'Best for', ar: 'الأنسب لـ' })}</dt>
          <dd>{profile.positions?.length ? profile.positions.join(' · ') : pick({ en: 'Not verified', ar: 'غير موثق' })}</dd>
        </div>
        <div>
          <dt>{pick({ en: 'Court', ar: 'الملعب' })}</dt>
          <dd>{profile.courtTypes?.length ? profile.courtTypes.join(' · ') : pick({ en: 'Not verified', ar: 'غير موثق' })}</dd>
        </div>
        <div>
          <dt>{pick({ en: 'Play style', ar: 'أسلوب اللعب' })}</dt>
          <dd>{profile.playStyles?.length ? profile.playStyles.join(' · ') : pick({ en: 'Not verified', ar: 'غير موثق' })}</dd>
        </div>
        <div>
          <dt>{pick({ en: 'Wide-foot fit', ar: 'للقدم العريضة' })}</dt>
          <dd>{profile.wideFoot == null ? pick({ en: 'Not verified', ar: 'غير موثق' }) : profile.wideFoot ? pick({ en: 'Yes', ar: 'نعم' }) : pick({ en: 'No', ar: 'لا' })}</dd>
        </div>
      </dl>
    </section>
  );
}
