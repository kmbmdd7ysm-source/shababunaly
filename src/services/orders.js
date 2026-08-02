import { getSupabase } from './supabase';

const STORAGE_KEY = 'shababuna-orders-v4';
const LEGACY_KEYS = ['shababuna-orders-v3', 'shababuna-orders-v2'];
const MAX_ORDERS = 50;
const SCHEMA_VERSION = 4;
const CLOUD_ORDER_HISTORY_KEY = 'orderHistory';
const allowLocalOrderStorage = Boolean(import.meta.env.DEV) || ['localhost', '127.0.0.1'].includes(globalThis.location?.hostname || '');
const clean = (value = '') => String(value).trim();
const emailKey = (value = '') => clean(value).toLowerCase();
const safeNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const newId = () =>
  globalThis.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const createIdempotencyKey = () => newId();

function storageAvailable() {
  try {
    const key = '__shababuna_order_storage_test__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function normalizeOrder(order = {}) {
  const currency = clean(order.currency || order.canonicalCurrency || 'USD').toUpperCase();
  const displayCurrency = clean(order.displayCurrency || order.currency || 'USD').toUpperCase();
  const canonicalShippingTotal = Math.max(
    0,
    safeNumber(order.shippingTotal ?? order.shipping_total),
  );
  const originalShippingAmount = Math.max(
    0,
    safeNumber(order.shippingRate?.originalAmount ?? order.shipping_rate?.original_amount),
  );
  const inferredDisplayRate =
    displayCurrency !== currency && canonicalShippingTotal > 0 && originalShippingAmount > 0
      ? originalShippingAmount / canonicalShippingTotal
      : 1;
  const needsLegacyDisplayRepair = (displayValue, canonicalValue) =>
    displayCurrency !== currency &&
    inferredDisplayRate > 1.01 &&
    Math.abs(safeNumber(displayValue) - safeNumber(canonicalValue)) < 0.01;
  const repairedDisplayValue = (displayValue, canonicalValue) =>
    needsLegacyDisplayRepair(displayValue, canonicalValue)
      ? safeNumber(canonicalValue) * inferredDisplayRate
      : safeNumber(displayValue);
  const items = Array.isArray(order.items)
    ? order.items.map((item) => ({
        id: item.id || item.productId || item.product_id || null,
        type: item.type || item.fulfillment_type || null,
        fulfillmentType: item.fulfillmentType || item.fulfillment_type || null,
        registrationId: item.registrationId || item.registration_id || null,
        purchaseMode: clean(item.purchaseMode || item.purchase_mode || 'retail').toLowerCase(),
        customizable: Boolean(item.customizable || item.isCustom || item.is_custom),
        readyToShip: Boolean(item.readyToShip ?? item.ready_to_ship),
        sku: item.sku || null,
        variantId:
          item.variantId ||
          item.variant_id ||
          ((item.id || item.productId || item.product_id) && item.sku
            ? `${item.id || item.productId || item.product_id}:${item.sku}`
            : item.sku || null),
        name:
          typeof item.name === 'object'
            ? item.name.en || item.name.ar || ''
            : clean(item.name || item.product_name),
        variant: item.variant || item.variant_snapshot || null,
        quantity: Math.max(1, Math.trunc(safeNumber(item.quantity) || 1)),
        unitPrice: Math.max(0, safeNumber(item.unitPrice ?? item.unit_price ?? item.price)),
        displayUnitPrice: Math.max(
          0,
          repairedDisplayValue(
            item.displayUnitPrice ??
              item.display_unit_price ??
              safeNumber(item.unitPrice ?? item.unit_price ?? item.price) * inferredDisplayRate,
            item.unitPrice ?? item.unit_price ?? item.price,
          ),
        ),
        displayLineTotal: Math.max(
          0,
          repairedDisplayValue(
            item.displayLineTotal ??
              item.display_line_total ??
              safeNumber(item.lineTotal ?? item.line_total) * inferredDisplayRate,
            item.lineTotal ??
              item.line_total ??
              safeNumber(item.unitPrice ?? item.unit_price ?? item.price) *
                Math.max(1, Math.trunc(safeNumber(item.quantity) || 1)),
          ),
        ),
        lineTotal: Math.max(
          0,
          safeNumber(
            item.lineTotal ??
              item.line_total ??
              safeNumber(item.unitPrice ?? item.unit_price ?? item.price) *
                Math.max(1, Math.trunc(safeNumber(item.quantity) || 1)),
          ),
        ),
      }))
    : [];
  return {
    schemaVersion: SCHEMA_VERSION,
    id: order.id || newId(),
    idempotencyKey: clean(order.idempotencyKey || order.idempotency_key || newId()),
    orderNumber: clean(order.orderNumber || order.order_number),
    userId: order.userId || order.user_id || null,
    email: emailKey(
      order.email || order.customerEmail || order.customer_email || order.customer?.email,
    ),
    createdAt: order.createdAt || order.created_at || new Date().toISOString(),
    updatedAt: order.updatedAt || order.updated_at || new Date().toISOString(),
    currency,
    displayCurrency,
    subtotal: Math.max(0, safeNumber(order.subtotal)),
    displaySubtotal: Math.max(
      0,
      repairedDisplayValue(
        order.displaySubtotal ??
          order.display_subtotal ??
          safeNumber(order.subtotal) * inferredDisplayRate,
        order.subtotal,
      ),
    ),
    shippingTotal: canonicalShippingTotal,
    displayShippingTotal: Math.max(
      0,
      repairedDisplayValue(
        order.displayShippingTotal ??
          order.display_shipping_total ??
          canonicalShippingTotal * inferredDisplayRate,
        canonicalShippingTotal,
      ),
    ),
    taxTotal: Math.max(0, safeNumber(order.taxTotal ?? order.tax_total)),
    discountTotal: Math.max(0, safeNumber(order.discountTotal ?? order.discount_total)),
    total: Math.max(0, safeNumber(order.total)),
    displayTotal: Math.max(
      0,
      repairedDisplayValue(
        order.displayTotal ?? order.display_total ?? safeNumber(order.total) * inferredDisplayRate,
        order.total,
      ),
    ),
    paymentMethod: clean(order.paymentMethod || order.payment_method || 'cash_on_delivery'),
    paymentPlan: clean(order.paymentPlan || order.payment_plan || 'full'),
    amountPaid: Math.max(0, safeNumber(order.amountPaid ?? order.amount_paid)),
    amountRefunded: Math.max(0, safeNumber(order.amountRefunded ?? order.amount_refunded)),
    amountDueNow: Math.max(0, safeNumber(order.amountDueNow ?? order.amount_due_now ?? order.total)),
    outstandingBalance: Math.max(0, safeNumber(order.outstandingBalance ?? order.outstanding_balance ?? order.remainingBalance ?? order.remaining_balance)),
    remainingBalance: Math.max(0, safeNumber(order.remainingBalance ?? order.remaining_balance ?? Math.max(0, safeNumber(order.outstandingBalance ?? order.outstanding_balance) - safeNumber(order.amountDueNow ?? order.amount_due_now)))),
    depositRequired: Boolean(order.depositRequired ?? order.deposit_required),
    paymentStage: clean(order.paymentStage || order.payment_stage || 'initial'),
    paymentProvider: clean(order.paymentProvider || order.payment_provider),
    paymentReference: clean(order.paymentReference || order.payment_reference),
    lastPaymentAt: order.lastPaymentAt || order.last_payment_at || null,
    lastRefundAt: order.lastRefundAt || order.last_refund_at || null,
    deliveredAt: order.deliveredAt || order.delivered_at || null,
    paymentExpiresAt: order.paymentExpiresAt || order.payment_expires_at || null,
    shippingQuoteExpiresAt: order.shippingQuoteExpiresAt || order.shipping_quote_expires_at || null,
    shippingQuoteRequired: Boolean(order.shippingQuoteRequired ?? order.shipping_quote_required),
    deliveryProfile: clean(order.deliveryProfile || order.delivery_profile || 'standard'),
    paymentStatus: clean(order.paymentStatus || order.payment_status || 'pending').toLowerCase(),
    orderStatus: clean(order.orderStatus || order.order_status || 'received').toLowerCase(),
    fulfillmentStatus: clean(
      order.fulfillmentStatus || order.fulfillment_status || 'unfulfilled',
    ).toLowerCase(),
    customer: order.customer || {},
    shipping: order.shipping || order.shipping_summary || null,
    shippingRate: order.shippingRate || order.shipping_rate || null,
    items,
    source: order.source || 'local',
    syncState: order.syncState || 'local-only',
  };
}

function parseStored(raw) {
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed.orders) ? parsed.orders : [];
  return list.filter(Boolean).map(normalizeOrder);
}

