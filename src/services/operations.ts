import { getSupabase } from './supabase';
import { sendFormspree } from './formspree';

type Row = Record<string, unknown>;
type StaffUser = unknown;
type Money = string | number | null | undefined;


const STAFF_ROLES = new Set(['super_admin', 'admin', 'operations', 'sales']);

export function getStaffRole(user: StaffUser): string {
  const meta =
    user && typeof user === 'object'
      ? ((user as Row).app_metadata as Row | undefined)
      : undefined;
  const role = String(meta?.role || '')
    .trim()
    .toLowerCase();
  return STAFF_ROLES.has(role) ? role : '';
}

export function isStaffUser(user: StaffUser): boolean {
  return Boolean(getStaffRole(user));
}

async function notify(payload: Row, subject: string): Promise<void> {
  try {
    await sendFormspree({ formType: 'operations', ...payload }, subject);
  } catch {
    // The database notification outbox remains the reliable retry path.
  }
}

export async function loadOperationsDashboard(): Promise<Row> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const [
    ordersResult,
    quotesResult,
    designsResult,
    returnsResult,
    refundsResult,
    specialRequestsResult,
    catalogResult,
    settingsResult,
    shippingRatesResult,
    siteContentResult,
    brandsResult,
    categoriesResult,
    collectionsResult,
    warehousesResult,
    suppliersResult,
    carriersResult,
    couponsResult,
    taxRulesResult,
    invoicesResult,
    purchaseOrdersResult,
    shipmentsResult,
    shipmentItemsResult,
    notificationsResult,
    auditResult,
    mediaResult,
    contractsResult,
    paymentProofsResult,
    reordersResult,
    lockersResult,
    messagesResult,
    securityResult,
    stockMovementsResult,
    organizationsResult,
    lockerProductsResult,
    warehouseInventoryResult,
    inventoryImportsResult,
  ] = await Promise.all([
    client.from('orders').select('*').order('created_at', { ascending: false }).limit(300),
    client
      .from('quote_requests')
      .select('*')
      .not('status', 'in', '(completed,cancelled)')
      .order('created_at', { ascending: false })
      .limit(150),
    client
      .from('custom_designs')
      .select('*')
      .in('status', [
        'quote_requested',
        'under_review',
        'changes_requested',
        'proof_ready',
        'approved',
      ])
      .order('updated_at', { ascending: false })
      .limit(150),
    client
      .from('return_requests')
      .select('*')
      .not('status', 'in', '(closed,cancelled,rejected)')
      .order('created_at', { ascending: false })
      .limit(150),
    client.from('refund_events').select('*').order('created_at', { ascending: false }).limit(100),
    client
      .from('special_requests')
      .select('*')
      .not('status', 'in', '(closed,rejected)')
      .order('created_at', { ascending: false })
      .limit(200),
    client
      .from('product_catalog')
      .select(
        'variant_id,product_id,canonical_slug,sku,product_name,active,unit_price,availability_state,inventory_tracking,inventory_quantity,variant_data,updated_at',
      )
      .order('product_name', { ascending: true })
      .limit(1000),
    client
      .from('commerce_settings')
      .select('setting_key,numeric_value')
      .eq('setting_key', 'usd_to_lyd_rate')
      .maybeSingle(),
    client
      .from('shipping_country_rates')
      .select('country_code,rate_usd,active,note,updated_at')
      .order('country_code', { ascending: true }),
    client
      .from('site_content')
      .select('content_key,content_value,public_read,updated_at')
      .order('content_key', { ascending: true }),
    client.from('catalog_brands').select('*').order('sort_order', { ascending: true }).limit(300),
    client
      .from('catalog_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .limit(300),
    client
      .from('catalog_collections')
      .select('*')
      .order('sort_order', { ascending: true })
      .limit(300),
    client.from('warehouses').select('*').order('name', { ascending: true }).limit(100),
    client.from('suppliers').select('*').order('name', { ascending: true }).limit(300),
    client.from('carriers').select('*').order('name', { ascending: true }).limit(100),
    client.from('coupons').select('*').order('created_at', { ascending: false }).limit(300),
    client.from('tax_rules').select('*').order('country_code', { ascending: true }).limit(300),
    client.from('invoices').select('*').order('created_at', { ascending: false }).limit(100),
    client.from('purchase_orders').select('*').order('created_at', { ascending: false }).limit(100),
    client.from('shipments').select('*').order('created_at', { ascending: false }).limit(100),
    client.from('shipment_items').select('*').limit(500),
    client
      .from('commerce_notifications')
      .select(
        'id,event_type,entity_type,entity_id,delivery_status,attempts,last_error,created_at,updated_at',
      )
      .order('created_at', { ascending: false })
      .limit(100),
    client
      .from('operations_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),
    client.from('media_assets').select('*').order('created_at', { ascending: false }).limit(100),
    client
      .from('organization_contracts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(150),
    client.from('payment_proofs').select('*').order('created_at', { ascending: false }).limit(150),
    client
      .from('reorder_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(150),
    client
      .from('team_locker_stores')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(150),
    client
      .from('project_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(150),
    client.from('security_events').select('*').order('created_at', { ascending: false }).limit(100),
    client
      .from('stock_movement_ledger')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
    client.from('organizations').select('*').order('created_at', { ascending: false }).limit(300),
    client
      .from('team_locker_products')
      .select('*')
      .order('sort_order', { ascending: true })
      .limit(500),
    client
      .from('warehouse_inventory')
      .select('*,warehouse:warehouses(code,name),variant:product_catalog(sku,product_name)')
      .order('updated_at', { ascending: false })
      .limit(2000),
    client
      .from('inventory_import_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  for (const result of [
    ordersResult,
    quotesResult,
    designsResult,
    returnsResult,
    refundsResult,
    specialRequestsResult,
    catalogResult,
    settingsResult,
    shippingRatesResult,
    siteContentResult,
    brandsResult,
    categoriesResult,
    collectionsResult,
    warehousesResult,
    suppliersResult,
    carriersResult,
    couponsResult,
    taxRulesResult,
    invoicesResult,
    purchaseOrdersResult,
    shipmentsResult,
    shipmentItemsResult,
    notificationsResult,
    auditResult,
    mediaResult,
    contractsResult,
    paymentProofsResult,
    reordersResult,
    lockersResult,
    messagesResult,
    securityResult,
    stockMovementsResult,
    organizationsResult,
    lockerProductsResult,
    warehouseInventoryResult,
    inventoryImportsResult,
  ])
    if (result.error) throw result.error;
  return {
    orders: ordersResult.data || [],
    quotes: quotesResult.data || [],
    designs: designsResult.data || [],
    returns: returnsResult.data || [],
    refunds: refundsResult.data || [],
    specialRequests: specialRequestsResult.data || [],
    catalog: catalogResult.data || [],
    exchangeRate: Number(settingsResult.data?.numeric_value || 9),
    shippingRates: shippingRatesResult.data || [],
    siteContent: siteContentResult.data || [],
    brands: brandsResult.data || [],
    categories: categoriesResult.data || [],
    collections: collectionsResult.data || [],
    warehouses: warehousesResult.data || [],
    suppliers: suppliersResult.data || [],
    carriers: carriersResult.data || [],
    coupons: couponsResult.data || [],
    taxRules: taxRulesResult.data || [],
    invoices: invoicesResult.data || [],
    purchaseOrders: purchaseOrdersResult.data || [],
    shipments: shipmentsResult.data || [],
    shipmentItems: shipmentItemsResult.data || [],
    notifications: notificationsResult.data || [],
    auditLog: auditResult.data || [],
    mediaAssets: mediaResult.data || [],
    contracts: contractsResult.data || [],
    paymentProofs: paymentProofsResult.data || [],
    reorders: reordersResult.data || [],
    lockers: lockersResult.data || [],
    messages: messagesResult.data || [],
    securityEvents: securityResult.data || [],
    stockMovements: stockMovementsResult.data || [],
    organizations: organizationsResult.data || [],
    lockerProducts: lockerProductsResult.data || [],
    warehouseInventory: warehouseInventoryResult.data || [],
    inventoryImports: inventoryImportsResult.data || [],
  };
}

export async function updateSpecialRequest({
  requestId,
  status,
  productCost = null,
  shippingCost = null,
  taxTotal = 0,
  discountTotal = 0,
  currency = 'USD',
  estimatedArrivalDays = null,
  staffNotes = '',
  paymentUrl = '',
  quoteExpiresAt = null,
}: {
  requestId: string;
  status: string;
  productCost?: string | number | null;
  shippingCost?: string | number | null;
  taxTotal?: string | number | null;
  discountTotal?: string | number | null;
  currency?: string;
  estimatedArrivalDays?: string | number | null;
  staffNotes?: string;
  paymentUrl?: string;
  quoteExpiresAt?: string | null;
}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const numeric = (value: unknown) => (value === '' || value == null ? null : Number(value));
  const values = [productCost, shippingCost, taxTotal, discountTotal].map(numeric);
  if (values.some((value) => value != null && (!Number.isFinite(value) || value < 0)))
    throw new Error('invalid_quote_amount');
  const days = numeric(estimatedArrivalDays);
  if (days != null && (!Number.isInteger(days) || days < 1 || days > 365))
    throw new Error('invalid_arrival_days');
  const { data, error } = await client.rpc('staff_update_special_request', {
    p_request_id: requestId,
    p_status: status,
    p_product_cost: values[0],
    p_shipping_cost: values[1],
    p_tax_total: values[2] ?? 0,
    p_discount_total: values[3] ?? 0,
    p_currency: currency,
    p_estimated_arrival_days: days,
    p_staff_notes: String(staffNotes || '').slice(0, 5000),
    p_payment_url: paymentUrl || null,
    p_quote_expires_at: quoteExpiresAt ? new Date(quoteExpiresAt).toISOString() : null,
  });
  if (error) throw error;
  return data;
}

export async function setShippingQuote({
  orderId,
  amountUsd,
  note = '',
}: {
  orderId: string;
  amountUsd: string | number;
  note?: string;
}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const amount = Number(amountUsd);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('invalid_shipping_amount');
  const { data, error } = await client.rpc('staff_set_shipping_quote', {
    p_order_id: orderId,
    p_shipping_total: amount,
    p_note: String(note || '').slice(0, 500),
  });
  if (error) throw error;
  await notify(
    {
      event: 'shipping_quote_ready',
      orderNumber: data?.order_number,
      customerEmail: data?.customer_email,
      shippingUsd: data?.shipping_total,
      totalUsd: data?.total,
      amountDueNowUsd: data?.amount_due_now,
      paymentPlan: data?.payment_plan,
      note,
    },
    `Shipping quote ready — ${data?.order_number || orderId}`,
  );
  return data;
}

export async function updateOrderWorkflow({
  orderId,
  orderStatus = null,
  paymentStatus = null,
  fulfillmentStatus = null,
}: {
  orderId: string;
  orderStatus?: string | null;
  paymentStatus?: string | null;
  fulfillmentStatus?: string | null;
}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client.rpc('staff_update_order_workflow', {
    p_order_id: orderId,
    p_order_status: orderStatus || null,
    p_payment_status: paymentStatus || null,
    p_fulfillment_status: fulfillmentStatus || null,
  });
  if (error) throw error;
  await notify(
    {
      event: 'order_status_update',
      orderNumber: data?.order_number,
      customerEmail: data?.customer_email,
      orderStatus: data?.order_status,
      paymentStatus: data?.payment_status,
      fulfillmentStatus: data?.fulfillment_status,
      amountDueNowUsd: data?.amount_due_now,
      remainingBalanceUsd: data?.remaining_balance,
    },
    `Order update — ${data?.order_number || orderId}`,
  );
  return data;
}

export async function recordManualPayment({
  orderId,
  amountUsd,
  method = 'cash',
  reference = '',
  note = '',
}: {
  orderId: string;
  amountUsd: string | number;
  method?: string;
  reference?: string;
  note?: string;
}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const amount = Number(amountUsd);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('invalid_payment_amount');
  const { data, error } = await client.rpc('staff_record_payment', {
    p_order_id: orderId,
    p_amount: amount,
    p_method: String(method || 'cash').slice(0, 60),
    p_reference: String(reference || '').slice(0, 240),
    p_note: String(note || '').slice(0, 1000),
  });
  if (error) throw error;
  await notify(
    {
      event: 'manual_payment_recorded',
      orderNumber: data?.order_number,
      customerEmail: data?.customer_email,
      amountUsd: amount,
      paymentStatus: data?.payment_status,
      amountPaidUsd: data?.amount_paid,
      remainingBalanceUsd: data?.remaining_balance,
      method,
      reference,
      note,
    },
    `Payment recorded — ${data?.order_number || orderId}`,
  );
  return data;
}

export async function updateQuoteWorkflow({
  quoteId,
  status,
  subtotal,
  shippingTotal,
  taxTotal = 0,
  discountTotal = 0,
}: {
  quoteId: string;
  status: string;
  subtotal?: unknown;
  shippingTotal?: unknown;
  taxTotal?: unknown;
  discountTotal?: unknown;
}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const parsedSubtotal = subtotal === '' || subtotal == null ? null : Number(subtotal);
  const parsedShipping =
    shippingTotal === '' || shippingTotal == null ? null : Number(shippingTotal);
  const parsedTax = taxTotal == null ? 0 : Number(taxTotal);
  const parsedDiscount = discountTotal == null ? 0 : Number(discountTotal);
  if (parsedSubtotal != null && (!Number.isFinite(parsedSubtotal) || parsedSubtotal < 0))
    throw new Error('invalid_quote_subtotal');
  if (parsedShipping != null && (!Number.isFinite(parsedShipping) || parsedShipping < 0))
    throw new Error('invalid_quote_shipping');
  if (!Number.isFinite(parsedTax) || parsedTax < 0) throw new Error('invalid_quote_tax');
  if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0)
    throw new Error('invalid_quote_discount');
  const total =
    parsedSubtotal == null || parsedShipping == null
      ? null
      : Math.max(
          0,
          Math.round((parsedSubtotal + parsedShipping + parsedTax - parsedDiscount) * 100) / 100,
        );
  const { data, error } = await client.rpc('staff_update_quote', {
    p_quote_id: quoteId,
    p_status: status,
    p_subtotal: parsedSubtotal,
    p_shipping_total: parsedShipping,
    p_tax_total: parsedTax,
    p_discount_total: parsedDiscount,
    p_total: total,
  });
  if (error) throw error;
  await notify(
    {
      event: 'quote_update',
      quoteNumber: data?.quote_number,
      customerEmail: data?.request_data?.customerEmail || data?.request_data?.email,
      status: data?.status,
      subtotalUsd: data?.subtotal,
      shippingUsd: data?.shipping_total,
      taxUsd: data?.tax_total,
      discountUsd: data?.discount_total,
      totalUsd: data?.total,
      depositUsd: data?.deposit_amount,
      remainingUsd: data?.remaining_balance,
    },
    `Quote update — ${data?.quote_number || quoteId}`,
  );
  return data;
}

export async function setExchangeRate(rate: number | string): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const numeric = Number(rate);
  if (!Number.isFinite(numeric) || numeric <= 0) throw new Error('invalid_exchange_rate');
  const { data, error } = await client.rpc('staff_set_exchange_rate', { p_rate: numeric });
  if (error) throw error;
  await notify(
    { event: 'exchange_rate_update', usdToLydRate: numeric },
    'Shababuna exchange rate updated',
  );
  return data;
}

export async function publishDesignProof({
  designId,
  proofUrls = [],
  note = '',
}: {
  designId: string;
  proofUrls?: unknown[];
  note?: string;
}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const urls = [
    ...new Set(
      (Array.isArray(proofUrls) ? proofUrls : [])
        .map((value: unknown) => String(value || '').trim())
        .filter((value: unknown) => /^https:\/\//i.test(String(value))),
    ),
  ].slice(0, 8);
  if (!urls.length) throw new Error('proof_url_required');
  const { data, error } = await client.rpc('staff_publish_design_proof', {
    p_design_id: designId,
    p_proof_data: { urls, publishedAt: new Date().toISOString() },
    p_note: String(note || '').slice(0, 1000),
  });
  if (error) throw error;
  await notify(
    {
      event: 'design_proof_published',
      designId,
      designName: data?.name,
      status: data?.status,
      proofUrls: urls,
      note,
    },
    `Design proof published — ${data?.name || designId}`,
  );
  return data;
}

export async function recordQuotePayment({
  quoteId,
  amountUsd,
  method = 'bank_transfer',
  reference = '',
  note = '',
}: {
  quoteId: string;
  amountUsd: string | number;
  method?: string;
  reference?: string;
  note?: string;
}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const amount = Number(amountUsd);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('invalid_payment_amount');
  const { data, error } = await client.rpc('staff_record_quote_payment', {
    p_quote_id: quoteId,
    p_amount: amount,
    p_method: String(method || 'bank_transfer').slice(0, 80),
    p_reference: String(reference || '').slice(0, 240),
    p_note: String(note || '').slice(0, 1000),
  });
  if (error) throw error;
  await notify(
    {
      event: 'quote_payment_recorded',
      quoteNumber: data?.quote_number,
      customerEmail: data?.request_data?.customerEmail || data?.request_data?.email,
      amountUsd: amount,
      paymentStatus: data?.payment_status,
      status: data?.status,
      amountPaidUsd: data?.amount_paid,
      amountDueNowUsd: data?.amount_due_now,
      remainingBalanceUsd: data?.remaining_balance,
      method,
      reference,
    },
    `Quote payment recorded — ${data?.quote_number || quoteId}`,
  );
  return data;
}

export async function updateReturnRequest({
  returnId,
  status,
  resolution = null,
  refundAmount = null,
  staffNote = '',
  restock = false,
}: {
  returnId: string;
  status: string;
  resolution?: string | null;
  refundAmount?: string | number | null;
  staffNote?: string;
  restock?: boolean;
}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const amount = refundAmount === '' || refundAmount == null ? null : Number(refundAmount);
  if (amount != null && (!Number.isFinite(amount) || amount < 0))
    throw new Error('invalid_refund_amount');
  const { data, error } = await client.rpc('staff_update_return_request', {
    p_return_id: returnId,
    p_status: status,
    p_resolution: resolution || null,
    p_refund_amount: amount,
    p_staff_note: String(staffNote || '').slice(0, 3000),
    p_restock: Boolean(restock),
  });
  if (error) throw error;
  await notify(
    {
      event: 'return_update',
      returnNumber: data?.return_number,
      orderNumber: data?.order_number,
      customerEmail: data?.customer_email,
      status: data?.status,
      resolution: data?.resolution,
      refundAmountUsd: data?.refund_amount,
      staffNote: data?.staff_note,
    },
    `Return update — ${data?.return_number || returnId}`,
  );
  return data;
}

export async function recordRefund({
  orderId,
  amountUsd,
  method = 'bank_transfer',
  reference = '',
  note = '',
  returnRequestId = null,
}: {
  orderId?: string | null;
  amountUsd: string | number;
  method?: string;
  reference?: string;
  note?: string;
  returnRequestId?: string | null;
}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const amount = Number(amountUsd);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('invalid_refund_amount');
  const { data, error } = await client.rpc('staff_record_refund', {
    p_order_id: orderId,
    p_amount: amount,
    p_method: String(method || 'bank_transfer').slice(0, 60),
    p_reference: String(reference || '').slice(0, 240),
    p_note: String(note || '').slice(0, 1000),
    p_return_request_id: returnRequestId || null,
  });
  if (error) throw error;
  await notify(
    {
      event: 'refund_recorded',
      orderNumber: data?.order_number,
      customerEmail: data?.customer_email,
      refundAmountUsd: amount,
      amountRefundedUsd: data?.amount_refunded,
      paymentStatus: data?.payment_status,
      method,
      reference,
      returnRequestId,
    },
    `Refund recorded — ${data?.order_number || orderId}`,
  );
  return data;
}

export async function updateCatalogVariant({
  variantId,
  unitPrice,
  wholesalePrice,
  inventoryQuantity,
  active,
  readyToShip,
}: {
  variantId: string;
  unitPrice?: Money;
  wholesalePrice?: Money;
  inventoryQuantity?: Money;
  active?: boolean | null;
  readyToShip?: boolean | null;
}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const payload = {
    p_variant_id: variantId,
    p_unit_price: unitPrice === '' || unitPrice == null ? null : Number(unitPrice),
    p_wholesale_price:
      wholesalePrice === '' || wholesalePrice == null ? null : Number(wholesalePrice),
    p_inventory_quantity:
      inventoryQuantity === '' || inventoryQuantity == null ? null : Number(inventoryQuantity),
    p_active: active == null ? null : Boolean(active),
    p_ready_to_ship: readyToShip == null ? null : Boolean(readyToShip),
  };
  const { data, error } = await client.rpc('staff_update_catalog_variant', payload);
  if (error) throw error;
  await notify(
    {
      event: 'catalog_variant_update',
      variantId,
      sku: data?.sku,
      productName: data?.product_name,
      unitPriceUsd: data?.unit_price,
      inventory: data?.inventory_quantity,
      active: data?.active,
      readyToShip: data?.variant_data?.readyToShip,
    },
    `Catalog updated — ${data?.sku || variantId}`,
  );
  return data;
}

export async function updateCatalogProduct({
  productId,
  nameEn,
  nameAr,
  descriptionEn,
  descriptionAr,
  brand,
  category,
  subcategory,
  productType,
  imageUrl,
  featured,
  newArrival,
  bestSeller,
  comingSoon,
  quoteOnly,
}: {
  productId: string;
  nameEn?: string | null;
  nameAr?: string | null;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  brand?: string | null;
  category?: string | null;
  subcategory?: string | null;
  productType?: string | null;
  imageUrl?: string | null;
  featured?: boolean | null;
  newArrival?: boolean | null;
  bestSeller?: boolean | null;
  comingSoon?: boolean | null;
  quoteOnly?: boolean | null;
}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const normalizedImageUrl = imageUrl == null ? null : String(imageUrl).trim();
  if (
    normalizedImageUrl &&
    (!/^\/(?:images|media)\/[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(normalizedImageUrl) ||
      normalizedImageUrl.includes('..'))
  ) {
    throw new Error('product_image_must_be_local');
  }
  const { data, error } = await client.rpc('staff_update_catalog_product', {
    p_product_id: String(productId || '').trim(),
    p_name_en: nameEn == null ? null : String(nameEn).trim(),
    p_name_ar: nameAr == null ? null : String(nameAr).trim(),
    p_description_en: descriptionEn == null ? null : String(descriptionEn).trim(),
    p_description_ar: descriptionAr == null ? null : String(descriptionAr).trim(),
    p_brand: brand == null ? null : String(brand).trim(),
    p_category: category == null ? null : String(category).trim(),
    p_subcategory: subcategory == null ? null : String(subcategory).trim(),
    p_product_type: productType == null ? null : String(productType).trim(),
    p_image_url: normalizedImageUrl,
    p_featured: featured == null ? null : Boolean(featured),
    p_new_arrival: newArrival == null ? null : Boolean(newArrival),
    p_best_seller: bestSeller == null ? null : Boolean(bestSeller),
    p_coming_soon: comingSoon == null ? null : Boolean(comingSoon),
    p_quote_only: quoteOnly == null ? null : Boolean(quoteOnly),
  });
  if (error) throw error;
  await notify(
    {
      event: 'catalog_product_update',
      productId,
      productName: data?.product_name,
      brand,
      category,
      subcategory,
      productType,
      imageUrl,
    },
    `Catalog product updated — ${data?.product_name || productId}`,
  );
  return data;
}

export async function setCountryShippingRate({
  countryCode,
  rateUsd = null,
  active = true,
  note = '',
}: {
  countryCode: string;
  rateUsd?: string | number | null;
  active?: boolean;
  note?: string;
}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const code = String(countryCode || '')
    .trim()
    .toUpperCase();
  const rate = rateUsd === '' || rateUsd == null ? null : Number(rateUsd);
  if (!/^[A-Z]{2}$/.test(code) || code === 'LY') throw new Error('invalid_country_code');
  if (active && (rate == null || !Number.isFinite(rate) || rate < 0))
    throw new Error('active_shipping_rate_required');
  const { data, error } = await client.rpc('staff_set_country_shipping_rate', {
    p_country_code: code,
    p_rate_usd: rate,
    p_active: Boolean(active),
    p_note: String(note || '').slice(0, 500),
  });
  if (error) throw error;
  await notify(
    { event: 'country_shipping_rate_update', countryCode: code, rateUsd: rate, active, note },
    `Country shipping rate updated — ${code}`,
  );
  return data;
}

export async function updateSiteContent({
  contentKey,
  contentValue,
  publicRead = true,
}: {
  contentKey: string;
  contentValue: Row;
  publicRead?: boolean;
}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const key = String(contentKey || '')
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9_:-]{2,80}$/.test(key) || !contentValue || typeof contentValue !== 'object')
    throw new Error('invalid_site_content');
  const { data, error } = await client.rpc('staff_update_site_content', {
    p_content_key: key,
    p_content_value: contentValue,
    p_public_read: Boolean(publicRead),
  });
  if (error) throw error;
  await notify(
    { event: 'site_content_update', contentKey: key, contentValue },
    `Site content updated — ${key}`,
  );
  return data;
}

async function adminUsersRequest(accessToken?: string, options: Row = {}) {
  if (!accessToken) throw new Error('staff_session_required');
  const response = await fetch('/api/admin-users', {
    ...(options as RequestInit),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(((options as Row).headers as Row) || {}),
    },
    cache: 'no-store',
  });
  const data = (await response.json().catch(() => ({}))) as Row;
  if (!response.ok || data.ok === false)
    throw new Error(String(data.error || 'admin_users_request_failed'));
  return data;
}

export async function loadAdminUsers(accessToken?: string): Promise<unknown[]> {
  const data = await adminUsersRequest(accessToken, { method: 'GET' });
  return Array.isArray(data.users) ? (data.users as unknown[]) : Array.isArray(data) ? (data as unknown[]) : [];
}

export async function updateAdminUserRole(accessToken: string, userId: string, role: string): Promise<unknown> {
  return adminUsersRequest(accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ userId, role }),
  });
}

