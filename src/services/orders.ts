type Row = Record<string, unknown>;

const STORAGE_KEY = 'shababuna-orders-v4';
const LEGACY_KEYS = ['shababuna-orders-v3', 'shababuna-orders-v2'];
const MAX_ORDERS = 50;
const SCHEMA_VERSION = 4;
const allowLocalOrderStorage = true; // Cash/pending orders can fall back locally after cloud creation fails.
const clean = (value: unknown = ''): string => String(value ?? '').trim();
const emailKey = (value: unknown = ''): string => clean(value).toLowerCase();
const safeNumber = (value: unknown): number => (Number.isFinite(Number(value)) ? Number(value) : 0);
const newId = (): string =>
  globalThis.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const createIdempotencyKey = (): string => newId();

function storageAvailable() {
  try {
    const key = '__shababuna_order_storage_test__';
    sessionStorage.setItem(key, '1');
    sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function normalizeOrder(order: Row = {}): Row {
  const shippingSummary = (order.shippingSummary || order.shipping_summary || order.shipping || {}) as Row;
  const currency = clean(order.currency || order.canonicalCurrency || 'USD').toUpperCase();
  const displayCurrency = clean(order.displayCurrency || order.display_currency || shippingSummary.displayCurrency || shippingSummary.display_currency || order.currency || 'USD').toUpperCase();
  const canonicalShippingTotal = Math.max(
    0,
    safeNumber(order.shippingTotal ?? order.shipping_total),
  );
  const originalShippingAmount = Math.max(
    0,
    safeNumber((order.shippingRate as Row | undefined)?.originalAmount ?? (order.shipping_rate as Row | undefined)?.original_amount),
  );
  const canonicalSubtotalForRate = Math.max(0, safeNumber(order.subtotal));
  const canonicalTotalForRate = Math.max(0, safeNumber(order.total));
  const storedDisplaySubtotalForRate = Math.max(
    0,
    safeNumber(
      order.displaySubtotal ??
        order.display_subtotal ??
        shippingSummary.displaySubtotal ??
        shippingSummary.display_subtotal,
    ),
  );
  const storedDisplayTotalForRate = Math.max(
    0,
    safeNumber(
      order.displayTotal ??
        order.display_total ??
        shippingSummary.displayTotal ??
        shippingSummary.display_total,
    ),
  );
  const inferredDisplayRate =
    displayCurrency !== currency && canonicalSubtotalForRate > 0 && storedDisplaySubtotalForRate > 0
      ? storedDisplaySubtotalForRate / canonicalSubtotalForRate
      : displayCurrency !== currency && canonicalTotalForRate > 0 && storedDisplayTotalForRate > 0
        ? storedDisplayTotalForRate / canonicalTotalForRate
        : displayCurrency !== currency && canonicalShippingTotal > 0 && originalShippingAmount > 0
          ? originalShippingAmount / canonicalShippingTotal
          : 1;
  const needsLegacyDisplayRepair = (displayValue: unknown, canonicalValue: unknown): boolean =>
    displayCurrency !== currency &&
    inferredDisplayRate > 1.01 &&
    Math.abs(safeNumber(displayValue) - safeNumber(canonicalValue)) < 0.01;
  const repairedDisplayValue = (displayValue: unknown, canonicalValue: unknown): number =>
    needsLegacyDisplayRepair(displayValue, canonicalValue)
      ? safeNumber(canonicalValue) * inferredDisplayRate
      : safeNumber(displayValue);
  const items = Array.isArray(order.items)
    ? (order.items as Row[]).map((item: Row) => ({
        id: item.id || item.productId || item.product_id || null,
        type: item.type || item.fulfillment_type || null,
        fulfillmentType: item.fulfillmentType || item.fulfillment_type || null,
        registrationId: item.registrationId || item.registration_id || null,
        purchaseMode: clean(item.purchaseMode || item.purchase_mode || 'retail').toLowerCase(),
        customizable: Boolean(item.customizable || item.isCustom || item.is_custom),
        readyToShip: Boolean(item.readyToShip ?? item.ready_to_ship),
        reservationAvailable: Boolean(item.reservationAvailable ?? item.reservation_available),
        sku: item.sku || null,
        variantId:
          item.variantId ||
          item.variant_id ||
          ((item.id || item.productId || item.product_id) && item.sku
            ? `${item.id || item.productId || item.product_id}:${item.sku}`
            : item.sku || null),
        name:
          typeof item.name === 'object'
            ? String((item.name as Row).en || (item.name as Row).ar || '')
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
      order.email || order.customerEmail || order.customer_email || (order.customer as Row | undefined)?.email,
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
          shippingSummary.displaySubtotal ??
          shippingSummary.display_subtotal ??
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
          shippingSummary.displayShippingTotal ??
          shippingSummary.display_shipping_total ??
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
        order.displayTotal ?? order.display_total ?? shippingSummary.displayTotal ?? shippingSummary.display_total ?? safeNumber(order.total) * inferredDisplayRate,
        order.total,
      ),
    ),
    paymentMethod: clean(
      shippingSummary.manualPaymentMethod ||
        shippingSummary.manual_payment_method ||
        order.paymentMethod ||
        order.payment_method ||
        'cash_on_delivery',
    ),
    paymentPlan: clean(order.paymentPlan || order.payment_plan || 'full'),
    amountPaid: Math.max(0, safeNumber(order.amountPaid ?? order.amount_paid)),
    displayAmountPaid: Math.max(
      0,
      repairedDisplayValue(
        order.displayAmountPaid ?? order.display_amount_paid ?? shippingSummary.displayAmountPaid ?? shippingSummary.display_amount_paid ?? safeNumber(order.amountPaid ?? order.amount_paid) * inferredDisplayRate,
        order.amountPaid ?? order.amount_paid,
      ),
    ),
    amountRefunded: Math.max(0, safeNumber(order.amountRefunded ?? order.amount_refunded)),
    displayAmountRefunded: Math.max(
      0,
      repairedDisplayValue(
        order.displayAmountRefunded ?? order.display_amount_refunded ?? shippingSummary.displayAmountRefunded ?? shippingSummary.display_amount_refunded ?? safeNumber(order.amountRefunded ?? order.amount_refunded) * inferredDisplayRate,
        order.amountRefunded ?? order.amount_refunded,
      ),
    ),
    amountDueNow: Math.max(
      0,
      safeNumber(order.amountDueNow ?? order.amount_due_now ?? order.total),
    ),
    displayAmountDueNow: Math.max(
      0,
      repairedDisplayValue(
        order.displayAmountDueNow ?? order.display_amount_due_now ?? shippingSummary.displayAmountDueNow ?? shippingSummary.display_amount_due_now ?? safeNumber(order.amountDueNow ?? order.amount_due_now ?? order.total) * inferredDisplayRate,
        order.amountDueNow ?? order.amount_due_now ?? order.total,
      ),
    ),
    outstandingBalance: Math.max(
      0,
      safeNumber(
        order.outstandingBalance ??
          order.outstanding_balance ??
          order.remainingBalance ??
          order.remaining_balance,
      ),
    ),
    displayOutstandingBalance: Math.max(
      0,
      repairedDisplayValue(
        order.displayOutstandingBalance ?? order.display_outstanding_balance ?? shippingSummary.displayOutstandingBalance ?? shippingSummary.display_outstanding_balance ?? safeNumber(order.outstandingBalance ?? order.outstanding_balance ?? order.remainingBalance ?? order.remaining_balance) * inferredDisplayRate,
        order.outstandingBalance ?? order.outstanding_balance ?? order.remainingBalance ?? order.remaining_balance,
      ),
    ),
    remainingBalance: Math.max(
      0,
      safeNumber(
        order.remainingBalance ??
          order.remaining_balance ??
          Math.max(
            0,
            safeNumber(order.outstandingBalance ?? order.outstanding_balance) -
              safeNumber(order.amountDueNow ?? order.amount_due_now),
          ),
      ),
    ),
    displayRemainingBalance: Math.max(
      0,
      repairedDisplayValue(
        order.displayRemainingBalance ?? order.display_remaining_balance ?? shippingSummary.displayRemainingBalance ?? shippingSummary.display_remaining_balance ?? safeNumber(order.remainingBalance ?? order.remaining_balance ?? order.outstandingBalance ?? order.outstanding_balance) * inferredDisplayRate,
        order.remainingBalance ?? order.remaining_balance ?? order.outstandingBalance ?? order.outstanding_balance,
      ),
    ),
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

function parseStored(raw: string | null): Row[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as Row).orders)
      ? ((parsed as Row).orders as unknown[])
      : [];
  return list.filter(Boolean).map((entry) => normalizeOrder(entry as Row));
}

export function readLocalOrders(): { orders: unknown[]; error?: unknown } {
  if (!allowLocalOrderStorage) return { orders: [], error: null };
  if (!storageAvailable()) return { orders: [], error: new Error('storage_unavailable') };
  try {
    let orders = parseStored(sessionStorage.getItem(STORAGE_KEY));
    if (!orders.length) {
      for (const legacy of LEGACY_KEYS) {
        const migrated = parseStored(sessionStorage.getItem(legacy));
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

export function writeLocalOrders(orders: unknown[]): { ok: boolean; error?: unknown } {
  if (!allowLocalOrderStorage)
    return { ok: false, error: new Error('local_order_storage_disabled') };
  if (!storageAvailable()) return { ok: false, error: new Error('storage_unavailable') };
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, orders: orders.slice(0, MAX_ORDERS) }),
    );
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error };
  }
}

function saveLocal(order: Row) {
  const current = readLocalOrders();
  const duplicate = current.orders.find((item) => {
    const row = item as Row;
    return (
      row.idempotencyKey === order.idempotencyKey ||
      (Boolean(order.orderNumber) && row.orderNumber === order.orderNumber)
    );
  });
  if (duplicate) return { order: duplicate as Row, duplicate: true, error: current.error };
  const write = writeLocalOrders([order, ...current.orders]);
  return { order, duplicate: false, error: write.error || current.error };
}

async function invokeOrderApi(body: Row) {
  try {
    const response = await fetch('/api/order-intake', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as Row;
    if (!response.ok) {
      return {
        data: null,
        error: new Error(String(data.error || `order_api_failed:${response.status}`)),
      };
    }
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

function orderIdentity(order: Row) {
  return clean(
    order?.idempotencyKey || order?.idempotency_key || order?.orderNumber || order?.order_number,
  );
}

function mergeOrderLists(...groups: Array<unknown[] | Row[]>) {
  const merged = new Map<string, Row>();
  groups
    .flat()
    .filter(Boolean)
    .forEach((raw) => {
      const order = normalizeOrder(raw as Row);
      const key = String(orderIdentity(order) || order.id || '');
      const current = merged.get(key);
      const orderTime = Number(new Date(String(order.updatedAt || order.createdAt || 0)));
      const currentTime = current
        ? Number(new Date(String(current.updatedAt || current.createdAt || 0)))
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
    .sort(
      (a, b) =>
        Number(new Date(String(b.createdAt || 0))) - Number(new Date(String(a.createdAt || 0))),
    )
    .slice(0, MAX_ORDERS);
}

export async function createOrder(input: unknown, options: Row = {}): Promise<Row> {
  const inputRow = (input && typeof input === 'object' ? input : {}) as Row;
  const candidate = normalizeOrder({
    ...inputRow,
    idempotencyKey: inputRow.idempotencyKey || options.idempotencyKey,
  });
  const candidateItems = Array.isArray(candidate.items) ? (candidate.items as Row[]) : [];
  if (!candidate.orderNumber || !candidate.email || !candidateItems.length) {
    throw new Error('invalid_order');
  }

  const isManualPayment = ['cash', 'cash_on_delivery', 'cod', 'bank_transfer'].includes(
    String(candidate.paymentMethod || ''),
  );
  const allowLocalPendingQuote = Boolean(options.allowPending && candidate.shippingQuoteRequired);

  if (options.cloud !== false) {
    const payload = {
      idempotencyKey: candidate.idempotencyKey,
      currency: candidate.currency,
      paymentMethod: candidate.paymentMethod,
      email: candidate.email,
      shipping: {
        ...((candidate.shipping && typeof candidate.shipping === 'object'
          ? candidate.shipping
          : {}) as Row),
        paymentPlan: candidate.paymentPlan,
        shippingQuoteRequired: candidate.shippingQuoteRequired,
        deliveryProfile: candidate.deliveryProfile,
        displayCurrency: candidate.displayCurrency,
        displaySubtotal: candidate.displaySubtotal,
        displayShippingTotal: candidate.displayShippingTotal,
        displayTotal: candidate.displayTotal,
        displayAmountDueNow: candidate.displayAmountDueNow,
        displayRemainingBalance: candidate.displayRemainingBalance,
        displayOutstandingBalance: candidate.displayOutstandingBalance,
        displayAmountPaid: candidate.displayAmountPaid,
        displayAmountRefunded: candidate.displayAmountRefunded,
        customer: candidate.customer,
        allReadyToShip: candidate.deliveryProfile === 'ready',
      },
      items: candidateItems.map((item: Row) => ({
        productId: item.id,
        variantId: item.sku ? `${item.id}:${item.sku}` : `${item.type}:${item.id}`,
        quantity: item.quantity,
        registrationId: item.registrationId || null,
        purchaseMode: item.purchaseMode || 'retail',
      })),
    };

    const cloud = await invokeOrderApi(payload);
    if (!cloud.error && cloud.data?.order) {
      const serverOrder = cloud.data.order as Row;
      const order = normalizeOrder({
        ...candidate,
        ...serverOrder,
        orderNumber: serverOrder.order_number || serverOrder.orderNumber || candidate.orderNumber,
        idempotencyKey:
          serverOrder.idempotency_key || serverOrder.idempotencyKey || candidate.idempotencyKey,
        items: serverOrder.order_items || serverOrder.items_snapshot || candidate.items,
        customer: serverOrder.customer_summary || candidate.customer,
        shipping: serverOrder.shipping_summary || candidate.shipping,
        shippingRate: candidate.shippingRate,
        source: 'cloud',
        syncState: 'synced',
      });
      if (allowLocalOrderStorage) saveLocal(order);
      return {
        order,
        source: 'cloud',
        duplicate: Boolean(cloud.data.duplicate),
        warning: null,
        notification: cloud.data.notification || null,
        accessToken: cloud.data.guestAccessToken || cloud.data.accessToken || null,
        centerVision: cloud.data.centerVision || null,
      };
    }

    if (!isManualPayment && !allowLocalPendingQuote) {
      throw new Error('cloud_order_creation_failed', { cause: cloud.error });
    }
    const local = saveLocal({ ...candidate, source: 'local', syncState: 'local-only' });
    return {
      order: local.order,
      source: 'local',
      duplicate: local.duplicate,
      warning: 'temporary_local_order',
    };
  }

  const local = saveLocal({ ...candidate, source: 'local', syncState: 'local-only' });
  if (local.error && !local.order) throw local.error;
  return {
    order: local.order,
    source: 'local',
    duplicate: local.duplicate,
    warning: local.error ? 'local_storage_issue' : null,
  };
}

function mapCloudOrder(row: Row) {
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

export async function getMyOrders(
  userId: string,
): Promise<{ state: string; orders: Row[]; error?: unknown; source?: string }> {
  if (!userId) return { state: 'success', orders: [], source: 'none', error: null };
  const local = readLocalOrders();
  const localOrders = local.orders.filter(
    (order) => (order as Row).userId === userId,
  ) as Row[];

  try {
    const response = await fetch('/api/customer-orders', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const data = (await response.json().catch(() => ({}))) as Row;
    if (!response.ok) throw new Error(String(data.error || `orders_api_${response.status}`));
    const cloudOrders = Array.isArray(data.orders)
      ? (data.orders as Row[]).map(mapCloudOrder)
      : [];
    const merged = mergeOrderLists(cloudOrders, localOrders);
    return {
      state: local.error ? (merged.length ? 'partial' : 'error') : 'success',
      orders: merged,
      source: cloudOrders.length ? (localOrders.length ? 'mixed' : 'cloud') : 'local',
      error: local.error || null,
    };
  } catch (error) {
    return {
      state: localOrders.length ? 'partial' : 'error',
      orders: localOrders,
      source: 'local',
      error: local.error || error,
    };
  }
}

async function withCenterVisionStatus(order: Row | null, verifiedEmail: string): Promise<Row | null> {
  if (!order || !verifiedEmail) return order;
  try {
    const response = await fetch('/api/center-vision-order-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify({
        orderNumber: clean(order.orderNumber || order.order_number),
        email: emailKey(verifiedEmail),
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return order;
    const data = (await response.json()) as Row;
    if (!data.ok) return order;
    return {
      ...order,
      orderStatus: clean(data.status).toLowerCase(),
      paymentStatus: clean(data.paymentStatus).toLowerCase(),
      fulfillmentStatus: clean(data.fulfillmentStatus).toLowerCase(),
      shipment: data.shipment || null,
      centerVisionSynced: true,
    };
  } catch {
    return order;
  }
}

export async function lookupGuestOrder(
  orderNumber: string,
  email = '',
  turnstileToken = '',
  accessToken = '',
): Promise<Row> {
  const number = clean(orderNumber).toUpperCase();
  const normalizedEmail = emailKey(email);
  if (!number || (!normalizedEmail && !accessToken))
    return { state: 'invalid', order: null, source: 'none', error: null, accessToken: '' };

  let remoteError: unknown = null;
  try {
    const response = await fetch('/api/guest-order-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        orderNumber: number,
        email: normalizedEmail,
        turnstileToken,
        accessToken,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        String((data as Row)?.error || `guest_order_lookup_failed:${response.status}`),
      ) as Error & { status?: number };
      error.status = response.status;
      if (response.status === 400) {
        return {
          state: 'invalid',
          order: null,
          source: 'none',
          error,
          accessToken: '',
        };
      }
      remoteError = error;
    } else if (data?.order) {
      return {
        state: 'success',
        order: await withCenterVisionStatus(
          normalizeOrder({
            ...(data.order as Row),
            source: 'cloud',
            syncState: 'synced',
          }),
          clean(normalizedEmail || (data.order as Row).email),
        ),
        source: 'cloud',
        error: null,
        accessToken: clean(data.accessToken),
        expiresAt: data.expiresAt || null,
      };
    }
  } catch (error) {
    remoteError = error;
  }

  if (allowLocalOrderStorage && normalizedEmail) {
    const local = readLocalOrders();
    const order =
      local.orders.find((item) => {
        const row = item as Row;
        return (
          clean(row.orderNumber).toUpperCase() === number &&
          emailKey(row.email) === normalizedEmail
        );
      }) || null;
    if (order) {
      return {
        state: 'success',
        order,
        source: 'local',
        error: null,
        accessToken: '',
      };
    }
    if (local.error && !remoteError) remoteError = local.error;
  }

  if (remoteError) {
    return { state: 'error', order: null, source: 'none', error: remoteError, accessToken: '' };
  }
  return { state: 'not-found', order: null, source: 'none', error: null, accessToken: '' };
}

export async function getOrderDetails({
  orderNumber,
  userId,
  email = '',
  turnstileToken = '',
  accessToken = '',
}: {
  orderNumber?: string;
  userId?: string | null;
  email?: string;
  turnstileToken?: string;
  accessToken?: string;
}): Promise<Row> {
  const number = clean(orderNumber).toUpperCase();
  if (!number) return { state: 'not-found', order: null, error: null, accessToken: '' };
  if (userId) {
    const result = await getMyOrders(userId);
    const order =
      result.orders.find((item) => clean(item.orderNumber).toUpperCase() === number) || null;
    const currentOrder = await withCenterVisionStatus(order, clean(order?.email || email));
    return {
      ...result,
      state: order ? result.state : 'not-found',
      order: currentOrder,
      accessToken: '',
    };
  }
  if (!email && !accessToken)
    return { state: 'verification-required', order: null, error: null, accessToken: '' };
  return lookupGuestOrder(number, email, turnstileToken, accessToken);
}
