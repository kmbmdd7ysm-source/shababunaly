import { lazy, Suspense } from 'react';
import BuildMarker from './components/dev/BuildMarker';
import Home from './pages/HomePage';
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import GlobalChrome from './components/layout/GlobalChrome';
import DeferredFooter from './components/layout/DeferredFooter';
import CookieBanner from './components/layout/CookieBanner';
import DeferredCartDrawer from './components/layout/DeferredCartDrawer';
import ScrollToTop from './components/layout/ScrollToTop';
import ViewportGuard from './components/layout/ViewportGuard';
import LoadingScreen from './components/common/LoadingScreen';
import CurrencyWelcome from './components/common/CurrencyWelcome';
import { usePageTracking } from './hooks/usePageTracking';
import RouteExperience from './components/experience/RouteExperience';
import PwaPrompt from './components/pwa/PwaPrompt';
import AppErrorBoundary from './components/errors/AppErrorBoundary';
const About = lazy(() => import('./pages/AboutPage'));
const Shop = lazy(() => import('./pages/ShopPage'));
const Product = lazy(() => import('./pages/ProductPage'));
const Cart = lazy(() => import('./pages/CartPage'));
const Checkout = lazy(() => import('./pages/CheckoutPage'));
const CheckoutStatus = lazy(() => import('./pages/CheckoutStatusPage'));
const Customize = lazy(() => import('./pages/CustomizePage'));
const TeamsWholesale = lazy(() => import('./pages/TeamsWholesalePage'));
const LhaStore = lazy(() => import('./pages/LhaStorePage'));
const OurWork = lazy(() => import('./pages/OurWorkPage'));
const Contact = lazy(() => import('./pages/ContactPage'));
const Faq = lazy(() => import('./pages/FaqPage'));
const SizeGuide = lazy(() => import('./pages/SizeGuidePage'));
const Search = lazy(() => import('./pages/SearchPage'));
const OrderTracking = lazy(() => import('./pages/OrderTrackingPage'));
const OrderDetail = lazy(() => import('./pages/OrderDetailPage'));
const Legal = lazy(() => import('./pages/LegalPage'));
const NotFound = lazy(() => import('./pages/NotFoundPage'));
const Compare = lazy(() => import('./pages/ComparePage'));
const Favorites = lazy(() => import('./pages/FavoritesPage'));
const Account = lazy(() => import('./pages/AccountPage'));
const Offline = lazy(() => import('./pages/OfflinePage'));
const Help = lazy(() => import('./pages/HelpPage'));
const Operations = lazy(() => import('./pages/OperationsPage'));
const SpecialRequest = lazy(() => import('./pages/SpecialRequestPage'));
const TeamLocker = lazy(() => import('./pages/TeamLockerPage'));
const DesignShare = lazy(() => import('./pages/DesignSharePage'));
// Isolated design-direction prototype. Additive, noindex, robots-disallowed and
// absent from the pre-render route list. Removing it is one line plus two files.
const LabHome = lazy(() => import('./pages/LabHomePage'));

export default function App() {
  usePageTracking();
  const location = useLocation();
  return (
    <>
      <ViewportGuard />
      <ScrollToTop />
      <GlobalChrome />
      <main id="main-content">
        <AppErrorBoundary resetKey={location.key || location.pathname} scope="route_render">
          <RouteExperience>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/shop/:category" element={<Shop />} />
                <Route path="/shop/:category/:subcategory" element={<Shop />} />
                <Route path="/products/:slug" element={<Product />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/checkout/success" element={<CheckoutStatus status="success" />} />
                <Route path="/checkout/cancelled" element={<CheckoutStatus status="cancelled" />} />
                <Route path="/customize" element={<Customize />} />
                <Route path="/special-request" element={<SpecialRequest />} />
                <Route path="/teams-wholesale" element={<TeamsWholesale />} />
                <Route path="/team-locker/:slug" element={<TeamLocker />} />
                <Route path="/design-share/:token" element={<DesignShare />} />
                <Route path="/lha-store" element={<LhaStore />} />
                <Route path="/our-work" element={<OurWork />} />
                <Route path="/programs/*" element={<Navigate to="/lha-store" replace />} />
                <Route path="/events/*" element={<Navigate to="/lha-store" replace />} />
                <Route path="/online-training/*" element={<Navigate to="/lha-store" replace />} />
                <Route path="/coaches/*" element={<Navigate to="/about" replace />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/faq" element={<Faq />} />
                <Route path="/help" element={<Help />} />
                <Route path="/operations/*" element={<Operations />} />
                <Route path="/size-guide" element={<SizeGuide />} />
                <Route path="/search" element={<Search />} />
                <Route path="/order-tracking" element={<OrderTracking />} />
                <Route path="/order-tracking/:orderNumber" element={<OrderDetail />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/account" element={<Account />} />
                <Route path="/orders" element={<Navigate to="/account?section=orders" replace />} />
                <Route path="/offline" element={<Offline />} />
                <Route path="/lab/home" element={<LabHome />} />
                <Route path="/privacy-policy" element={<Legal docKey="privacy-policy" />} />
                <Route path="/terms" element={<Legal docKey="terms" />} />
                <Route path="/cookies" element={<Legal docKey="cookies" />} />
                <Route path="/shipping-returns" element={<Legal docKey="shipping-returns" />} />
                <Route path="/refund-policy" element={<Legal docKey="refund-policy" />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </RouteExperience>
        </AppErrorBoundary>
      </main>
      <DeferredFooter />
      <DeferredCartDrawer />
      <CookieBanner />
      <PwaPrompt />
      <CurrencyWelcome />
      <BuildMarker />
    </>
  );
}
