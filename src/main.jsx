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
import App from './App';
import { installGlobalErrorMonitoring } from './services/telemetry';
import ProductionReadinessGate from './components/security/ProductionReadinessGate';
import './styles/global.css';
import './styles/premium.css';
import './styles/account-sync.css';
import './styles/shababuna.css';
// GROUNDWORK foundation. Loaded after the existing cascade so that where
// specificity ties the new system wins, and namespaced (`--sh-*` tokens,
// `.lab-scope` rules, `Shababuna *` font families) so that nothing it declares
// can reach a selector the current site actually uses.
import './styles/tokens.css';
import './styles/typography.css';
import './styles/motion.css';
import './styles/geometry.css';
import './styles/layout.css';

installGlobalErrorMonitoring();

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
    import('./utils/registerPwa')
      .then((pwa) => pwa.registerPwa())
      .catch(() => {});
  };

  // Service-worker installation downloads the offline shell. Keep it out of the
  // mobile critical path, then start it on real use or after the page has been
  // comfortably interactive.
  window.addEventListener('pointerdown', startBackgroundTasks, { once: true, passive: true });
  window.addEventListener('keydown', startBackgroundTasks, { once: true });
  backgroundTimer = window.setTimeout(startBackgroundTasks, 20000);
}
