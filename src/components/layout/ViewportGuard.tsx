import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Keeps the document viewport anchored to the physical screen edge.
 */
export default function ViewportGuard() {
  const location = useLocation();
  const { lang } = useLanguage();

  useEffect(() => {
    const resetDocumentX = () => {
      const rootX = document.documentElement.scrollLeft;
      const bodyX = document.body.scrollLeft;
      if (window.scrollX === 0 && rootX === 0 && bodyX === 0) return false;
      document.documentElement.scrollLeft = 0;
      document.body.scrollLeft = 0;
      if (window.scrollX !== 0) window.scrollTo({ left: 0, top: window.scrollY, behavior: 'auto' });
      return true;
    };

    const corrected = resetDocumentX();
    const frame = corrected ? requestAnimationFrame(resetDocumentX) : 0;
    const visualViewport = window.visualViewport;
    window.addEventListener('resize', resetDocumentX, { passive: true });
    window.addEventListener('orientationchange', resetDocumentX, { passive: true });
    visualViewport?.addEventListener('resize', resetDocumentX, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', resetDocumentX);
      window.removeEventListener('orientationchange', resetDocumentX);
      visualViewport?.removeEventListener('resize', resetDocumentX);
    };
  }, [location.pathname, location.search, lang]);

  return null;
}
