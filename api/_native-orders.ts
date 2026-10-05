import crypto from 'node:crypto';
import { products } from '../src/data/products.ts';
import { commerceConfig } from '../src/config/commerce.ts';
import { mutateBlobJson, readBlobJson, writeBlobJson } from './_blob-store.js';
import {
  orderPath,
  sessionFromRequest,
  userOrderIndexPath,
  type CustomerSession,
} from './_customer-session.js';

type Row = Record<string, unknown>;
type ApiReq = { headers?: Record<string, string | string[] | undefined> };

const clean = (value: unknown, max = 5000): string =>
  String(value ?? '').replace(/\0/g, '').trim().slice(0, max);
const number = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const money = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
const nameEn = (value: unknown): string =>
  typeof value === 'string'
    ? value
    : value && typeof value === 'object' && 'en' in value
      ? clean((value as { en?: unknown }).en, 500)
      : '';
const idemPath = (key: string): string =>
  `orders/idempotency/${key.replace(/[^A-Za-z0-9._-]/g, '')}.json`;

function productById(id: string): Row | null {
  return ((products as unknown as Row[]).find((entry) => clean(entry.id) === id) || null) as Row | null;
}

function trustedLine(input: Row): Row {
  const productId = clean(input.productId, 180);
  const variantId = clean(input.variantId, 260);
  const quantity = Math.trunc(number(input.quantity));
  const purchaseMode = clean(input.purchaseMode || 'retail', 20).toLowerCase();
  if (!productId || !variantId || quantity < 1 || quantity > 999) throw new Error('invalid_items');
  if (!['retail', 'wholesale', 'custom'].includes(purchaseMode)) throw new Error('invalid_items');

  const product = productById(productId);
  if (!product || product.available === false || product.comingSoon === true) {
    throw new Error('product_unavailable');
  }
  const variants = Array.isArray(product.variants) ? (product.variants as Row[]) : [];
  const variant = variants.find(
    (entry) => `${productId}:${clean(entry.sku)}` === variantId,
  );
  if (!variant || variant.active === false) throw new Error('variant_unavailable');

  const inventoryTracking =
    variant.inventoryTracking === true ||
    (variant.inventoryTracking == null && product.inventoryTracking === true);
  const stock = Math.max(0, Math.trunc(number(variant.stock)));
  if (inventoryTracking && quantity > stock) throw new Error('insufficient_stock');

  const retailAvailable = product.quoteOnly !== true && product.retailAvailable !== false;
  const wholesaleAvailable = product.quoteOnly !== true && product.wholesaleAvailable === true;
  if (purchaseMode === 'retail' && !retailAvailable) throw new Error('retail_unavailable');
  if (purchaseMode === 'wholesale' && !wholesaleAvailable) throw new Error('wholesale_unavailable');

  const wholesaleMin = Math.max(1, Math.trunc(number(product.wholesaleMin ?? product.minimumOrder, 1)));
  if (purchaseMode === 'wholesale' && quantity < wholesaleMin) throw new Error('minimum_quantity_not_met');

  const retailPrice = number(variant.unitPrice ?? product.price);
  const wholesalePrice = number(variant.wholesalePrice ?? product.wholesalePrice, retailPrice);
  const unitPrice = purchaseMode === 'wholesale' ? wholesalePrice : retailPrice;
  if (!(unitPrice > 0) && product.quoteOnly !== true) throw new Error('price_unavailable');

  const readyToShip = variant.readyToShip === true || product.readyToShip === true;
  const reservationAvailable = product.reservationAvailable === true;
  const sku = clean(variant.sku, 160);
  const color = clean(variant.color, 120);
  const size = clean(variant.size, 120);
  const lineTotal = money(unitPrice * quantity);

  return {
    product_id: productId,
    variant_id: variantId,
    sku,
    product_name: nameEn(product.name) || clean(product.slug, 300) || productId,
    quantity,
    unit_price: money(unitPrice),
    line_total: lineTotal,
    purchase_mode: purchaseMode,
    variant_snapshot: {
      sku,
      color: color || null,
      size: size || null,
      readyToShip,
      reservationAvailable,
      deliveryProfile: clean(
        product.deliveryProfile || (readyToShip ? 'ready' : reservationAvailable ? 'standard' : 'standard'),
        40,
      ),
      inventoryTracking,
    },
  };
}

