import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';
import { getCountryName, getLocalizedCountries, normalizeCountryCode } from '../../data/countries';
import { useLanguage } from '../../context/LanguageContext';
import Icon from '../icons/Icon';
import '../../styles/country-picker.css';

function normalizeSearch(value: unknown): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLocaleLowerCase()
    .trim();
}

function flagEmoji(code: string): string {
  const safe = String(code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(safe)) return '◉';
  return String.fromCodePoint(...[...safe].map((char) => 127397 + char.charCodeAt(0)));
}

type CountryOption = {
  code: string;
  name: string;
  postalCodeRequired?: boolean;
  regionRequired?: boolean;
  cashEligible?: boolean;
  shippingAvailable?: boolean;
};

export default function CountrySelect({
  value,
  onChange,
  id = '',
  name = 'country',
  required = false,
  disabled = false,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: {
  value?: string;
  onChange: (code: string) => void;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
}): ReactElement {
  const { lang, pick } = useLanguage();
  const generatedId = useId();
  const controlId = id || `country-${generatedId}`;
  const searchId = `${controlId}-search`;
  const listboxId = `${controlId}-listbox`;
  const options = useMemo(() => getLocalizedCountries(lang), [lang]);
  const selectedCode = normalizeCountryCode(value);
  const selected = options.find((country) => country.code === selectedCode) || options[0];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const term = normalizeSearch(query);
    if (!term) return options;
    return options
      .map((country) => {
        const candidates = [
          country.name,
          getCountryName(country.code, 'en'),
          getCountryName(country.code, 'ar'),
          country.code,
        ].map(normalizeSearch);
        const exactCode = normalizeSearch(country.code) === term;
        const startsWith = candidates.some((candidate) => candidate.startsWith(term));
        const includes = candidates.some((candidate) => candidate.includes(term));
        return { country, rank: exactCode ? 0 : startsWith ? 1 : includes ? 2 : 3 };
      })
      .filter(({ rank }) => rank < 3)
      .sort((a, b) => a.rank - b.rank)
      .map(({ country }) => country);
  }, [options, query]);

  const close = (restoreFocus = true) => {
    setOpen(false);
    setQuery('');
    if (restoreFocus) globalThis.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (!open) return;
    const selectedIndex = filtered.findIndex((country) => country.code === selectedCode);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    const timer = globalThis.setTimeout(() => inputRef.current?.focus(), 40);
    return () => globalThis.clearTimeout(timer);
  }, [open, selectedCode]);

  useEffect(() => {
    if (!open) return undefined;
    document.documentElement.classList.add('country-picker-open');
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.documentElement.classList.remove('country-picker-open');
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !filtered[activeIndex]) return;
    const option = document.getElementById(`${controlId}-option-${filtered[activeIndex].code}`);
    option?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, controlId, filtered, open]);

  const choose = (country: CountryOption) => {
    onChange(country.code);
    close();
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!filtered.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % filtered.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + filtered.length) % filtered.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(filtered.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const exactCode = filtered.find(
        (country) => country.code.toLowerCase() === normalizeSearch(query),
      );
      const next = exactCode || filtered[activeIndex] || filtered[0];
      if (next) choose(next);
    }
  };

  const picker = open && typeof document !== 'undefined'
    ? createPortal(
        <div
          className="country-picker-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) close();
          }}
        >
          <section
            className="country-combobox__popover country-picker-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${controlId}-title`}
          >
            <header className="country-picker-head">
              <div>
                <span>{pick({ en: 'Shipping & location', ar: 'الشحن والموقع' })}</span>
                <strong id={`${controlId}-title`}>{pick({ en: 'Select country', ar: 'اختر الدولة' })}</strong>
              </div>
              <button type="button" className="country-picker-close" onClick={() => close()} aria-label={pick({ en: 'Close country picker', ar: 'إغلاق اختيار الدولة' })}>
                <Icon name="close" size={20} />
              </button>
            </header>

            <label className="country-combobox__search country-picker-search" htmlFor={searchId}>
              <Icon name="search" size={19} />
              <span className="sr-only">{pick({ en: 'Search countries', ar: 'ابحث عن دولة' })}</span>
              <input
                ref={inputRef}
                id={searchId}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded="true"
                aria-controls={listboxId}
                aria-activedescendant={
                  filtered[activeIndex]
                    ? `${controlId}-option-${filtered[activeIndex].code}`
                    : undefined
                }
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onSearchKeyDown}
                placeholder={pick({ en: 'Search country or code', ar: 'ابحث باسم الدولة أو الرمز' })}
                autoComplete="off"
                enterKeyHint="search"
              />
            </label>

            <div className="country-picker-current" aria-hidden="true">
              <span className="country-picker-flag">{flagEmoji(selected?.code || selectedCode)}</span>
              <div><small>{pick({ en: 'Current', ar: 'الحالية' })}</small><strong>{selected?.name || selectedCode}</strong></div>
              <b dir="ltr">{selectedCode}</b>
            </div>

            <p className="sr-only" aria-live="polite">
              {filtered.length
                ? pick({ en: `${filtered.length} countries found`, ar: `تم العثور على ${filtered.length} دولة` })
                : pick({ en: 'No countries found', ar: 'لم يتم العثور على دول' })}
            </p>

            <ul id={listboxId} role="listbox" className="country-combobox__list country-picker-list">
              {filtered.map((country, index) => {
                const chosen = country.code === selectedCode;
                return (
                  <li
                    key={country.code}
                    id={`${controlId}-option-${country.code}`}
                    role="option"
                    aria-selected={chosen}
                    tabIndex={-1}
                    className={`${index === activeIndex ? 'is-active' : ''}${chosen ? ' is-selected' : ''}`.trim()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(country)}
                  >
                    <span className="country-picker-flag" aria-hidden="true">{flagEmoji(country.code)}</span>
                    <span className="country-picker-name">{country.name}</span>
                    <span className="country-picker-code" dir="ltr">{country.code}</span>
                    {chosen ? <Icon name="check" size={18} /> : null}
                  </li>
                );
              })}
            </ul>
            {!filtered.length ? <div className="country-combobox__empty">{pick({ en: 'No matching countries', ar: 'لا توجد دول مطابقة' })}</div> : null}
          </section>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="country-combobox">
      <input type="hidden" name={name} value={selectedCode} required={required} />
      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        className="country-combobox__trigger country-picker-trigger"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        onClick={() => setOpen(true)}
      >
        <span className="country-picker-trigger__flag" aria-hidden="true">{flagEmoji(selected?.code || selectedCode)}</span>
        <span className="country-picker-trigger__name">{selected?.name || selectedCode}</span>
        <span className="country-combobox__code" aria-hidden="true">{selectedCode}</span>
        <Icon name="chevron" size={18} />
      </button>
      {picker}
    </div>
  );
}
