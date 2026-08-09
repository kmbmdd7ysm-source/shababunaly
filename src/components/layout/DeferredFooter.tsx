import { lazy, Suspense, useEffect, useRef, useState } from 'react';

const Footer = lazy(() => import('./Footer.tsx'));

export default function DeferredFooter() {
  const anchorRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || ready) return undefined;
    if (!('IntersectionObserver' in globalThis)) {
      setReady(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setReady(true);
        observer.disconnect();
      },
      { rootMargin: '640px 0px', threshold: 0 },
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [ready]);

  return (
    <div ref={anchorRef} className={`deferred-footer${ready ? ' is-ready' : ''}`}>
      {ready && (
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      )}
    </div>
  );
}
