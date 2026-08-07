import StaticMediaEngine from './StaticMediaEngine';

const VIEW_LABELS = [
  { en: 'Front', ar: 'أمام' },
  { en: 'Back', ar: 'خلف' },
  { en: 'Side', ar: 'جانب' },
  { en: 'Detail', ar: 'تفصيل' },
  { en: 'Alternate', ar: 'إضافي' },
  { en: 'Extra', ar: 'إضافي ٢' },
];

export default function MultiAngleEngine({
  sources,
  index,
  setIndex,
  alt,
  eager,
  pick,
  listId,
  onKeyDown,
}) {
  const count = sources.length;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const current = sources[safeIndex];

  return (
    <>
      <div
        className="gw-viewer-stage"
        role="group"
        aria-label={pick({ en: 'Product views', ar: 'عروض المنتج' })}
        aria-describedby={`${listId}-note`}
        tabIndex={count > 1 ? 0 : -1}
        onKeyDown={onKeyDown}
      >
        <StaticMediaEngine src={current} alt={alt} eager={eager} />
      </div>
      {count > 1 && (
        <div
          className="gw-viewer-controls"
          role="tablist"
          aria-label={pick({ en: 'Choose a view', ar: 'اختر العرض' })}
        >
          {sources.map((src, position) => (
            <button
              key={src}
              type="button"
              role="tab"
              aria-selected={position === safeIndex}
              className={`gw-viewer-tab${position === safeIndex ? ' is-active' : ''}`}
              onClick={() => setIndex(position)}
            >
              {pick(VIEW_LABELS[position] || { en: `View ${position + 1}`, ar: `عرض ${position + 1}` })}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
