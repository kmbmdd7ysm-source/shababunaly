import crypto from 'node:crypto';
import { createNativeOrder, readNativeOrder } from './_native-orders.js';
import {
  createGuestOrderToken,
  verifyGuestOrderToken,
} from './_guest-order-token.js';

type ApiReq = { method?: string };
type ApiRes = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => { json: (body: unknown) => unknown };
};

export default async function handler(req: ApiReq, res: ApiRes) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const email = 'shababuna-commerce-smoke@example.com';
  const idempotencyKey = crypto.randomUUID();

  try {
    const created = await createNativeOrder(
      { headers: {} },
      {
        idempotencyKey,
        currency: 'USD',
        paymentMethod: 'cash',
        email,
        shipping: {
          country: 'LY',
          paymentPlan: 'half',
          displayCurrency: 'USD',
          customer: {
            name: 'Shababuna Commerce Smoke',
            email,
          },
        },
        items: [
          {
            productId: 'goat-nike-kobe-4-protro-philly-2024',
            variantId:
              'goat-nike-kobe-4-protro-philly-2024:GOAT-K04-05-LISTED-COLORWAY-12',
            quantity: 1,
            purchaseMode: 'retail',
          },
        ],
      },
    );

    const orderNumber = created.order.order_number;
    const direct = await readNativeOrder(orderNumber);
    const guestToken = createGuestOrderToken({
      orderNumber,
      email,
      ttlSeconds: 600,
    });
    const guest = verifyGuestOrderToken(guestToken, orderNumber);

    const checks = {
      nativeOrderCreated: Boolean(orderNumber),
      blobOrderRead: direct?.order_number === orderNumber,
      guestLookupToken: Boolean(guest) && guest?.orderNumber === orderNumber,
    };
    const allPassed = Object.values(checks).every(Boolean);

    return res.status(allPassed ? 200 : 503).json({
      ok: allPassed,
      checks,
      order: {
        orderNumber,
        email,
        idempotencyKey,
        total: created.order.total,
        amountDueNow: created.order.amount_due_now,
        paymentPlan: created.order.payment_plan,
        paymentStatus: created.order.payment_status,
        orderStatus: created.order.order_status,
      },
    });
  } catch (error: unknown) {
    return res.status(503).json({
      ok: false,
      error:
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message || 'commerce_smoke_failed')
          : 'commerce_smoke_failed',
    });
  }
}
