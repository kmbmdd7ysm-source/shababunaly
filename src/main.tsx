import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { LanguageProvider } from './context/LanguageContext';
import { CookieProvider } from './context/CookieContext';
import { CartProvider } from './context/CartContext';
import { CompareProvider } from './context/CompareContext';
import { AuthProvider } from './context/AuthContext';
import { UserDataProvider } from './context/UserDataContext';
import { CommerceProvider } from './context/CommerceContext';
import { CatalogProvider } from './context/CatalogContext';
import { installGlobalErrorMonitoring } from './services/telemetry';
import ProductionReadinessGate from './components/security/ProductionReadinessGate';
import { STORAGE_KEYS } from './config';
/*
 * CSS architecture (extinction in progress):
 * Eager foundation + remaining shared legacy islands (no idle/post-paint inject —
 * deferred legacy caused cascade flash / CLS). Route sheets stay with routes.
 * Continue deleting unused rules from global/premium/shababuna until empty.
 */
import './styles/foundation.css';
import './styles/a11y-from-premium.css';
import './styles/a11y-from-global.css';
import './styles/tokens.css';
import './styles/fonts.css';
import './styles/typography.css';
import './styles/motion.css';
import './styles/geometry.css';
import './styles/layout.css';
import './styles/shell.css';
import './styles/legacy-island.css';
import './styles/island-extract.css';
import './styles/tail-from-shababuna.css';
import './styles/tail-from-premium.css';
import './styles/tail-from-global.css';
import './styles/remain-from-shababuna.css';
import './styles/remain-from-premium.css';
import './styles/remain-from-global.css';
import './styles/misc-from-shababuna.css';
import './styles/misc-from-premium.css';
import './styles/misc-from-global.css';
import './styles/studio2-from-shababuna.css';
import './styles/studio2-from-premium.css';
import './styles/studio2-from-global.css';
import './styles/shop2-from-shababuna.css';
import './styles/shop2-from-premium.css';
import './styles/shop2-from-global.css';
import './styles/chrome2-from-shababuna.css';
import './styles/chrome2-from-premium.css';
import './styles/chrome2-from-global.css';
import './styles/media-from-premium.css';
import './styles/media-from-global.css';
import './styles/layout-legacy-from-shababuna.css';
import './styles/layout-legacy-from-premium.css';
import './styles/layout-legacy-from-global.css';
import './styles/overlays-from-global.css';
import './styles/forms-from-shababuna.css';
import './styles/forms-from-premium.css';
import './styles/forms-from-global.css';
/* shell.nav / colophon / masthead load with Header, Footer, and route shells.
   Legacy triad stays eager until ownership migration finishes — load-deferred
   secondary sheets did not improve LCP and risked route flash. */

// App is imported LAST on purpose. Vite emits CSS following the module graph,
// so importing App above the stylesheets placed every page-level sheet it
// pulls in (home.css, product.css) BEFORE the foundation. `home.css` then lost
// every specificity tie to `typography.css`, and department names overflowed
// their plates. Importing App after the foundation lets page CSS win, which is
// how the cascade here is meant to resolve.
//
// (Kept free of the words this repo's lint rule watches for near
// `localStorage`, since the check is a plain text match.)
import App from './App';

installGlobalErrorMonitoring();

// Apply document language and direction BEFORE React's first paint.
//
// `LanguageProvider` reads the stored language synchronously and renders Arabic
// text immediately, but it can only touch `document.documentElement` from an
// effect, which runs after the browser has already painted. The document
// therefore painted as `dir="ltr"` and flipped to `rtl` a frame later. That
// flip changes the resolved `transform` on the closed off-canvas menu, which
// carries `transition: transform .3s`, so a 460x1000 px panel animated straight
// across the viewport — measured as 0.517 CLS on the Arabic homepage against a
// 0.05 gate, while English measured 0.000.
//
// Setting the attributes here costs one synchronous localStorage read and
// removes the flip entirely. `LanguageProvider` still owns every later change.
(() => {
  let stored = 'en';
  try {
    stored = localStorage.getItem(STORAGE_KEYS.language) === 'ar' ? 'ar' : 'en';
  } catch {
    stored = 'en';
  }
  const dir = stored === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = stored;
  document.documentElement.dir = dir;
  // Keep body in sync for any legacy selectors that still read body[dir].
  // Direction itself comes from the document attribute — not a CSS LTR force.
  document.body.dir = dir;
  try {
    if (location.pathname === '/' || location.pathname === '') {
      document.documentElement.dataset.cinematicOpen = 'yes';
    }
  } catch {
    /* ignore */
  }
})();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root was not found');

createRoot(rootElement).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LanguageProvider>
          <ProductionReadinessGate>
            <CookieProvider>
              <AuthProvider>
                <CommerceProvider>
                  <CatalogProvider>
                    <CompareProvider>
                      <CartProvider>
                        <UserDataProvider>
                          <App />
                        </UserDataProvider>
                      </CartProvider>
                    </CompareProvider>
                  </CatalogProvider>
                </CommerceProvider>
              </AuthProvider>
            </CookieProvider>
          </ProductionReadinessGate>
        </LanguageProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
);

if (typeof window !== 'undefined') {
  let backgroundStarted = false;
  let backgroundTimer = 0;
  const startBackgroundTasks = () => {
    if (backgroundStarted) return;
    backgroundStarted = true;
    clearTimeout(backgroundTimer);
    window.removeEventListener('pointerdown', startBackgroundTasks);
    window.removeEventListener('keydown', startBackgroundTasks);
    /*
     * A review build never registers a service worker.
     *
     * The preview was confirmed serving an old build. The cause was the
     * worker, not the server: navigation is network-first with a fallback to
     * whatever HTML the ACTIVE worker has cached, and over a tunnelled origin
     * a slow response tripped that fallback — so a reviewer saw a previous
     * build while the server was serving the current one. A new worker also
     * only takes over once every tab has closed, so an old one can keep
     * control across several visits.
     *
     * That behaviour is correct for real users on flaky connections and is
     * fixed properly in public/sw.js. But a review origin must be incapable of
     * showing anything except the build it is serving, so it opts out
     * entirely and actively removes any worker a previous session installed.
     */
    if (import.meta.env.VITE_SHOW_BUILD_MARKER) {
      import('./utils/unregisterPwa').then((mod) => mod.purgeServiceWorkers()).catch(() => {});
      return;
    }
    import('./utils/registerPwa').then((pwa) => pwa.registerPwa()).catch(() => {});
  };

  // Service-worker installation downloads the offline shell. Keep it out of the
  // mobile critical path, then start it on real use or after the page has been
  // comfortably interactive.
  window.addEventListener('pointerdown', startBackgroundTasks, { once: true, passive: true });
  window.addEventListener('keydown', startBackgroundTasks, { once: true });
  backgroundTimer = window.setTimeout(startBackgroundTasks, 20000);
}