function encodeUploadFile(file: File, role = 'additional_file'): Promise<Row> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('file_read_failed'));
    reader.onload = () =>
      resolve({
        name: file.name,
        mime: file.type,
        role,
        base64: String(reader.result || '').split(',')[1] || '',
      });
    reader.readAsDataURL(file);
  });
}

export async function uploadDesignProofFiles({
  accessToken,
  designId,
  files,
}: {
  accessToken?: string | undefined;
  designId: string;
  files?: File[];
}): Promise<unknown> {
  if (!accessToken) throw new Error('staff_session_required');
  const list = (files || []).slice(0, 5);
  if (!list.length) throw new Error('file_required');
  const encoded = await Promise.all(list.map((file) => encodeUploadFile(file)));
  const response = await fetch('/api/admin-media-upload', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      entityType: 'design',
      entityId: designId,
      assetRole: 'proof',
      files: encoded,
    }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || 'proof_upload_failed');
  return data.assets || [];
}

const OPERATIONAL_TABLES = new Set([
  'catalog_brands',
  'catalog_categories',
  'catalog_collections',
  'warehouses',
  'suppliers',
  'carriers',
  'coupons',
  'tax_rules',
  'organization_contracts',
  'team_locker_stores',
  'team_locker_products',
  'purchase_orders',
  'invoices',
  'shipments',
  'reorder_requests',
]);
export async function upsertOperationalEntity(table: string, row: Row): Promise<unknown> {
  if (!OPERATIONAL_TABLES.has(table) || !row || typeof row !== 'object')
    throw new Error('invalid_operational_entity');
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const payload = { ...row };
  if (!payload.id) delete payload.id;
  const { data, error } = await client.from(table).upsert(payload).select('*').single();
  if (error) throw error;
  return data;
}
export async function deleteOperationalEntity(table: string, id: string): Promise<unknown> {
  if (!OPERATIONAL_TABLES.has(table) || !id) throw new Error('invalid_operational_entity');
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { error } = await client.from(table).delete().eq('id', id);
  if (error) throw error;
  return true;
}
export async function recordStockMovement({
  warehouseId,
  variantId,
  movementType,
  quantityDelta,
  referenceType = 'manual',
  referenceId = '',
  note = '',
}: {
  warehouseId: string;
  variantId: string;
  movementType: string;
  quantityDelta: string | number;
  referenceType?: string;
  referenceId?: string;
  note?: string;
}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const quantity = Number(quantityDelta);
  if (!warehouseId || !variantId || !Number.isInteger(quantity) || quantity === 0)
    throw new Error('invalid_stock_movement');
  const { data, error } = await client.rpc('staff_record_stock_movement', {
    p_warehouse_id: warehouseId,
    p_variant_id: variantId,
    p_movement_type: movementType,
    p_quantity_delta: quantity,
    p_reference_type: referenceType,
    p_reference_id: referenceId || null,
    p_note: String(note || '').slice(0, 1000),
    p_idempotency_key: crypto.randomUUID(),
  });
  if (error) throw error;
  return data;
}

