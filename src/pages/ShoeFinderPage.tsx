import { useMemo, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import EditorialMedia from '../components/common/EditorialMedia';
import ProductCard from '../components/shop/ProductCard';
import { useCatalog } from '../context/CatalogContext';
import { useCompare } from '../context/CompareContext';
import { useLanguage } from '../context/LanguageContext';
import { LOCAL_HERO_MEDIA } from '../data/localHeroMedia';
import {
  PERFORMANCE_METRICS,
  rankBasketballShoes,
  type PerformanceMetricKey,
  type ShoeFinderPreferences,
} from '../utils/productIntelligence';
import '../styles/basketball-intelligence.css';

const positions = ['PG', 'SG', 'SF', 'PF', 'C', 'All Around'];
const courts = [
  { value: 'indoor', en: 'Indoor', ar: 'داخلي' },
  { value: 'outdoor', en: 'Outdoor', ar: 'خارجي' },
  { value: 'both', en: 'Both', ar: 'الاثنان' },
];

export default function ShoeFinderPage(): ReactElement {
  const { products } = useCatalog();
  const { pick } = useLanguage();
  const compare = useCompare();
  const [prefs, setPrefs] = useState<ShoeFinderPreferences>({
    position: '',
    court: '',
    priority: '',
    foot: '',
    maxPrice: null,
  });
  const [hasRun, setHasRun] = useState(false);

  const matches = useMemo(() => rankBasketballShoes(products, prefs), [products, prefs]);
  const set = <K extends keyof ShoeFinderPreferences>(key: K, value: ShoeFinderPreferences[K]) =>
    setPrefs((current) => ({ ...current, [key]: value }));

  return (
    <>
      <Seo
        title="Basketball Shoe Finder | Shababuna"
        description="Find basketball shoes using verified catalogue and performance data."
        path="/basketball/shoe-finder"
      />
      <div className="bf-page">
        <header className="bf-hero bf-hero--editorial">
          <div className="bf-hero-copy">
            <p className="bf-eyebrow">{pick({ en: 'Basketball intelligence', ar: 'ذكاء كرة السلة' })}</p>
            <h1>{pick({ en: 'Find your next shoe.', ar: 'اعثر على حذائك القادم.' })}</h1>
            <p>
              {pick({
                en: 'Tell us how you play. Only shoes with verified performance evidence enter the ranking — unknown data is excluded, never guessed.',
                ar: 'حدد طريقة لعبك. لا يدخل الترتيب إلا الحذاء الذي عنده بيانات أداء موثقة — البيانات المجهولة تُستبعد ولا يتم تخمينها.',
              })}
            </p>
          </div>
          <div className="bf-hero-media" aria-hidden="true">
            <EditorialMedia
              desktopVideo={LOCAL_HERO_MEDIA.shoeFinder.desktopVideo}
              mobileVideo={LOCAL_HERO_MEDIA.shoeFinder.mobileVideo}
              loading="eager"
            />
          </div>
        </header>

        <form
          className="bf-builder"
          onSubmit={(event) => {
            event.preventDefault();
            setHasRun(true);
          }}
        >
          <fieldset>
            <legend><span>01</span>{pick({ en: 'Position', ar: 'المركز' })}</legend>
            <div className="bf-choice-row">
              {positions.map((item) => (
                <button key={item} type="button" className={prefs.position === item ? 'is-active' : ''} onClick={() => set('position', item)}>{item}</button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend><span>02</span>{pick({ en: 'Court', ar: 'الملعب' })}</legend>
            <div className="bf-choice-row">
              {courts.map((item) => (
                <button key={item.value} type="button" className={prefs.court === item.value ? 'is-active' : ''} onClick={() => set('court', item.value)}>{pick({ en: item.en, ar: item.ar })}</button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend><span>03</span>{pick({ en: 'Priority', ar: 'الأولوية' })}</legend>
            <div className="bf-choice-row bf-choice-row--wrap">
              {PERFORMANCE_METRICS.slice(0, 8).map((item) => (
                <button key={item.key} type="button" className={prefs.priority === item.key ? 'is-active' : ''} onClick={() => set('priority', item.key as PerformanceMetricKey)}>{pick({ en: item.en, ar: item.ar })}</button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend><span>04</span>{pick({ en: 'Foot profile', ar: 'شكل القدم' })}</legend>
            <div className="bf-choice-row">
              <button type="button" className={prefs.foot === 'normal' ? 'is-active' : ''} onClick={() => set('foot', 'normal')}>{pick({ en: 'Normal', ar: 'عادية' })}</button>
              <button type="button" className={prefs.foot === 'wide' ? 'is-active' : ''} onClick={() => set('foot', 'wide')}>{pick({ en: 'Wide', ar: 'عريضة' })}</button>
            </div>
          </fieldset>

          <fieldset>
            <legend><span>05</span>{pick({ en: 'Budget', ar: 'الميزانية' })}</legend>
            <div className="bf-budget">
              <label>
                <span>{pick({ en: 'Maximum price (USD)', ar: 'الحد الأقصى (دولار)' })}</span>
                <input
                  inputMode="numeric"
                  type="number"
                  min="0"
                  step="5"
                  placeholder="No limit"
                  value={prefs.maxPrice ?? ''}
                  onChange={(event) => set('maxPrice', event.target.value ? Number(event.target.value) : null)}
                />
              </label>
            </div>
          </fieldset>

          <div className="bf-builder-actions">
            <button className="gw-btn gw-btn--primary" type="submit">{pick({ en: 'Show matches', ar: 'اعرض النتائج' })}</button>
            <button className="gw-btn gw-btn--ghost" type="button" onClick={() => { setPrefs({ position: '', court: '', priority: '', foot: '', maxPrice: null }); setHasRun(false); }}>{pick({ en: 'Reset', ar: 'إعادة ضبط' })}</button>
          </div>
        </form>

        {hasRun ? (
          <section className="bf-results" aria-labelledby="bf-results-title">
            <div className="bf-results-head">
              <div>
                <p className="bf-eyebrow">{pick({ en: 'Matches', ar: 'النتائج' })}</p>
                <h2 id="bf-results-title">{matches.length} {pick({ en: 'in-court shoes', ar: 'أحذية للملعب' })}</h2>
              </div>
              {compare.ids.length > 0 ? <Link to="/compare" className="bf-compare-link">{pick({ en: `Compare (${compare.ids.length})`, ar: `المقارنة (${compare.ids.length})` })}</Link> : null}
            </div>

            {matches.length ? (
              <div className="bf-result-grid">
                {matches.slice(0, 8).map((match, index) => (
                  <article className="bf-result" key={match.product.id}>
                    <div className="bf-rank">{String(index + 1).padStart(2, '0')}</div>
                    <ProductCard product={match.product} />
                    <div className="bf-result-intel">
                      {match.matched.length ? (
                        <p><strong>{pick({ en: 'Verified match:', ar: 'تطابق موثق:' })}</strong> {match.matched.join(' · ')}</p>
                      ) : (
                        <p><strong>{pick({ en: 'Catalogue match', ar: 'تطابق الكتالوج' })}</strong> · {pick({ en: 'No verified performance match available yet.', ar: 'لا توجد مطابقة أداء موثقة بعد.' })}</p>
                      )}
                      {match.unverified.length ? <p className="bf-unverified">{pick({ en: 'Still unverified:', ar: 'ما زال غير موثق:' })} {match.unverified.join(' · ')}</p> : null}
                      <button type="button" onClick={() => compare.toggle(match.product.id)}>{compare.has(match.product.id) ? pick({ en: 'Remove from compare', ar: 'إزالة من المقارنة' }) : pick({ en: 'Add to compare', ar: 'أضف للمقارنة' })}</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="bf-empty">
                <h3>{pick({ en: 'No fully verified performance match yet.', ar: 'لا توجد مطابقة أداء موثقة بالكامل حاليًا.' })}</h3>
                <p>{pick({ en: 'We do not rank shoes with missing performance evidence. Browse all basketball footwear while verified data is completed.', ar: 'لا نرتّب أحذية ببيانات أداء ناقصة. تقدر تتصفح كل أحذية كرة السلة إلى أن تكتمل البيانات الموثقة.' })}</p>
                <Link className="gw-btn gw-btn--primary" to="/shop/footwear">{pick({ en: 'Browse footwear', ar: 'تصفح الأحذية' })}</Link>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </>
  );
}
