import { lazy, Suspense } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getStaffRole, isStaffUser } from '../services/operations';
import '../styles/command.css';

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
  const role = getStaffRole(auth.user);

  return (
    <div className="gw-command" data-staff-role={role}>
      {/* A COMMAND CENTRE, not a page with a nav strip. A fixed module rail
          carrying a numbered index and the operator's own role, beside a frame
          that renders exactly one module. Each module already loads from its
          own lazy chunk and its own route, so nothing else is fetched. */}
      <div className="gw-command-rail">
        <p className="gw-spec gw-command-brand">{pick({ en: 'Operations', ar: 'العمليات' })}</p>
        <p
          className="gw-command-role"
          title={pick({ en: 'Signed-in staff role', ar: 'دور الموظف' })}
        >
          <span className="gw-command-role-dot" aria-hidden="true" />
          {role}
        </p>
        <nav
          className="gw-command-modules"
          aria-label={pick({ en: 'Operations modules', ar: 'أقسام العمليات' })}
        >
          {links.map((name, position) => (
            <NavLink key={name} to={`/operations/${name}`} className="gw-command-module">
              <span className="gw-command-module-index" aria-hidden="true">
                {String(position + 1).padStart(2, '0')}
              </span>
              <span>{name === 'b2b' ? 'B2B' : name[0].toUpperCase() + name.slice(1)}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="gw-command-frame">
        <Suspense
          fallback={
            <p className="gw-command-loading" role="status">
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
    </div>
  );
}
