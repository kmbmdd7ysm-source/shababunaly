import { lazy, Suspense, useEffect, useId, useState, type KeyboardEvent } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { resolveProductViewer } from '../../utils/productViewerTier.ts';
import MultiAngleEngine from './engines/MultiAngleEngine';
import Spin360Engine from './engines/Spin360Engine';
import StaticMediaEngine from './engines/StaticMediaEngine';
import '../../styles/product.css';

const Realtime3DEngine = lazy(() => import('./engines/Realtime3DEngine'));

/**
 * Adaptive product media engine.
 *
 * A — verified real-time 3D (.glb/.gltf)
 * B — verified photographic 360 spinset
 * C — verified multi-angle photography
 * D — static / asset-blocked premium still
 *
 * Labels stay honest: no fake 3D, no padded 360 from one frame.
 */
export default function ProductMediaViewer({
  product,
  eager = false,
}: {
  product?: Record<string, unknown> | null;
  eager?: boolean;
}) {
  const { pick, dir } = useLanguage();
  const { tier, images, frames, model } = resolveProductViewer(product);
  const sources = frames.length > 0 ? frames : images;
  const [index, setIndex] = useState(0);
  const listId = useId();

  useEffect(() => {
    setIndex(0);
  }, [product?.id]);

  const count = sources.length;
  const step = (delta: number) => {
    if (count < 2) return;
    setIndex((value) => (value + delta + count) % count);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const back = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forward) {
      event.preventDefault();
      step(1);
    }
    if (event.key === back) {
      event.preventDefault();
      step(-1);
    }
  };

  const accuracyNote =
    tier === 'A'
      ? pick({ en: 'Verified real-time 3D model', ar: 'نموذج ثلاثي الأبعاد موثّق' })
      : tier === 'B'
        ? pick({ en: '360° photographed turntable', ar: 'دوران مصوَّر ٣٦٠°' })
        : tier === 'C'
          ? pick({
              en: 'Multiple photographed angles — not a 360° model',
              ar: 'زوايا مصوَّرة متعددة — ليست نموذجًا ٣٦٠°',
            })
          : pick({ en: 'Single verified photograph', ar: 'صورة موثّقة واحدة' });

  const alt = pick(
    (product?.alt as { en?: string; ar?: string } | undefined) || {
      en: 'Product',
      ar: 'منتج',
    },
  );
  const fallback = sources[0] || String(product?.image || '');

  return (
    <div className="gw-viewer" data-tier={tier} data-engine="ProductMediaViewer">
      {tier === 'A' && (
        <Suspense
          fallback={
            <div className="gw-viewer-stage" role="status">
              {pick({ en: 'Loading 3D…', ar: 'جارٍ تحميل ثلاثي الأبعاد…' })}
            </div>
          }
        >
          <Realtime3DEngine
            model={model}
            fallbackSrc={fallback}
            alt={alt}
            eager={eager}
            pick={pick}
          />
        </Suspense>
      )}
      {tier === 'B' && (
        <Spin360Engine
          frames={frames}
          index={index}
          setIndex={setIndex}
          alt={alt}
          eager={eager}
          pick={pick}
          listId={listId}
          onKeyDown={onKeyDown}
        />
      )}
      {(tier === 'C' || (tier === 'D' && count > 1)) && (
        <MultiAngleEngine
          sources={sources.length ? sources : [fallback].filter(Boolean)}
          index={index}
          setIndex={setIndex}
          alt={alt}
          eager={eager}
          pick={pick}
          listId={listId}
          onKeyDown={onKeyDown}
        />
      )}
      {tier === 'D' && count <= 1 && (
        <div
          className="gw-viewer-stage"
          role="group"
          aria-label={pick({ en: 'Product views', ar: 'عروض المنتج' })}
          aria-describedby={`${listId}-note`}
          tabIndex={-1}
        >
          <StaticMediaEngine
            {...(fallback ? { src: fallback } : {})}
            alt={alt}
            {...(eager ? { eager } : {})}
          />
        </div>
      )}

      <p id={`${listId}-note`} className="gw-spec gw-viewer-note">
        {accuracyNote}
      </p>
    </div>
  );
}
