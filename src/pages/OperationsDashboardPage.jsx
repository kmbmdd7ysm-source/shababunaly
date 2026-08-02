import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Seo from '../components/common/Seo';
import PageHero from '../components/common/PageHero';
import OperationsControlCenter from '../components/operations/OperationsControlCenter';
import BusinessIntelligencePanel from '../components/operations/BusinessIntelligencePanel';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { getStaffRole, invalidateOperationsCache, isStaffUser, loadAdminUsers, loadOperationsDashboard, setExchangeRate } from '../services/operations';

import {
  MasterDataManager, StockMovementManager, ShippingRatesManager, HeroContentManager,
} from '../components/operations/OperationsMasterData';
import {
  StaffAccessManager, Stat, SpecialRequestOperationsCard, ShippingQuoteRow, OrderOperationsCard,
  QuoteCard, ReturnOperationsCard, DesignProofCard, ProductContentCard, CatalogRow,
} from '../components/operations/OperationsCommerceModules';
import { EnterpriseOperationsPanel, InventoryCsvManager } from '../components/operations/OperationsEnterpriseModules';

export default function OperationsPage() {
  const { pick, lang } = useLanguage();
  const auth = useAuth();
  const catalog = useCatalog();
  const [state, setState] = useState({ loading: true, orders: [], quotes: [], designs: [], returns: [], refunds: [], specialRequests: [], catalog: [], shippingRates: [], siteContent: [], brands: [], categories: [], collections: [], warehouses: [], suppliers: [], carriers: [], coupons: [], taxRules: [], invoices: [], purchaseOrders: [], shipments: [], shipmentItems: [], notifications: [], auditLog: [], mediaAssets: [], contracts: [], paymentProofs: [], reorders: [], lockers: [], messages: [], securityEvents: [], stockMovements: [], organizations: [], lockerProducts: [], warehouseInventory: [], inventoryImports: [], exchangeRate: 9, error: '' });
  const [rate, setRate] = useState('9');
  const [saving, setSaving] = useState('');
  const [notice, setNotice] = useState('');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [adminUsers, setAdminUsers] = useState({ loading: false, rows: [], error: '' });
  const staff = isStaffUser(auth.user);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await loadOperationsDashboard();
      setState({ loading: false, ...data, error: '' });
      setRate(String(data.exchangeRate || 9));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error?.message === 'cloud_not_configured'
        ? pick({ en: 'Connect Supabase to activate operations.', ar: 'اربط Supabase لتفعيل منصة العمليات.' })
        : `${pick({ en: 'Operations data could not be loaded.', ar: 'تعذر تحميل بيانات العمليات.' })} ${error?.message || ''}` }));
    }
  }, [pick]);

  useEffect(() => { if (staff) load(); }, [staff, load]);
  useEffect(() => {
    if (getStaffRole(auth.user) !== 'super_admin' || !auth.session?.access_token) return undefined;
    let active = true;
    setAdminUsers((current) => ({ ...current, loading: true, error: '' }));
    loadAdminUsers(auth.session.access_token).then((result) => {
      if (active) setAdminUsers({ loading: false, rows: result.users || [], error: '' });
    }).catch((error) => { if (active) setAdminUsers({ loading: false, rows: [], error: error?.message || 'users_unavailable' }); });
    return () => { active = false; };
  }, [auth.user?.id, auth.session?.access_token]);
  const activeOrders = useMemo(() => state.orders.filter((order) => !['delivered', 'cancelled'].includes(order.order_status)), [state.orders]);
  const pendingShipping = useMemo(() => state.orders.filter((order) => order.shipping_quote_required || order.order_status === 'pending_shipping_quote'), [state.orders]);
  const catalogProducts = useMemo(() => {
    const grouped = new Map();
    for (const row of state.catalog) if (!grouped.has(row.product_id)) grouped.set(row.product_id, row);
    return [...grouped.values()].sort((a, b) => String(a.product_name).localeCompare(String(b.product_name)));
  }, [state.catalog]);
  const filteredCatalog = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    return state.catalog.filter((row) => !q || [row.product_name, row.sku, row.variant_id, row.canonical_slug].some((value) => String(value || '').toLowerCase().includes(q))).slice(0, 200);
  }, [state.catalog, catalogQuery]);

  const run = async (key, action, success) => {
    setSaving(key); setNotice('');
    try {
      await action();
      invalidateOperationsCache();
      setNotice(success);
      await Promise.all([load(), catalog.refresh({ quiet: true })]);
    }
    catch (error) { setNotice(`${pick({ en: 'Could not save:', ar: 'تعذر الحفظ:' })} ${error?.message || error}`); }
    finally { setSaving(''); }
  };

  if (auth.loading) return null;
  if (!auth.user) return <Navigate to="/account?returnTo=/operations" replace />;
  if (!staff) return <Navigate to="/account" replace />;

  return <>
    <Seo title="Operations" path="/operations" noindex />
    <PageHero label={`STAFF · ${getStaffRole(auth.user).toUpperCase()}`} title={pick({ en: 'Commerce Operations', ar: 'عمليات المتجر' })} description={pick({ en: 'Orders, payments, shipping, inventory, quotes and design approvals in one controlled workspace.', ar: 'الطلبات والمدفوعات والشحن والمخزون والعروض واعتمادات التصميم في منصة واحدة محكمة.' })} />
    <section className="section operations-page"><div className="container">
      <div className="operations-toolbar">
        <Stat label={pick({ en: 'Shipping quotes', ar: 'طلبات تسعير الشحن' })} value={pendingShipping.length} />
        <Stat label={pick({ en: 'Active orders', ar: 'الطلبات النشطة' })} value={activeOrders.length} />
        <Stat label={pick({ en: 'Active quotes', ar: 'عروض الأسعار النشطة' })} value={state.quotes.length} />
        <Stat label={pick({ en: 'Open returns', ar: 'طلبات الإرجاع المفتوحة' })} value={state.returns.length} />
        <Stat label={pick({ en: 'Special requests', ar: 'الطلبات الخاصة' })} value={state.specialRequests.length} />
        <Stat label={pick({ en: 'Catalog variants', ar: 'خيارات المنتجات' })} value={state.catalog.length} />
        <form onSubmit={(event) => { event.preventDefault(); run('rate', () => setExchangeRate(rate), pick({ en: 'Exchange rate saved and notification queued.', ar: 'تم حفظ سعر الصرف وإضافة الإشعار.' })); }} className="operations-rate">
          <label><span>USD → LYD</span><input type="number" min="0.01" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} /></label>
          <button className="btn-secondary" disabled={saving === 'rate'}>{pick({ en: 'Save Rate', ar: 'حفظ السعر' })}</button>
        </form>
      </div>
      {(state.error || notice) && <p className="form-status" role="status">{state.error || notice}</p>}
      {state.loading ? <p role="status">{pick({ en: 'Loading operations…', ar: 'جاري تحميل العمليات…' })}</p> : <>
        <section className="operations-section"><h2>{pick({ en: 'Country shipping rates', ar: 'أسعار الشحن حسب الدولة' })}</h2><p>{pick({ en: 'Retail checkout uses these prices automatically. Countries without an active price stay pending for a manual quote. Custom, wholesale and large equipment always remain quote-based.', ar: 'يستخدم الدفع هذه الأسعار تلقائيًا للطلبات العادية. الدول من دون سعر نشط تبقى معلقة للتسعير، بينما التصميم والجملة والمعدات الكبيرة تحتاج دائمًا عرض شحن مستقلًا.' })}</p><ShippingRatesManager rows={state.shippingRates} lang={lang} pick={pick} saving={saving} run={run} /></section>
        <section className="operations-section"><h2>{pick({ en: 'Homepage hero media', ar: 'وسائط هيرو الصفحة الرئيسية' })}</h2><HeroContentManager row={state.siteContent.find((item) => item.content_key === 'home_hero')} pick={pick} saving={saving} run={run} /></section>
        {getStaffRole(auth.user) === 'super_admin' && <section className="operations-section"><h2>{pick({ en: 'Staff access', ar: 'صلاحيات الموظفين' })}</h2><p>{pick({ en: 'Roles are stored in protected Supabase app metadata. Customers cannot grant themselves access.', ar: 'تُحفظ الصلاحيات داخل بيانات Supabase المحمية، ولا يستطيع العميل منح نفسه صلاحية.' })}</p><StaffAccessManager state={adminUsers} accessToken={auth.session?.access_token} currentUserId={auth.user.id} pick={pick} saving={saving} run={run} onUpdated={(user) => setAdminUsers((current) => ({ ...current, rows: current.rows.map((row) => row.id === user.id ? user : row) }))} /></section>}
        <section className="operations-section"><h2>{pick({ en: 'Enterprise master data', ar: 'البيانات الرئيسية للمؤسسة' })}</h2><p>{pick({ en: 'Manage brands, categories, warehouses, suppliers and carriers from protected database records.', ar: 'إدارة البراندات والتصنيفات والمستودعات والموردين وشركات الشحن من سجلات قاعدة بيانات محمية.' })}</p><MasterDataManager data={state} pick={pick} saving={saving} run={run} /></section>
        <section className="operations-section"><h2>{pick({ en: 'Warehouse stock ledger', ar: 'سجل حركة مخزون المستودعات' })}</h2><StockMovementManager warehouses={state.warehouses} catalog={state.catalog} pick={pick} saving={saving} run={run} /><InventoryCsvManager state={state} pick={pick} saving={saving} run={run} /></section>
        <section className="operations-section"><h2>{pick({ en: 'Operations health', ar: 'صحة العمليات' })}</h2><div className="operations-toolbar"><Stat label={pick({ en: 'Invoices', ar: 'الفواتير' })} value={state.invoices.length} /><Stat label={pick({ en: 'Purchase orders', ar: 'أوامر الشراء' })} value={state.purchaseOrders.length} /><Stat label={pick({ en: 'Shipments', ar: 'الشحنات' })} value={state.shipments.length} /><Stat label={pick({ en: 'Contracts', ar: 'العقود' })} value={state.contracts.length} /><Stat label={pick({ en: 'Payment proofs', ar: 'إثباتات الدفع' })} value={state.paymentProofs.length} /><Stat label={pick({ en: 'Reorders', ar: 'إعادات الطلب' })} value={state.reorders.length} /><Stat label={pick({ en: 'Team lockers', ar: 'متاجر الفرق' })} value={state.lockers.length} /><Stat label={pick({ en: 'Failed notifications', ar: 'الإشعارات الفاشلة' })} value={state.notifications.filter((row) => row.delivery_status === 'failed').length} /><Stat label={pick({ en: 'Security alerts', ar: 'تنبيهات الأمان' })} value={state.securityEvents.filter((row) => !row.resolved_at && ['error','critical'].includes(row.severity)).length} /><Stat label={pick({ en: 'Quarantined media', ar: 'وسائط في الحجر' })} value={state.mediaAssets.filter((row) => ['quarantined','failed'].includes(row.scan_status)).length} /></div><details><summary>{pick({ en: 'Recent audit records', ar: 'أحدث سجلات التدقيق' })}</summary><ul>{state.auditLog.slice(0, 20).map((row) => <li key={row.id}>{row.action} · {row.entity_type} · {String(row.created_at || '').slice(0, 19)}</li>)}</ul></details></section>
        <section className="operations-section"><h2>{pick({ en: 'Enterprise workflows', ar: 'عمليات المؤسسات' })}</h2><EnterpriseOperationsPanel state={state} pick={pick} saving={saving} run={run} /></section>
        <BusinessIntelligencePanel pick={pick} />
        <section className="operations-section"><h2>{pick({ en: 'Operations control center', ar: 'مركز التحكم التشغيلي' })}</h2><OperationsControlCenter state={state} accessToken={auth.session?.access_token} pick={pick} saving={saving} run={run} /></section>
        <section className="operations-section"><div className="section-heading-row"><h2>{pick({ en: 'International shipping queue', ar: 'قائمة الشحن الدولي' })}</h2><button className="btn-secondary" onClick={load}>{pick({ en: 'Refresh', ar: 'تحديث' })}</button></div>
          <div className="operations-table-wrap"><table className="operations-table"><thead><tr><th>{pick({ en: 'Order', ar: 'الطلب' })}</th><th>{pick({ en: 'Destination', ar: 'الوجهة' })}</th><th>{pick({ en: 'Products', ar: 'المنتجات' })}</th><th>{pick({ en: 'Shipping USD', ar: 'الشحن بالدولار' })}</th><th>{pick({ en: 'Action', ar: 'الإجراء' })}</th></tr></thead><tbody>
            {pendingShipping.map((order) => <ShippingQuoteRow key={order.id} order={order} pick={pick} saving={saving} run={run} />)}
            {!pendingShipping.length && <tr><td colSpan="5">{pick({ en: 'No pending international shipping quotes.', ar: 'لا توجد طلبات شحن دولي معلقة.' })}</td></tr>}
          </tbody></table></div>
        </section>
        <section className="operations-section"><h2>{pick({ en: 'Special requests', ar: 'الطلبات الخاصة' })}</h2><div className="operations-card-grid">{state.specialRequests.map((request) => <SpecialRequestOperationsCard key={request.id} request={request} pick={pick} saving={saving} run={run} />)}{!state.specialRequests.length && <p>{pick({ en: 'No open special requests.', ar: 'لا توجد طلبات خاصة مفتوحة.' })}</p>}</div></section>
        <section className="operations-section"><h2>{pick({ en: 'Order workflow & payments', ar: 'مراحل الطلبات والمدفوعات' })}</h2><div className="operations-card-grid">{activeOrders.map((order) => <OrderOperationsCard key={order.id} order={order} pick={pick} saving={saving} run={run} />)}</div></section>
        <section className="operations-section"><h2>{pick({ en: 'Returns & refunds', ar: 'الإرجاع واسترداد المبالغ' })}</h2><div className="operations-card-grid">{state.returns.map((request) => <ReturnOperationsCard key={request.id} request={request} orders={state.orders} pick={pick} saving={saving} run={run} />)}{!state.returns.length && <p>{pick({ en: 'No open return requests.', ar: 'لا توجد طلبات إرجاع مفتوحة.' })}</p>}</div></section>
        <section className="operations-section"><h2>{pick({ en: 'Custom & wholesale quotes', ar: 'عروض التصميم والجملة' })}</h2><div className="operations-card-grid">{state.quotes.map((quote) => <QuoteCard key={quote.id} quote={quote} pick={pick} saving={saving} run={run} />)}</div></section>
        <section className="operations-section"><h2>{pick({ en: 'Design proof approvals', ar: 'اعتمادات بروفات التصميم' })}</h2><div className="operations-card-grid">{state.designs.map((design) => <DesignProofCard key={design.id} design={design} pick={pick} saving={saving} run={run} accessToken={auth.session?.access_token} />)}{!state.designs.length && <p>{pick({ en: 'No active design proofs.', ar: 'لا توجد بروفات تصميم نشطة.' })}</p>}</div></section>
        <section className="operations-section"><h2>{pick({ en: 'Product content & merchandising', ar: 'محتوى المنتجات والعرض' })}</h2><div className="operations-product-grid">{catalogProducts.map((row) => <ProductContentCard key={row.product_id} row={row} pick={pick} saving={saving} run={run} />)}</div></section>
        <section className="operations-section"><div className="section-heading-row"><h2>{pick({ en: 'Catalog variants & inventory', ar: 'خيارات المنتجات والمخزون' })}</h2><input className="operations-search" value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder={pick({ en: 'Search SKU or product', ar: 'ابحث بالمنتج أو SKU' })} /></div>
          <div className="operations-table-wrap"><table className="operations-table catalog-operations-table"><thead><tr><th>SKU</th><th>{pick({ en: 'Product', ar: 'المنتج' })}</th><th>{pick({ en: 'Price', ar: 'السعر' })}</th><th>{pick({ en: 'Wholesale', ar: 'الجملة' })}</th><th>{pick({ en: 'Inventory', ar: 'المخزون' })}</th><th>{pick({ en: 'Ready', ar: 'فوري' })}</th><th>{pick({ en: 'Active', ar: 'نشط' })}</th><th>{pick({ en: 'Save', ar: 'حفظ' })}</th></tr></thead><tbody>{filteredCatalog.map((row) => <CatalogRow key={row.variant_id} row={row} pick={pick} saving={saving} run={run} />)}</tbody></table></div>
        </section>
      </>}
    </div></section>
  </>;
}