export async function reviewPaymentProof({
  proofId,
  status,
  note = '',
}: {
  proofId: string;
  status: string;
  note?: string;
}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client.rpc('staff_review_payment_proof', {
    p_proof_id: proofId,
    p_status: status,
    p_review_note: String(note || '').slice(0, 2000),
  });
  if (error) throw error;
  await notify(
    {
      event: 'payment_proof_reviewed',
      proofNumber: data?.proof_number,
      status: data?.status,
      amount: data?.amount,
      currency: data?.currency,
    },
    `Payment proof ${data?.status || status} — ${data?.proof_number || proofId}`,
  );
  return data;
}

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function parseInventoryCsv(text: string): unknown[] {
  const source = String(text || '').replace(/^\uFEFF/, '');
  const lines = source.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2 || lines.length > 1001) throw new Error('invalid_inventory_csv_size');
  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"' && quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) {
        cells.push(current.trim());
        current = '';
      } else current += char;
    }
    if (quoted) throw new Error('invalid_inventory_csv_quotes');
    cells.push(current.trim());
    return cells;
  };
  const headers = parseLine(String(lines[0] || '')).map((value) =>
    value.toLowerCase().replace(/\s+/g, '_'),
  );
  for (const required of ['warehouse_code', 'sku', 'on_hand'])
    if (!headers.includes(required)) throw new Error(`missing_inventory_header:${required}`);
  return lines.slice(1).map((line, rowIndex) => {
    const cells = parseLine(line);
    const row: Row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? '';
    });
    return {
      warehouse_code: row.warehouse_code,
      sku: row.sku,
      on_hand: row.on_hand,
      reorder_point: row.reorder_point || '0',
      row_number: rowIndex + 2,
    };
  });
}