export function readLocalOrders() {
  if (!allowLocalOrderStorage) return { orders: [], error: null };
  if (!storageAvailable()) return { orders: [], error: new Error('storage_unavailable') };
  try {
    let orders = parseStored(localStorage.getItem(STORAGE_KEY));
    if (!orders.length) {
      for (const legacy of LEGACY_KEYS) {
        const migrated = parseStored(localStorage.getItem(legacy));
        if (migrated.length) {
          orders = migrated;
          writeLocalOrders(orders);
          break;
        }
      }
    }
    return { orders, error: null };
  } catch (error) {
    return { orders: [], error: new Error('storage_corrupted', { cause: error }) };
  }
}

export function writeLocalOrders(orders) {
  if (!allowLocalOrderStorage) return { ok: false, error: new Error('local_order_storage_disabled') };
  if (!storageAvailable()) return { ok: false, error: new Error('storage_unavailable') };
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, orders: orders.slice(0, MAX_ORDERS) }),
    );
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error };
  }
}

function saveLocal(order) {
  const current = readLocalOrders();
  const duplicate = current.orders.find(
    (item) =>
      item.idempotencyKey === order.idempotencyKey ||
      (order.orderNumber && item.orderNumber === order.orderNumber),
  );
  if (duplicate) return { order: duplicate, duplicate: true, error: current.error };
  const write = writeLocalOrders([order, ...current.orders]);
  return { order, duplicate: false, error: write.error || current.error };
}

