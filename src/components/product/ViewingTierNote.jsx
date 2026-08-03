import { useLanguage } from '../../context/LanguageContext';
import { resolveProductViewer } from '../../utils/productViewerTier';

/*
 * States, in the interface, what a product's imagery actually is.
 *
 * This is the visible half of the product-viewing tier system. A customer
 * deciding whether to buy a 400 LYD uniform deserves to know whether they are
 * looking at a measured 360 capture or a single photograph, and the site is
 * never allowed to imply more than the assets support.
 *
 *   A  real-time 3D          "Interactive 3D model"
 *   B  true photographic 360 "360 photographed turntable"
 *   C  multi-angle           "N photographed angles - not a 360 model"
 *   D  asset-blocked         "One photograph" / "Illustration, photography pending"
 *
 * Rendered in the DOM as text, so it survives with images, scripting and
 * motion all switched off.
 */

/**
 * @param {{ product: any }} props
 */
export default function ViewingTierNote({ product }) {
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
    // Level D splits: a real photograph is not the same as placeholder artwork,
    // and saying so is the difference between restraint and misrepresentation.
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
