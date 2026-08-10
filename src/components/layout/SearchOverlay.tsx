import type {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
  RefObject,
} from 'react';
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

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';

function Highlight({ text, query }: { text: string; query: string }): ReactElement | string {
  const value = String(text || '');
  const q = String(query || '').trim();
  if (!q) return value;
  const index = value.toLocaleLowerCase().indexOf(q.toLocaleLowerCase());
  if (index < 0) return value;
  return (
    <>
      {value.slice(0, index)}
      <mark>{value.slice(index, index + q.length)}</mark>
      {value.slice(index + q.length)}
    </>
  );
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
  const results = useMemo(() => searchSite(query, 6, {}, products), [query, products]);
  const suggestions = useMemo(() => getSearchSuggestions(query, 7, products), [query, products]);

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
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setActiveIndex(-1);
    const unlock = lockDocumentScroll();
    document.documentElement.classList.add('search-modal-open');
    if (!window.history.state?.shababunaSearchOverlay) {
      window.history.pushState(
        { ...(window.history.state || {}), shababunaSearchOverlay: true },
        '',
        location.pathname + location.search + location.hash,
      );
      historyManaged.current = true;
    }
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 20);
    const onPopState = () => {
      if (open) closeWithoutHistory();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close('escape');
        return;
      }
      if (event.key === 'Tab') {
        const nodes = [...(dialogRef.current?.querySelectorAll(FOCUSABLE) || [])].filter(
          (node): node is HTMLElement => {
            const el = node as HTMLElement;
            return !el.hidden && el.getAttribute('aria-hidden') !== 'true';
          },
        );
        if (!nodes.length) return;
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
      if (!closingFromPop.current && window.history.state?.shababunaSearchOverlay)
        window.history.replaceState(
          { ...window.history.state, shababunaSearchOverlay: undefined },
          '',
          location.pathname + location.search + location.hash,
        );
      closingFromPop.current = false;
      trigger?.focus?.();
    };
    // open is the intentional trigger; close helpers are stable enough for overlay lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- overlay mount/unmount keyed on `open`
  }, [open]);

  useEffect(() => setActiveIndex(-1), [query]);
  if (!open) return null;

  const activate = (item: { type?: string; to?: string }) => {
    trackEvent('search_suggestion_click', { type: item.type });
    navigate(String(item.to || '/'));
    closeWithoutHistory();
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
    navigate(`/search?q=${encodeURIComponent(value)}`);
    closeWithoutHistory();
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
  const resultLabel = pick({ en: `${results.total} results`, ar: `${results.total} نتيجة` });

  return (
    <div
      ref={dialogRef}
      className="search-overlay open"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${listId}-title`}
    >
      <div className="search-overlay-inner">
        <h1 id={`${listId}-title`} className="sr-only">
          {pick({ en: 'Search Shababuna', ar: 'البحث في شبابنا' })}
        </h1>
        <form
          className="search-mobile-head"
          role="search"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          <div className="search-input-wrap">
            <Icon name="search" />
            <input
              ref={inputRef}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder={searchCopy.placeholder}
              aria-label={searchCopy.placeholder}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={Boolean(query.trim() && suggestions.length)}
              aria-controls={listId}
              aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
            />
            {query && (
              <button
                type="button"
                className="search-clear"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                aria-label={pick({ en: 'Clear search', ar: 'مسح البحث' })}
              >
                <Icon name="close" size={20} />
              </button>
            )}
          </div>
          <button type="button" className="search-cancel" onClick={() => close('cancel')}>
            {pick({ en: 'Cancel', ar: 'إلغاء' })}
          </button>
        </form>
        <p className="sr-only" role="status" aria-live="polite">
          {query.trim() ? resultLabel : ''}
        </p>
        <div className="search-screen-content">
          {!query.trim() ? (
            <section aria-labelledby={`${listId}-popular`}>
              <h2 id={`${listId}-popular`}>
                {pick({ en: 'Popular Search Terms', ar: 'مصطلحات البحث الشائعة' })}
              </h2>
              <div className="search-chip-grid">
                {POPULAR_SEARCHES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setQuery(pick(item.query));
                      inputRef.current?.focus();
                      trackEvent('search_suggestion_click', { type: 'popular' });
                    }}
                  >
                    {pick(item.query)}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <>
              <section className="search-suggestions" aria-labelledby={`${listId}-suggestions`}>
                <h2 id={`${listId}-suggestions`}>
                  {pick({ en: 'Top Suggestions', ar: 'أفضل الاقتراحات' })}
                </h2>
                {suggestions.length > 0 && (
                  <ul
                    id={listId}
                    role="listbox"
                    aria-label={pick({ en: 'Search suggestions', ar: 'اقتراحات البحث' })}
                  >
                    {suggestions.map((item, index) => (
                      <li
                        key={item.id}
                        id={`${listId}-${index}`}
                        role="option"
                        aria-selected={activeIndex === index}
                      >
                        <button
                          type="button"
                          className={activeIndex === index ? 'active' : ''}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => activate(item)}
                        >
                          <span>
                            <Highlight text={pick(item.label)} query={query} />
                          </span>
                          <small>
                            {pick({
                              en:
                                {
                                  product: 'Product',
                                  category: 'Category',
                                  page: 'Page',
                                }[item.type] || 'Result',
                              ar:
                                {
                                  product: 'منتج',
                                  category: 'فئة',
                                  page: 'صفحة',
                                }[item.type] || 'نتيجة',
                            })}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              {results.products.length > 0 && (
                <section className="search-products" aria-labelledby={`${listId}-products`}>
                  <div className="search-section-title">
                    <h2 id={`${listId}-products`}>{searchCopy.products}</h2>
                    <button type="button" onClick={submit}>
                      {searchCopy.viewAllResults}
                    </button>
                  </div>
                  <div className="search-product-grid">
                    {results.products.slice(0, 4).map((product) => (
                      <Link
                        key={String(product.id)}
                        to={`/products/${String(product.slug || '')}`}
                        onClick={() => {
                          trackEvent('search_result_click', { type: 'product' });
                          closeWithoutHistory();
                        }}
                      >
                        <SmartImage
                          src={String(product.image || '')}
                          alt={String(pick((product.name || "") as LocaleText) || '')}
                          width={320}
                          height={320}
                        />
                        <strong>
                          <Highlight
                            text={String(pick((product.name || "") as LocaleText) || '')}
                            query={query}
                          />
                        </strong>
                        <Price
                          amount={Number(product.price) || 0}
                          compareAt={product.compareAt == null ? null : Number(product.compareAt)}
                          size="sm"
                        />
                      </Link>
                    ))}
                  </div>
                </section>
              )}
              {results.total === 0 && (
                <div className="notice notice--muted">
                  <p>{searchCopy.noResults}</p>
                  <p>{searchCopy.noResultsHint}</p>
                </div>
              )}
              {results.total > 0 && (
                <button
                  type="button"
                  className="btn-secondary block search-view-all"
                  onClick={submit}
                >
                  {searchCopy.viewAllResults}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