async function invokeOrderFunction(name, body) {
  const supabase = await getSupabase();
  if (!supabase) return { data: null, error: new Error('cloud_unconfigured') };
  const { data, error } = await supabase.functions.invoke(name, { body });
  return { data, error: error || null };
}

function orderIdentity(order) {
  return clean(
    order?.idempotencyKey ||
      order?.idempotency_key ||
      order?.orderNumber ||
      order?.order_number,
  );
}

function mergeOrderLists(...groups) {
  const merged = new Map();
  groups.flat().filter(Boolean).forEach((raw) => {
    const order = normalizeOrder(raw);
    const key = orderIdentity(order) || order.id;
    const current = merged.get(key);
    const orderTime = Number(new Date(order.updatedAt || order.createdAt));
    const currentTime = current
      ? Number(new Date(current.updatedAt || current.createdAt))
      : Number.NEGATIVE_INFINITY;
    const orderIsSynced = order.syncState === 'synced' || order.source === 'cloud';
    const currentIsSynced = current?.syncState === 'synced' || current?.source === 'cloud';
    if (
      !current ||
      orderTime > currentTime ||
      (orderTime === currentTime && orderIsSynced && !currentIsSynced)
    ) {
      merged.set(key, order);
    }
  });
  return [...merged.values()]
    .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
    .slice(0, MAX_ORDERS);
}

