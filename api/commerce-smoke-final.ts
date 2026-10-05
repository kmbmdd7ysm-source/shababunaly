import crypto from 'node:crypto';
import { deleteBlobJson } from './_blob-store.js';
import {
  createSessionToken,
  orderPath,
  userOrderIndexPath,
} from './_customer-session.js';
import {
  createNativeOrder,
  listNativeOrdersForUser,
  readNativeOrder,
} from './_native-orders.js';
import {
  createGuestOrderToken,
  verifyGuestOrderToken,
} from './_guest-order-token.js';

type ApiReq = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};
type ApiRes = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => { json: (body: unknown) => unknown };
};

const CENTER_VISION_API = (
  process.env.CENTER_VISION_API_BASE_URL ||
  'https://br-sweet-mountain-b46pgqvs-centerapi.compute.c-6.us-east-2.aws.neon.tech/api'
).replace(/\/$/, '');

export default async function handler(req: ApiReq, res: ApiRes) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const email = 'shababuna-commerce-smoke@example.com';
  const userId = `qa-${crypto.randomUUID()}`;
  const idempotencyKey = crypto.randomUUID();
  let orderNumber = '';
  let cleaned = false;

  try {
    const sessionToken = createSessionToken({ id: userId, email });
    const orderReq = {
      headers: {
        cookie: `shababuna_customer_session=${sessionToken}`,
      },
    };

    const created = await createNativeOrder(orderReq, {
      idempotencyKey,
      currency: 'USD',
      paymentMethod: 'cash',
      email,
      shipping: {
        country: 'LY',
        paymentPlan: 'full',
        displayCurrency: 'USD',
        customer: {
          name: 'Shababuna Commerce Smoke',
          email,
        },
      },
      items: [
        {
          productId: 's001',
          variantId: 's001:SHA-GAME-PRO-BLACK-M',
          quantity: 1,
          purchaseMode: 'retail',
        },
      ],
    });

    orderNumber = created.order.order_number;
    const direct = await readNativeOrder(orderNumber);
    const mine = await listNativeOrdersForUser(userId);
    const guestToken = createGuestOrderToken({
      orderNumber,
      email,
      ttlSeconds: 600,
    });
    const guest = verifyGuestOrderToken(guestToken, orderNumber);

    const liveResponse = await fetch(`${CENTER_VISION_API}/v1/health/live`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12_000),
    });
    const liveBody = await liveResponse.json().catch(() => ({}));

    const checks = {
      nativeOrderCreated: Boolean(created.order?.order_number),
      blobOrderRead: direct?.order_number === orderNumber,
      accountOrderIndex: mine.some((row) => row.order_number === orderNumber),
      guestLookupToken:
        Boolean(guest) &&
        guest?.orderNumber === orderNumber,
      centerVisionLive:
        liveResponse.ok &&
        Boolean(
          liveBody &&
          typeof liveBody === 'object' &&
          'status' in liveBody &&
          (liveBody as { status?: unknown }).status === 'ok',
        ),
    };

    const allPassed = Object.values(checks).every(Boolean);
    return res.status(allPassed ? 200 : 503).json({
      ok: allPassed,
      checks,
      order: {
        orderNumber,
        total: created.order.total,
        amountDueNow: created.order.amount_due_now,
        paymentPlan: created.order.payment_plan,
        paymentStatus: created.order.payment_status,
        orderStatus: created.order.order_status,
      },
      centerVision: liveBody,
      cleanupScheduled: true,
    });
  } catch (error: unknown) {
    return res.status(503).json({
      ok: false,
      error:
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message || 'commerce_smoke_failed')
          : 'commerce_smoke_failed',
      orderNumber,
    });
  } finally {
    if (orderNumber) {
      await Promise.allSettled([
        deleteBlobJson(orderPath(orderNumber)),
        deleteBlobJson(`orders/idempotency/${idempotencyKey}.json`),
        deleteBlobJson(userOrderIndexPath(userId)),
      ]);
      cleaned = true;
      void cleaned;
    }
  }
}
