import { useLanguage } from '../../context/LanguageContext';
import { resolveProductViewer } from '../../utils/productViewerTier.ts';

/*
 * States, in the interface, what a product's imagery actually is.
 */

export default function ViewingTierNote({ product }: { product?: Record<string, unknown> | null }) {
  const { pick } = useLanguage();
  const { tier, images, frames, placeholder } = resolveProductViewer(product);

  const note = (() => {
    if (tier === 'A') return { en: 'Interactive 3D model', ar: 'نموذج ثلاثي الأبعاد تفاعلي' };
    if (tier === 'B') {
      return {
        en: `360° photographed turntable · ${frames.length} frames`,
        ar: `دوران مصوَّر ٣٦٠° · ${frames.length} إطارًا`,
      };
    }
    if (tier === 'C') {
      return {
        en: `${images.length} photographed angles — not a 360° model`,
        ar: `${images.length} زوايا مصوَّرة — ليست نموذجًا ٣٦٠°`,
      };
    }
    if (placeholder) {
      return {
        en: 'Illustration — product photography pending',
        ar: 'رسم توضيحي — تصوير المنتج قيد الإعداد',
      };
    }
    return { en: 'One verified photograph', ar: 'صورة موثّقة واحدة' };
  })();

  return (
    <p className="gw-tier-note" data-tier={tier}>
      <span className="gw-tier-mark" aria-hidden="true" />
      {pick(note)}
    </p>
  );
}