async function readCloudOrderHistory(userId) {
  const supabase = await getSupabase();
  if (!supabase || !userId) throw new Error('cloud_unconfigured');
  const { data, error } = await supabase
    .from('user_state')
    .select('preferences')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  const preferences =
    data?.preferences && typeof data.preferences === 'object' ? data.preferences : {};
  const orders = Array.isArray(preferences[CLOUD_ORDER_HISTORY_KEY])
    ? preferences[CLOUD_ORDER_HISTORY_KEY]
    : [];
  return orders.map((order) =>
    normalizeOrder({ ...order, userId, source: 'cloud', syncState: 'synced' }),
  );
}

async function writeCloudOrderHistory(userId, orders) {
  const supabase = await getSupabase();
  if (!supabase || !userId) throw new Error('cloud_unconfigured');
  const { data: current, error: readError } = await supabase
    .from('user_state')
    .select('preferences')
    .eq('user_id', userId)
    .maybeSingle();
  if (readError) throw readError;
  const existingPreferences =
    current?.preferences && typeof current.preferences === 'object' ? current.preferences : {};
  const preferences = {
    ...existingPreferences,
    [CLOUD_ORDER_HISTORY_KEY]: mergeOrderLists(orders).map((order) => ({
      ...order,
      source: 'cloud',
      syncState: 'synced',
    })),
  };
  let query;
  if (current) {
    query = supabase
      .from('user_state')
      .update({ preferences, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  } else {
    query = supabase.from('user_state').upsert(
      {
        user_id: userId,
        cart: [],
        wishlist: [],
        compare: [],
        recently_viewed: [],
        preferences,
        version: 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  }
  const { error } = await query;
  if (error) throw error;
  return preferences[CLOUD_ORDER_HISTORY_KEY];
}

async function saveCloudHistoryOrder(order) {
  if (!order.userId) throw new Error('user_required');
  const existing = await readCloudOrderHistory(order.userId);
  const synced = normalizeOrder({ ...order, source: 'cloud', syncState: 'synced' });
  await writeCloudOrderHistory(order.userId, mergeOrderLists(synced, existing));
  return synced;
}

export async function createOrder(input, options = {}) {
  const candidate = normalizeOrder({
    ...input,
    idempotencyKey: input.idempotencyKey || options.idempotencyKey,
  });
  if (!candidate.orderNumber || !candidate.email || !candidate.items.length)
    throw new Error('invalid_order');
  const isCash = ['cash', 'cash_on_delivery', 'cod'].includes(candidate.paymentMethod);
  const allowLocalPendingQuote = Boolean(options.allowPending && candidate.shippingQuoteRequired);
  if (options.cloud !== false) {
    const payload = {
      idempotencyKey: candidate.idempotencyKey,
      currency: candidate.currency,
      paymentMethod: candidate.paymentMethod,
      email: candidate.email,
      shipping: {
        ...(candidate.shipping || {}),
        paymentPlan: candidate.paymentPlan,
        shippingQuoteRequired: candidate.shippingQuoteRequired,
        deliveryProfile: candidate.deliveryProfile,
        displayCurrency: candidate.displayCurrency,
        allReadyToShip: candidate.deliveryProfile === 'ready',
      },
      items: candidate.items.map((item) => ({
        productId: item.id,
        variantId: item.sku ? `${item.id}:${item.sku}` : `${item.type}:${item.id}`,
        quantity: item.quantity,
        registrationId: item.registrationId || null,
        purchaseMode: item.purchaseMode || 'retail',
      })),
    };
    const cloud = await invokeOrderFunction(
      candidate.userId ? 'create-order' : 'create-guest-order',
      payload,
    );
    if (!cloud.error && cloud.data?.order) {
      const serverOrder = cloud.data.order;
      const order = normalizeOrder({
        ...candidate,
        ...serverOrder,
        orderNumber: serverOrder.order_number || serverOrder.orderNumber || candidate.orderNumber,
        idempotencyKey:
          serverOrder.idempotency_key || serverOrder.idempotencyKey || candidate.idempotencyKey,
        items: serverOrder.order_items || serverOrder.items_snapshot || candidate.items,
        displayCurrency: candidate.displayCurrency,
        displaySubtotal: candidate.displaySubtotal,
        displayShippingTotal: candidate.displayShippingTotal,
        displayTotal: candidate.displayTotal,
        customer: candidate.customer,
        shipping: serverOrder.shipping_summary || candidate.shipping,
        shippingRate: candidate.shippingRate,
        source: 'cloud',
        syncState: 'synced',
      });
      if (allowLocalOrderStorage) saveLocal(order);
      if (candidate.userId) {
        try {
          await saveCloudHistoryOrder(order);
        } catch {}
      }
      return { order, source: 'cloud', duplicate: Boolean(cloud.data.duplicate), warning: null };
    }
    if (!allowLocalOrderStorage) throw new Error('cloud_order_creation_failed', { cause: cloud.error });
    if (!isCash && !allowLocalPendingQuote) throw new Error('cloud_order_creation_failed', { cause: cloud.error });
    const local = saveLocal({ ...candidate, source: 'local', syncState: 'local-only' });
    return { order: local.order, source: 'local', duplicate: local.duplicate, warning: 'development_only_local_order' };
  }
  if (!allowLocalOrderStorage) throw new Error('cloud_order_creation_required');
  if (!isCash && !allowLocalPendingQuote) throw new Error('online_payment_requires_server');
  const local = saveLocal({ ...candidate, source: 'local', syncState: 'local-only' });
  if (local.error && !local.order) throw local.error;
  return {
    order: local.order,
    source: 'local',
    duplicate: local.duplicate,
    warning: local.error ? 'local_storage_issue' : null,
  };
}

function mapCloudOrder(row) {
  return normalizeOrder({
    ...row,
    orderNumber: row.order_number,
    idempotencyKey: row.idempotency_key,
    userId: row.user_id,
    email: row.customer_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    displayCurrency: row.display_currency || row.displayCurrency || row.currency,
    displaySubtotal: row.display_subtotal ?? row.displaySubtotal,
    displayShippingTotal: row.display_shipping_total ?? row.displayShippingTotal,
    displayTotal: row.display_total ?? row.displayTotal,
    shippingTotal: row.shipping_total,
    taxTotal: row.tax_total,
    discountTotal: row.discount_total,
    paymentMethod: row.payment_method,
    paymentPlan: row.payment_plan,
    amountPaid: row.amount_paid,
    amountRefunded: row.amount_refunded,
    amountDueNow: row.amount_due_now,
    outstandingBalance: row.outstanding_balance,
    remainingBalance: row.remaining_balance,
    depositRequired: row.deposit_required,
    paymentStage: row.payment_stage,
    paymentProvider: row.payment_provider,
    paymentReference: row.payment_reference,
    lastPaymentAt: row.last_payment_at,
    lastRefundAt: row.last_refund_at,
    deliveredAt: row.delivered_at,
    paymentExpiresAt: row.payment_expires_at,
    shippingQuoteExpiresAt: row.shipping_quote_expires_at,
    shippingQuoteRequired: row.shipping_quote_required,
    deliveryProfile: row.delivery_profile,
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    fulfillmentStatus: row.fulfillment_status,
    customer: row.customer_summary || row.customer || {},
    shipping: row.shipping_summary,
    items: row.order_items || row.items_snapshot || [],
    source: 'cloud',
    syncState: 'synced',
  });
}

export async function getMyOrders(userId) {
  if (!userId) return { state: 'success', orders: [], source: 'none', error: null };
  const local = readLocalOrders();
  const localOrders = local.orders.filter((order) => order.userId === userId);
  const supabase = await getSupabase();
  if (!supabase)
    return {
      state: local.error ? 'error' : localOrders.length ? 'partial' : 'success',
      orders: localOrders,
      source: 'local',
      error: local.error || (localOrders.length ? new Error('cloud_unconfigured') : null),
    };

  let tableOrders = [];
  let historyOrders = [];
  let tableError = null;
  let historyError = null;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    tableOrders = (data || []).map(mapCloudOrder);
  } catch (error) {
    tableError = error;
  }
  try {
    historyOrders = await readCloudOrderHistory(userId);
  } catch (error) {
    historyError = error;
  }

  let cloudOrders = mergeOrderLists(tableOrders, historyOrders);
  const localOnly = localOrders.filter(
    (localOrder) =>
      !cloudOrders.some(
        (cloudOrder) =>
          cloudOrder.idempotencyKey === localOrder.idempotencyKey ||
          (localOrder.orderNumber && cloudOrder.orderNumber === localOrder.orderNumber),
      ),
  );

  if (!historyError && localOnly.length) {
    try {
      const promoted = localOnly.map((order) =>
        normalizeOrder({ ...order, userId, source: 'cloud', syncState: 'synced' }),
      );
      await writeCloudOrderHistory(userId, mergeOrderLists(promoted, cloudOrders));
      cloudOrders = mergeOrderLists(promoted, cloudOrders);
      const allLocal = readLocalOrders();
      if (!allLocal.error) {
        const promotedKeys = new Set(promoted.map((order) => orderIdentity(order)));
        writeLocalOrders(
          allLocal.orders.map((order) =>
            promotedKeys.has(orderIdentity(order))
              ? normalizeOrder({ ...order, source: 'cloud', syncState: 'synced' })
              : order,
          ),
        );
      }
    } catch (error) {
      historyError = error;
    }
  }

  const merged = mergeOrderLists(cloudOrders, localOrders);
  const cloudAvailable = !historyError || !tableError;
  const cloudHasData = cloudOrders.length > 0;
  const error = local.error || (cloudAvailable ? null : historyError || tableError);
  return {
    state: error ? (merged.length ? 'partial' : 'error') : 'success',
    orders: merged,
    source: cloudHasData ? (localOrders.length ? 'mixed' : 'cloud') : 'local',
    error,
  };
}

export async function lookupGuestOrder(orderNumber, email = '', turnstileToken = '', accessToken = '') {
  const number = clean(orderNumber).toUpperCase();
  const normalizedEmail = emailKey(email);
  if (!number || (!normalizedEmail && !accessToken))
    return { state: 'invalid', order: null, source: 'none', error: null, accessToken: '' };
  try {
    const response = await fetch('/api/guest-order-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ orderNumber: number, email: normalizedEmail, turnstileToken, accessToken }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.error || `guest_order_lookup_failed:${response.status}`);
      error.status = response.status;
      return { state: response.status === 400 ? 'invalid' : 'error', order: null, source: 'none', error, accessToken: '' };
    }
    if (data?.order) {
      return {
        state: 'success',
        order: normalizeOrder({ ...data.order, source: 'cloud', syncState: 'synced' }),
        source: 'cloud',
        error: null,
        accessToken: clean(data.accessToken),
        expiresAt: data.expiresAt || null,
      };
    }
  } catch (error) {
    if (!allowLocalOrderStorage) return { state: 'error', order: null, source: 'none', error, accessToken: '' };
  }
  if (allowLocalOrderStorage && normalizedEmail) {
    const local = readLocalOrders();
    const order = local.orders.find((item) => clean(item.orderNumber).toUpperCase() === number && emailKey(item.email) === normalizedEmail) || null;
    if (order) return { state: 'success', order, source: 'local', error: local.error, accessToken: '' };
  }
  return { state: 'not-found', order: null, source: 'none', error: null, accessToken: '' };
}

export async function getOrderDetails({ orderNumber, userId, email = '', turnstileToken = '', accessToken = '' }) {
  const number = clean(orderNumber).toUpperCase();
  if (!number) return { state: 'not-found', order: null, error: null, accessToken: '' };
  if (userId) {
    const result = await getMyOrders(userId);
    const order = result.orders.find((item) => clean(item.orderNumber).toUpperCase() === number) || null;
    return { ...result, state: order ? result.state : 'not-found', order, accessToken: '' };
  }
  if (!email && !accessToken) return { state: 'verification-required', order: null, error: null, accessToken: '' };
  return lookupGuestOrder(number, email, turnstileToken, accessToken);
}
