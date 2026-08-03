import { lazy, Suspense } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getStaffRole, isStaffUser } from '../services/operations';

const Dashboard = lazy(() => import('./OperationsDashboardPage'));
const Orders = lazy(() => import('../components/operations/sections/OrdersSection'));
const Payments = lazy(() => import('../components/operations/sections/PaymentsSection'));
const B2B = lazy(() => import('../components/operations/sections/B2BSection'));
const Shipping = lazy(() => import('../components/operations/sections/ShippingSection'));
const Catalog = lazy(() => import('../components/operations/sections/CatalogSection'));
const Inventory = lazy(() => import('../components/operations/sections/InventorySection'));
const Media = lazy(() => import('../components/operations/sections/MediaSection'));
const Security = lazy(() => import('../components/operations/sections/SecuritySection'));
const Users = lazy(() => import('../components/operations/sections/UsersSection'));
const Settings = lazy(() => import('../components/operations/sections/SettingsSection'));

const links = [
  'dashboard',
  'orders',
  'payments',
  'b2b',
  'shipping',
  'catalog',
  'inventory',
  'media',
  'security',
  'users',
  'settings',
];
export default function OperationsPage() {
  const auth = useAuth();
  const { pick } = useLanguage();
  if (auth.loading) return null;
  if (!auth.user) return <Navigate to="/account?returnTo=/operations/dashboard" replace />;
  if (!isStaffUser(auth.user)) return <Navigate to="/account" replace />;
  return (
    <div className="operations-shell" data-staff-role={getStaffRole(auth.user)}>
      <nav
        className="operations-module-nav"
        aria-label={pick({ en: 'Operations modules', ar: 'أقسام العمليات' })}
      >
        {links.map((name) => (
          <NavLink key={name} to={`/operations/${name}`}>
            {name === 'b2b' ? 'B2B' : name[0].toUpperCase() + name.slice(1)}
          </NavLink>
        ))}
      </nav>
      <Suspense
        fallback={
          <p role="status">
            {pick({ en: 'Loading operations module…', ar: 'جاري تحميل قسم العمليات…' })}
          </p>
        }
      >
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="payments" element={<Payments />} />
          <Route path="b2b" element={<B2B />} />
          <Route path="shipping" element={<Shipping />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="media" element={<Media />} />
          <Route path="security" element={<Security />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