function newOrderNumber(): string {
  const now = new Date();
  const date =
    `${now.getUTCFullYear()}` +
    String(now.getUTCMonth() + 1).padStart(2, '0') +
    String(now.getUTCDate()).padStart(2, '0');
  return `SHB-${date}-${String(crypto.randomInt(0, 10_000_000)).padStart(7, '0')}`;
}

function displayValues(shipping: Row, fallback: Row) {
  return {
    display_currency: clean(shipping.displayCurrency || fallback.currency || 'USD', 8).toUpperCase(),
    display_subtotal: number(shipping.displaySubtotal, number(fallback.subtotal)),
    display_shipping_total: number(shipping.displayShippingTotal, number(fallback.shipping_total)),
    display_total: number(shipping.displayTotal, number(fallback.total)),
    display_amount_due_now: number(shipping.displayAmountDueNow, number(fallback.amount_due_now)),
    display_remaining_balance: number(
      shipping.displayRemainingBalance,
      number(fallback.remaining_balance),
    ),
  };
}

export type NativeOrder = Row & {
  id: string;
  order_number: string;
  customer_email: string;
  order_items: Row[];
};

export async function createNativeOrder(
  req: ApiReq,
  body: Row,
): Promise<{ order: NativeOrder; duplicate: boolean; session: CustomerSession | null }> {
  const idempotencyKey = clean(body.idempotencyKey, 64);
  if (!/^[0-9a-f-]{36}$/i.test(idempotencyKey)) throw new Error('invalid_order');

  const prior = await readBlobJson<{ orderNumber?: string }>(idemPath(idempotencyKey));
  if (prior.value?.orderNumber) {
    const existing = await readNativeOrder(prior.value.orderNumber);
    if (existing) return { order: existing, duplicate: true, session: sessionFromRequest(req) };
  }

  const email = clean(body.email, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('invalid_order');
  const session = sessionFromRequest(req);
  if (session?.email && session.email !== email) throw new Error('email_mismatch');

  const rawItems = Array.isArray(body.items) ? (body.items as Row[]) : [];
  if (!rawItems.length || rawItems.length > 50) throw new Error('invalid_items');
  const items = rawItems.map(trustedLine);
  const subtotal = money(items.reduce((sum, item) => sum + number(item.line_total), 0));

  const shipping = body.shipping && typeof body.shipping === 'object' ? (body.shipping as Row) : {};
  const customer =
    shipping.customer && typeof shipping.customer === 'object'
      ? (shipping.customer as Row)
      : {};
  const country = clean(shipping.country, 2).toUpperCase();
  const digitalOnly = shipping.digital === true;
  const customOrder = items.some((item) => clean(item.purchase_mode) === 'custom');
  const allReady = items.every(
    (item) => ((item.variant_snapshot || {}) as Row).readyToShip === true,
  );
  const hasReservation = items.some(
    (item) => ((item.variant_snapshot || {}) as Row).reservationAvailable === true,
  );

  let shippingQuoteRequired = false;
  let shippingTotal = 0;
  if (!digitalOnly) {
    if (customOrder || (country && country !== 'LY')) {
      shippingQuoteRequired = true;
      shippingTotal = 0;
    } else if (country === 'LY') {
      shippingTotal = subtotal >= 70
        ? 0
        : money(20 / commerceConfig.fallbackUsdToLydRate);
    } else {
      throw new Error('invalid_shipping_country');
    }
  }

  const paymentMethod = clean(body.paymentMethod, 40).toLowerCase();
  if (!['cash', 'cash_on_delivery', 'bank_transfer', 'online', 'online_card', 'libyan_bank_card'].includes(paymentMethod)) {
    throw new Error('invalid_payment_method');
  }
  const manual = ['cash', 'cash_on_delivery', 'bank_transfer'].includes(paymentMethod);
  if (manual && country !== 'LY' && !digitalOnly) throw new Error('cash_available_only_in_libya');

  let paymentPlan = shippingQuoteRequired
    ? 'pending_shipping_quote'
    : clean(shipping.paymentPlan || 'full', 40).toLowerCase();
  if (!['half', 'full', 'pending_shipping_quote'].includes(paymentPlan)) paymentPlan = 'full';
  if (!hasReservation && paymentPlan === 'half') paymentPlan = 'full';
  if (!manual && paymentPlan === 'half') paymentPlan = 'full';

  const total = money(subtotal + shippingTotal);
  const amountDueNow = paymentPlan === 'pending_shipping_quote'
    ? 0
    : paymentPlan === 'half'
      ? money(total * 0.5)
      : total;
  const remainingBalance = money(Math.max(0, total - amountDueNow));
  const deliveryProfile = shippingQuoteRequired
    ? 'international_pending'
    : digitalOnly
      ? 'digital'
      : allReady && !hasReservation
        ? 'ready'
        : hasReservation
          ? 'standard'
          : 'standard';
  const createdAt = new Date().toISOString();
  const orderNumber = newOrderNumber();

  const base: Row = {
    subtotal,
    shipping_total: shippingTotal,
    tax_total: 0,
    discount_total: 0,
    total,
    amount_paid: 0,
    amount_refunded: 0,
    amount_due_now: amountDueNow,
    outstanding_balance: total,
    remaining_balance: remainingBalance,
    currency: 'USD',
  };

  const order: NativeOrder = {
    id: crypto.randomUUID(),
    order_number: orderNumber,
    idempotency_key: idempotencyKey,
    user_id: session?.id || null,
    customer_email: email,
    customer_name: clean(customer.name, 180),
    customer_phone: clean(customer.phone, 80),
    currency: 'USD',
    subtotal,
    shipping_total: shippingTotal,
    tax_total: 0,
    discount_total: 0,
    total,
    payment_method: paymentMethod === 'cash_on_delivery' ? 'cash' : paymentMethod,
    payment_plan: paymentPlan,
    amount_paid: 0,
    amount_refunded: 0,
    amount_due_now: amountDueNow,
    outstanding_balance: total,
    remaining_balance: remainingBalance,
    payment_stage: shippingQuoteRequired ? 'shipping_quote' : 'initial',
    payment_provider: null,
    payment_status: shippingQuoteRequired ? 'shipping_quote_pending' : 'pending',
    order_status: shippingQuoteRequired
      ? 'pending_shipping_quote'
      : manual
        ? 'confirmed'
        : 'awaiting_payment',
    fulfillment_status: 'unfulfilled',
    shipping_quote_required: shippingQuoteRequired,
    delivery_profile: deliveryProfile,
    shipping_summary: {
      ...shipping,
      customer: { ...customer, email },
      country,
      paymentPlan,
      shippingQuoteRequired,
      deliveryProfile,
      allReadyToShip: allReady && !hasReservation,
    },
    customer_summary: { ...customer, email },
    order_items: items,
    items_snapshot: items,
    created_at: createdAt,
    updated_at: createdAt,
    delivered_at: null,
    ...displayValues(shipping, base),
  };

  await writeBlobJson(orderPath(orderNumber), order, { allowOverwrite: false });
  try {
    await writeBlobJson(
      idemPath(idempotencyKey),
      { orderNumber, createdAt },
      { allowOverwrite: false },
    );
  } catch {
    const nowPrior = await readBlobJson<{ orderNumber?: string }>(idemPath(idempotencyKey));
    if (nowPrior.value?.orderNumber && nowPrior.value.orderNumber !== orderNumber) {
      const existing = await readNativeOrder(nowPrior.value.orderNumber);
      if (existing) return { order: existing, duplicate: true, session };
    }
  }

  if (session?.id) {
    await mutateBlobJson<string[]>(userOrderIndexPath(session.id), [], (current) => {
      const list = Array.isArray(current) ? current.filter((item) => item !== orderNumber) : [];
      return [orderNumber, ...list].slice(0, 100);
    });
  }
  return { order, duplicate: false, session };
}

export async function readNativeOrder(orderNumber: unknown): Promise<NativeOrder | null> {
  const value = clean(orderNumber, 80).toUpperCase();
  if (!/^SHB-\d{8}-\d{7}$/.test(value)) return null;
  const { value: order } = await readBlobJson<NativeOrder>(orderPath(value));
  return order || null;
}

export async function listNativeOrdersForUser(userId: string): Promise<NativeOrder[]> {
  const { value } = await readBlobJson<string[]>(userOrderIndexPath(userId));
  const numbers = Array.isArray(value) ? value.slice(0, 100) : [];
  const rows = await Promise.all(numbers.map((orderNumber) => readNativeOrder(orderNumber)));
  return rows.filter((row): row is NativeOrder => Boolean(row));
}