export function createInventoryCsv(rows: unknown[]): string {
  const header = ['warehouse_code', 'sku', 'on_hand', 'reserved', 'reorder_point', 'verified_at'];
  return [
    header.join(','),
    ...(rows || []).map((entry) => {
      const row = entry as Row;
      const warehouse = (row.warehouse || {}) as Row;
      const variant = (row.variant || {}) as Row;
      return [
        warehouse.code || '',
        variant.sku || row.variant_id,
        row.on_hand,
        row.reserved,
        row.reorder_point,
        row.verified_at || '',
      ]
        .map(csvCell)
        .join(',');
    }),
  ].join('\n');
}

export async function previewInventoryImport({
  sourceName,
  rows,
  batchId = crypto.randomUUID(),
}: {
  sourceName: string;
  rows: unknown[];
  batchId?: string;
}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client.rpc('staff_apply_inventory_batch', {
    p_batch_id: batchId,
    p_source_name: sourceName,
    p_rows: rows,
    p_dry_run: true,
  });
  if (error) throw error;
  return data;
}

export async function applyInventoryImport({
  sourceName,
  rows,
  batchId,
}: {
  sourceName: string;
  rows: unknown[];
  batchId: string;
}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client.rpc('staff_apply_inventory_batch', {
    p_batch_id: batchId,
    p_source_name: sourceName,
    p_rows: rows,
    p_dry_run: false,
  });
  if (error) throw error;
  return data;
}

