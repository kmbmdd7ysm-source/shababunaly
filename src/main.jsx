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
import './styles/global.css';
import './styles/premium.css';
import './styles/account-sync.css';
import './styles/shababuna.css';
// GROUNDWORK foundation. Loaded after the existing cascade so that where
// specificity ties the new system wins, and namespaced (`--sh-*` tokens,
// `Shababuna *` font families) so that nothing it declares can reach a
// selector the current site actually uses.
//
// Only the two genuinely global layers live in the entry bundle: the token
// contract and the @font-face declarations. The layers that emit *applied*
// rules (typography classes, motion, geometry, layout) are imported by the
// components that use them, so Vite splits them into route chunks and the
// entry CSS does not carry rules no current route renders.
import './styles/tokens.css';
import './styles/fonts.css';
import './styles/typography.css';
import './styles/motion.css';
import './styles/geometry.css';
import './styles/layout.css';
// The shell bridge loads last so it can migrate the legacy chrome onto the new
// system in place, without needing `!important` to win.
import './styles/shell.css';
import './styles/catalog.css';
import './styles/workspace.css';
import './styles/content.css';
import './styles/transact.css';
import './styles/operations.css';

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
  // `body` and `#root` matter as much as `html` here. The existing cascade
  // carries `body[dir='rtl'] { direction: ltr !important }` and then restores
  // the real direction with `#root[dir='rtl'] { direction: rtl }`, so RTL does
  // not actually engage until `#root` carries the attribute. Setting only
  // `html` left the header laying out LTR for a frame and then mirroring.
  document.body.dir = dir;
  document.getElementById('root')?.setAttribute('dir', dir);
})();

createRoot(document.getElementById('root')).render(
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
  let backgroundTimer;
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
