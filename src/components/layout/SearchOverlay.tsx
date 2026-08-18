import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactElement, RefObject } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { getSearchSuggestions, POPULAR_SEARCHES, searchSite } from '../../utils/search';
import { trackEvent } from '../../utils/analytics';
import { useCatalog } from '../../context/CatalogContext';
import SmartImage from '../common/SmartImage';
import Price from '../common/Price';
import Icon from '../icons/Icon';
import { lockDocumentScroll } from '../../utils/scrollLock';
import type { LocaleText } from '../../types/i18n';
import '../../styles/design/phase2-search.css';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';

function Highlight({ text, query }: { text: string; query: string }): ReactElement | string {
  const value = String(text || '');
  const q = String(query || '').trim();
  if (!q) return value;
  const index = value.toLocaleLowerCase().indexOf(q.toLocaleLowerCase());
  if (index < 0) return value;
  return <>{value.slice(0, index)}<mark>{value.slice(index, index + q.length)}</mark>{value.slice(index + q.length)}</>;
}

export default function SearchOverlay({
  open,
  onClose,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef?: RefObject<HTMLElement | null> | null;
}): ReactElement | null {
  const { t, pick, lang } = useLanguage();
  const searchCopy = (t.search || {}) as Record<string, string>;
  const { products } = useCatalog();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const historyManaged = useRef(false);
  const closingFromPop = useRef(false);
  const listId = useId();
  const results = useMemo(() => searchSite(query, 8, {}, products), [query, products]);
  const suggestions = useMemo(() => getSearchSuggestions(query, 6, products), [query, products]);

  const closeWithoutHistory = () => {
    closingFromPop.current = true;
    onClose();
  };
  const close = (source = 'cancel') => {
    trackEvent('search_cancel', { source });
    if (historyManaged.current && window.history.state?.shababunaSearchOverlay) {
      closingFromPop.current = true;
      onClose();
      window.history.back();
    } else onClose();
  };

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setActiveIndex(-1);
    const unlock = lockDocumentScroll();
    document.documentElement.classList.add('search-modal-open');
    if (!window.history.state?.shababunaSearchOverlay) {
      window.history.pushState({ ...(window.history.state || {}), shababunaSearchOverlay: true }, '', location.pathname + location.search + location.hash);
      historyManaged.current = true;
    }
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 30);
    const onPopState = () => { if (open) closeWithoutHistory(); };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close('escape');
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = [...(dialogRef.current?.querySelectorAll(FOCUSABLE) || [])].filter((node): node is HTMLElement => {
        const element = node as HTMLElement;
        return !element.hidden && element.getAttribute('aria-hidden') !== 'true';
      });
      const first = nodes[0];
      const last = nodes.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('popstate', onPopState);
    document.addEventListener('keydown', onKeyDown);
    trackEvent('search_open');
    const trigger = triggerRef?.current;
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('keydown', onKeyDown);
      unlock();
      document.documentElement.classList.remove('search-modal-open');
      historyManaged.current = false;
      if (!closingFromPop.current && window.history.state?.shababunaSearchOverlay) {
        window.history.replaceState({ ...window.history.state, shababunaSearchOverlay: undefined }, '', location.pathname + location.search + location.hash);
      }
      closingFromPop.current = false;
      trigger?.focus?.();
    };
    // Overlay lifecycle intentionally depends on `open` only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => setActiveIndex(-1), [query]);
  if (!open) return null;

  const go = (to: string) => {
    const replace = Boolean(historyManaged.current && window.history.state?.shababunaSearchOverlay);
    navigate(to, { replace });
    closeWithoutHistory();
  };
  const activate = (item: { type?: string; to?: string }) => {
    trackEvent('search_suggestion_click', { type: item.type });
    go(String(item.to || '/'));
  };
  const submit = (event?: FormEvent) => {
    event?.preventDefault?.();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      activate(suggestions[activeIndex]);
      return;
    }
    const value = query.trim();
    if (!value) return;
    trackEvent('search_query', { language: lang });
    go(`/search?q=${encodeURIComponent(value)}`);
  };
  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    }
  };

  return (
    <div ref={dialogRef} className="s2-search" role="dialog" aria-modal="true" aria-labelledby={`${listId}-title`}>
      <div className="s2-search__top">
        <span id={`${listId}-title`} className="s2-search__brand">Shababuna</span>
        <button type="button" className="s2-icon-action" onClick={() => close('close')} aria-label={pick({ en: 'Close search', ar: 'إغلاق البحث' })}>
          <Icon name="close" />
        </button>
      </div>

      <form className="s2-search__form" role="search" onSubmit={submit}>
        <Icon name="search" size={30} />
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder={pick({ en: 'Search products, categories, stories…', ar: 'ابحث عن منتجات وفئات وقصص…' })}
          aria-label={searchCopy.placeholder || pick({ en: 'Search Shababuna', ar: 'ابحث في شبابنا' })}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={Boolean(query.trim() && suggestions.length)}
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        />
        {query ? (
          <button type="button" className="s2-search__clear" onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label={pick({ en: 'Clear search', ar: 'مسح البحث' })}>
            {pick({ en: 'Clear', ar: 'مسح' })}
          </button>
        ) : null}
      </form>

      <div className="s2-search__content">
        {!query.trim() ? (
          <div className="s2-search__starter">
            <section>
              <span className="s2-overline">{pick({ en: 'Trending searches', ar: 'عمليات بحث رائجة' })}</span>
              <div className="s2-search__popular">
                {POPULAR_SEARCHES.slice(0, 7).map((item) => (
                  <button key={item.id} type="button" onClick={() => { setQuery(pick(item.query)); inputRef.current?.focus(); }}>
                    {pick(item.query)}
                  </button>
                ))}
              </div>
            </section>
            <section className="s2-search__shortcuts">
              <span className="s2-overline">{pick({ en: 'Explore', ar: 'اكتشف' })}</span>
              <Link to="/discover/new-this-week" onClick={(event) => { event.preventDefault(); go('/discover/new-this-week'); }}>{pick({ en: 'New this week', ar: 'جديد هذا الأسبوع' })}</Link>
              <Link to="/discover/trending-now" onClick={(event) => { event.preventDefault(); go('/discover/trending-now'); }}>{pick({ en: 'Trending now', ar: 'الرائج الآن' })}</Link>
              <Link to="/discover/performance-picks" onClick={(event) => { event.preventDefault(); go('/discover/performance-picks'); }}>{pick({ en: 'Performance picks', ar: 'اختيارات الأداء' })}</Link>
              <Link to="/releases" onClick={(event) => { event.preventDefault(); go('/releases'); }}>{pick({ en: 'Releases', ar: 'الإصدارات' })}</Link>
            </section>
          </div>
        ) : (
          <div className="s2-search__results">
            <section className="s2-search__suggestions">
              <span className="s2-overline">{pick({ en: 'Suggestions', ar: 'اقتراحات' })}</span>
              {suggestions.length ? (
                <ul id={listId} role="listbox">
                  {suggestions.map((item, index) => (
                    <li key={item.id} id={`${listId}-${index}`} role="option" aria-selected={activeIndex === index}>
                      <button type="button" className={activeIndex === index ? 'is-active' : ''} onMouseEnter={() => setActiveIndex(index)} onClick={() => activate(item)}>
                        <span><Highlight text={pick(item.label)} query={query} /></span>
                        <small>{item.type}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p>{pick({ en: 'No suggestions yet.', ar: 'لا توجد اقتراحات بعد.' })}</p>}
            </section>

            <section className="s2-search__products">
              <div className="s2-search__section-head">
                <span className="s2-overline">{pick({ en: 'Products', ar: 'المنتجات' })}</span>
                {results.products.length ? <button type="button" onClick={submit}>{pick({ en: 'View all', ar: 'عرض الكل' })}</button> : null}
              </div>
              {results.products.length ? (
                <div className="s2-search__product-grid">
                  {results.products.slice(0, 6).map((product) => (
                    <Link key={String(product.id)} to={`/products/${String(product.slug || '')}`} onClick={(event) => { event.preventDefault(); go(`/products/${String(product.slug || '')}`); }}>
                      <SmartImage src={String(product.image || '')} alt={String(pick((product.name || '') as LocaleText) || '')} width={520} height={650} />
                      <strong>{pick((product.name || '') as LocaleText)}</strong>
                      {product.quoteOnly ? (
                        <span className="status-pill">{pick({ en: 'Price on request', ar: 'السعر عند الطلب' })}</span>
                      ) : (
                        <Price amount={Number(product.price) || 0} compareAt={product.compareAt == null ? null : Number(product.compareAt)} size="sm" />
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="s2-search__empty">
                  <p>{searchCopy.noResults || pick({ en: 'No results.', ar: 'لا توجد نتائج.' })}</p>
                  <Link to="/special-request" onClick={(event) => { event.preventDefault(); go('/special-request'); }}>{pick({ en: 'Send a product request', ar: 'أرسل طلب منتج' })}</Link>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