export async function rollbackInventoryImport(batchId: string): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client.rpc('staff_rollback_inventory_batch', {
    p_batch_id: batchId,
  });
  if (error) throw error;
  return data;
}

export async function retryCommerceNotification(notificationId: string): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const id = Number(notificationId);
  if (!Number.isInteger(id) || id < 1) throw new Error('invalid_notification');
  const { data, error } = await client.rpc('staff_retry_commerce_notification', {
    p_notification_id: id,
  });
  if (error) throw error;
  return data;
}

export async function resolveSecurityEvent(eventId: string, resolved = true): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  if (!eventId) throw new Error('invalid_security_event');
  const { data, error } = await client.rpc('staff_resolve_security_event', {
    p_event_id: eventId,
    p_resolved: Boolean(resolved),
  });
  if (error) throw error;
  return data;
}

export async function updateMediaAsset({
  assetId,
  altTextEn = null,
  altTextAr = null,
  sortOrder = null,
  visibility = null,
  retryScan = false,
}: {
  assetId: string;
  altTextEn?: string | null;
  altTextAr?: string | null;
  sortOrder?: number | string | null;
  visibility?: string | null;
  retryScan?: boolean;
}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  if (!assetId) throw new Error('invalid_media_asset');
  const order = sortOrder === '' || sortOrder == null ? null : Number(sortOrder);
  if (order != null && !Number.isInteger(order)) throw new Error('invalid_media_sort_order');
  const { data, error } = await client.rpc('staff_update_media_asset', {
    p_asset_id: assetId,
    p_alt_text_en: altTextEn,
    p_alt_text_ar: altTextAr,
    p_sort_order: order,
    p_visibility: visibility,
    p_retry_scan: Boolean(retryScan),
  });
  if (error) throw error;
  return data;
}

