import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { OPTIMIZED_IMAGES } from '../../data/generatedOptimizedImages.js';

const MEDIA_VERSION = '20260729-performance-final';

function ratioClass(width: number, height: number): string {
  const ratio = Number(width) / Math.max(1, Number(height));
  if (ratio >= 1.7) return 'ratio-16-9';
  if (ratio >= 1.4) return 'ratio-3-2';
  if (ratio <= 0.85) return 'ratio-4-5';
  return 'ratio-1-1';
}

const withVersion = (src: string): string => {
  if (!src || /^(data:|blob:|https?:)/i.test(src)) return src;
  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}v=${MEDIA_VERSION}`;
};

const optimizedPath = (src: string): string => {
  if (!src || /^(data:|blob:|https?:)/i.test(src)) return src;
  const [path, query = ''] = src.split('?');
  const optimized = (OPTIMIZED_IMAGES as Record<string, string>)[path || ''];
  if (!optimized) return src;
  return query ? `${optimized}?${query}` : optimized;
};

export default function SmartImage({
  src,
  alt,
  width = 1200,
  height = 800,
  eager = false,
  className = '',
  sizes = '100vw',
}: {
  src?: string | null;
  alt?: string;
  width?: number;
  height?: number;
  eager?: boolean;
  className?: string;
  sizes?: string;
}): ReactElement {
  const { pick } = useLanguage();
  const candidates = useMemo(() => {
    const source = String(src || '');
    const optimized = optimizedPath(source);
    return optimized && optimized !== source ? [optimized, source] : [source];
  }, [src]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setFailed(false);
  }, [src]);

  const current = candidates[candidateIndex];
  const unavailable = failed || !current;

  if (unavailable) {
    return (
      <span
        className={`smart-img smart-img--fallback ${ratioClass(width, height)} ${className}`.trim()}
        role="img"
        aria-label={alt || pick({ en: 'Image unavailable', ar: 'الصورة غير متوفرة' })}
      >
        <span className="smart-img-fallback-mark" aria-hidden="true">
          SHABABUNA
        </span>
        <span className="smart-img-fallback-copy">
          {pick({ en: 'Media coming soon', ar: 'الصورة قريبًا' })}
        </span>
      </span>
    );
  }

  return (
    <img
      key={`${current}-${candidateIndex}`}
      src={withVersion(current)}
      alt={alt || ''}
      width={width}
      height={height}
      sizes={sizes}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
      draggable={false}
      onError={() => {
        if (candidateIndex < candidates.length - 1) setCandidateIndex((value) => value + 1);
        else setFailed(true);
      }}
      className={`smart-img ${className}`.trim()}
    />
  );
}
