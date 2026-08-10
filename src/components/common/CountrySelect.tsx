import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { getCountryName, getLocalizedCountries, normalizeCountryCode } from '../../data/countries';
import { useLanguage } from '../../context/LanguageContext';
import Icon from '../icons/Icon';

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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);

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

  useEffect(() => {
    if (!open) return;
    const selectedIndex = filtered.findIndex((country) => country.code === selectedCode);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    inputRef.current?.focus();
  }, [open, selectedCode, filtered]);

  const close = (restoreFocus = true) => {
    setOpen(false);
    setQuery('');
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node) || !rootRef.current?.contains(event.target)) close(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    optionRefs.current[activeIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex]);

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

  return (
    <div className="country-combobox" ref={rootRef}>
      <input type="hidden" name={name} value={selectedCode} required={required} />
      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        className="country-combobox__trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.name || selectedCode}</span>
        <span className="country-combobox__code" aria-hidden="true">
          {selectedCode}
        </span>
        <Icon name="chevron" size={18} />
      </button>

      {open && (
        <div
          className="country-combobox__popover"
          role="dialog"
          aria-label={pick({ en: 'Select country', ar: 'اختر الدولة' })}
        >
          <label className="country-combobox__search" htmlFor={searchId}>
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
              placeholder={pick({
                en: 'Search by country or code',
                ar: 'ابحث باسم الدولة أو الرمز',
              })}
              autoComplete="off"
            />
          </label>
          <p className="sr-only" aria-live="polite">
            {filtered.length
              ? pick({
                  en: `${filtered.length} countries found`,
                  ar: `تم العثور على ${filtered.length} دولة`,
                })
              : pick({ en: 'No countries found', ar: 'لم يتم العثور على دول' })}
          </p>
          <ul id={listboxId} role="listbox" className="country-combobox__list">
            {filtered.map((country, index) => (
              <li
                key={country.code}
                id={`${controlId}-option-${country.code}`}
                ref={(node: HTMLLIElement | null) => {
                  optionRefs.current[index] = node;
                }}
                role="option"
                aria-selected={country.code === selectedCode}
                tabIndex={-1}
                className={index === activeIndex ? 'is-active' : undefined}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(country)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') choose(country);
                }}
              >
                <span>{country.name}</span>
                <span dir="ltr">{country.code}</span>
              </li>
            ))}
          </ul>
          {!filtered.length && (
            <div className="country-combobox__empty">
              {pick({ en: 'No matching countries', ar: 'لا توجد دول مطابقة' })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