export async function upsertShipment({
  shipmentId = null,
  shipmentNumber = null,
  orderId = null,
  quoteId = null,
  carrierId = null,
  trackingNumber = '',
  status = 'pending',
  metadata = {},
}: {
  shipmentId?: string | null;
  shipmentNumber?: string | null;
  orderId?: string | number | null;
  quoteId?: string | number | null;
  carrierId?: string | number | null;
  trackingNumber?: string;
  status?: string;
  metadata?: Row;
} = {}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  if (Boolean(orderId) === Boolean(quoteId)) throw new Error('shipment_requires_one_parent');
  const { data, error } = await client.rpc('staff_upsert_shipment', {
    p_shipment_id: shipmentId,
    p_shipment_number: shipmentNumber,
    p_order_id: orderId,
    p_quote_id: quoteId,
    p_carrier_id: carrierId,
    p_tracking_number: trackingNumber || null,
    p_status: status,
    p_metadata: metadata || {},
  });
  if (error) throw error;
  return data;
}

export async function uploadOperationalMedia({
  accessToken,
  entityType,
  entityId,
  assetRole = 'reference',
  files,
}: {
  accessToken?: string | undefined;
  entityType: string;
  entityId: string;
  assetRole?: string;
  files?: unknown;
}): Promise<unknown> {
  if (!accessToken) throw new Error('staff_session_required');
  const list = (Array.isArray(files) ? files : Array.from((files as ArrayLike<File>) || [])).slice(
    0,
    5,
  ) as File[];
  if (!list.length) throw new Error('file_required');
  const encoded = await Promise.all(list.map((file) => encodeUploadFile(file, assetRole)));
  const response = await fetch('/api/admin-media-upload', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ entityType, entityId, assetRole, files: encoded }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || 'media_upload_failed');
  return data.assets || [];
}

export async function createCatalogProductDraft(input: Row): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client.rpc('staff_create_catalog_product_draft', {
    p_product_id: input.productId,
    p_slug: input.slug,
    p_name_en: input.nameEn,
    p_name_ar: input.nameAr,
    p_description_en: input.descriptionEn || '',
    p_description_ar: input.descriptionAr || '',
    p_brand: input.brand,
    p_category: input.category,
    p_subcategory: input.subcategory || '',
    p_product_type: input.productType || '',
    p_sku: input.sku,
    p_color: input.color || 'black',
    p_size: input.size || 'OS',
    p_currency: input.currency || 'USD',
  });
  if (error) throw error;
  return data;
}

export async function addCatalogVariantDraft({
  productId,
  sku,
  color = 'black',
  size = 'OS',
}: {
  productId: string;
  sku: string;
  color?: string;
  size?: string;
}): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client.rpc('staff_add_catalog_variant_draft', {
    p_product_id: productId,
    p_sku: sku,
    p_color: color,
    p_size: size,
  });
  if (error) throw error;
  return data;
}

export async function archiveCatalogProduct(productId: string): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client.rpc('staff_archive_catalog_product', {
    p_product_id: productId,
  });
  if (error) throw error;
  return data;
}

const operationsSectionCache = new Map();
const OPERATIONS_CACHE_MS = 30_000;
const sectionQueries = {
  orders: [
    ['orders', 'orders', '*', { order: ['created_at', false], limit: 300 }],
    ['specialRequests', 'special_requests', '*', { order: ['created_at', false], limit: 200 }],
  ],
  payments: [
    ['refunds', 'refund_events', '*', { order: ['created_at', false], limit: 200 }],
    ['paymentProofs', 'payment_proofs', '*', { order: ['created_at', false], limit: 200 }],
    ['invoices', 'invoices', '*', { order: ['created_at', false], limit: 200 }],
  ],
  b2b: [
    ['quotes', 'quote_requests', '*', { order: ['created_at', false], limit: 200 }],
    ['designs', 'custom_designs', '*', { order: ['updated_at', false], limit: 200 }],
    ['contracts', 'organization_contracts', '*', { order: ['created_at', false], limit: 200 }],
    ['organizations', 'organizations', '*', { order: ['created_at', false], limit: 300 }],
  ],
  shipping: [
    ['shippingRates', 'shipping_country_rates', '*', { order: ['country_code', true], limit: 300 }],
    ['carriers', 'carriers', '*', { order: ['name', true], limit: 100 }],
    ['shipments', 'shipments', '*', { order: ['created_at', false], limit: 200 }],
    ['shipmentItems', 'shipment_items', '*', { limit: 1000 }],
  ],
  catalog: [
    ['catalog', 'product_catalog', '*', { order: ['product_name', true], limit: 2000 }],
    ['brands', 'catalog_brands', '*', { order: ['sort_order', true], limit: 300 }],
    ['categories', 'catalog_categories', '*', { order: ['sort_order', true], limit: 300 }],
    ['collections', 'catalog_collections', '*', { order: ['sort_order', true], limit: 300 }],
  ],
  inventory: [
    ['warehouses', 'warehouses', '*', { order: ['name', true], limit: 100 }],
    [
      'warehouseInventory',
      'warehouse_inventory',
      '*',
      { order: ['updated_at', false], limit: 2000 },
    ],
    ['stockMovements', 'stock_movement_ledger', '*', { order: ['created_at', false], limit: 500 }],
    [
      'inventoryImports',
      'inventory_import_batches',
      '*',
      { order: ['created_at', false], limit: 100 },
    ],
  ],
  media: [['mediaAssets', 'media_assets', '*', { order: ['created_at', false], limit: 300 }]],
  security: [
    ['securityEvents', 'security_events', '*', { order: ['created_at', false], limit: 300 }],
    ['auditLog', 'operations_audit_log', '*', { order: ['created_at', false], limit: 300 }],
    ['notifications', 'commerce_notifications', '*', { order: ['created_at', false], limit: 300 }],
  ],
  users: [
    ['organizations', 'organizations', '*', { order: ['created_at', false], limit: 300 }],
    ['lockers', 'team_locker_stores', '*', { order: ['created_at', false], limit: 200 }],
    ['lockerProducts', 'team_locker_products', '*', { order: ['sort_order', true], limit: 500 }],
  ],
  settings: [
    ['siteContent', 'site_content', '*', { order: ['content_key', true], limit: 300 }],
    ['coupons', 'coupons', '*', { order: ['created_at', false], limit: 300 }],
    ['taxRules', 'tax_rules', '*', { order: ['country_code', true], limit: 300 }],
  ],
};
export function invalidateOperationsCache(section: string | null = null): void {
  if (section) operationsSectionCache.delete(section);
  else operationsSectionCache.clear();
}
export async function loadOperationsSection(
  section: string,
  options: { force?: boolean } = {},
): Promise<Row> {
  const key = String(section || '').toLowerCase();
  const definitions = (sectionQueries as Record<string, unknown[][]>)[key];
  if (!definitions) throw new Error('unknown_operations_section');
  const cached = operationsSectionCache.get(key) as
    | { createdAt: number; data: Row }
    | undefined;
  if (!options.force && cached && Date.now() - cached.createdAt < OPERATIONS_CACHE_MS) {
    return cached.data;
  }
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const entries = await Promise.all(
    definitions.map(async (definition) => {
      const [name, table, select, queryOptions] = definition as [
        string,
        string,
        string,
        { order?: [string, boolean]; limit?: number } | undefined,
      ];
      let query = client.from(table).select(select);
      if (queryOptions?.order)
        query = query.order(queryOptions.order[0], { ascending: queryOptions.order[1] });
      if (queryOptions?.limit) query = query.limit(queryOptions.limit);
      const result = await query;
      if (result.error) throw result.error;
      return [name, result.data || []];
    }),
  );
  const data = Object.fromEntries(entries);
  operationsSectionCache.set(key, { createdAt: Date.now(), data });
  return data;
}
