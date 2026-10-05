import crypto from 'node:crypto';
import { applyApiHeaders } from './_request-security.js';
import { deleteBlobJson, readBlobJson, writeBlobJson } from './_blob-store.js';
import {
  accountIdPath,
  accountPath,
  createSessionToken,
  hashPassword,
  verifyPassword,
  verifySessionToken,
} from './_customer-session.js';
import { createGuestOrderToken, verifyGuestOrderToken } from './_guest-order-token.js';
import { createNativeOrder, readNativeOrder } from './_native-orders.js';

type ApiReq = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
};
type ApiRes = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => { json: (body: unknown) => unknown };
};

export default async function handler(req: ApiReq, res: ApiRes) {
  applyApiHeaders(res);
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET' || String(req.query?.run || '') !== '1') {
    return res.status(404).json({ ok: false });
  }

  const cleanup: string[] = [];
  try {
    const runId = crypto.randomUUID();
    const blobPath = `smoke/${runId}.json`;
    cleanup.push(blobPath);
    await writeBlobJson(blobPath, { runId, ok: true }, { allowOverwrite: false });
    const roundTrip = await readBlobJson<{ runId?: string; ok?: boolean }>(blobPath);
    const blobRoundTrip = roundTrip.value?.runId === runId && roundTrip.value?.ok === true;

    const email = `qa-smoke-${runId}@example.com`;
    const password = `Qa-${runId}-2026!`;
    const accountId = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    const account = {
      id: accountId,
      email,
      passwordHash,
      metadata: { display_name: 'QA Smoke Test', account_type: 'customer' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailConfirmedAt: new Date().toISOString(),
    };
    cleanup.push(accountPath(email), accountIdPath(accountId));
    await writeBlobJson(accountPath(email), account, { allowOverwrite: false });
    await writeBlobJson(accountIdPath(accountId), account, { allowOverwrite: false });
    const storedAccount = await readBlobJson<typeof account>(accountPath(email));
    const passwordVerified =
      storedAccount.value?.email === email &&
      verifyPassword(password, storedAccount.value?.passwordHash);

    const sessionToken = createSessionToken({ id: accountId, email });
    const session = verifySessionToken(sessionToken);
    const sessionVerified = session?.id === accountId && session.email === email;

    const idempotencyKey = crypto.randomUUID();
    const productId = 'goat-nike-kobe-4-protro-philly-2024';
    const sku = 'GOAT-K04-05-LISTED-COLORWAY-12';
    const orderResult = await createNativeOrder(
      { headers: {} },
      {
        idempotencyKey,
        currency: 'USD',
        paymentMethod: 'cash',
        email,
        shipping: {
          country: 'LY',
          paymentPlan: 'half',
          customer: {
            name: 'QA Smoke Test',
            email,
            phone: '+218910000000',
          },
          displayCurrency: 'USD',
        },
        items: [
          {
            productId,
            variantId: `${productId}:${sku}`,
            quantity: 1,
            purchaseMode: 'retail',
          },
        ],
      },
    );
    cleanup.push(
      `orders/${orderResult.order.order_number}.json`,
      `orders/idempotency/${idempotencyKey}.json`,
    );
    const storedOrder = await readNativeOrder(orderResult.order.order_number);
    const guestToken = createGuestOrderToken({
      orderNumber: orderResult.order.order_number,
      email,
      ttlSeconds: 600,
    });
    const guestVerified = Boolean(
      verifyGuestOrderToken(guestToken, orderResult.order.order_number),
    );
    const orderVerified =
      Boolean(storedOrder) &&
      storedOrder?.customer_email === email &&
      storedOrder?.order_items?.length === 1 &&
      storedOrder?.payment_plan === 'half' &&
      Number(storedOrder?.subtotal) === 135;

    let centerVisionReachable = false;
    try {
      const base = (
        process.env.CENTER_VISION_API_BASE_URL ||
        'https://br-sweet-mountain-b46pgqvs-centerapi.compute.c-6.us-east-2.aws.neon.tech/api'
      ).replace(/\/$/, '');
      const response = await fetch(
        `${base}/v1/public/site?siteKey=SHABABUNA`,
        { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) },
      );
      centerVisionReachable = response.ok;
    } catch {
      centerVisionReachable = false;
    }

    return res.status(200).json({
      ok:
        blobRoundTrip &&
        passwordVerified &&
        sessionVerified &&
        orderVerified &&
        guestVerified &&
        centerVisionReachable,
      checks: {
        durableStorage: blobRoundTrip,
        accountPassword: passwordVerified,
        sessionCookieSigner: sessionVerified,
        trustedOrder: orderVerified,
        guestTrackingToken: guestVerified,
        centerVisionReachable,
      },
      order: {
        number: orderResult.order.order_number,
        subtotal: orderResult.order.subtotal,
        total: orderResult.order.total,
        paymentPlan: orderResult.order.payment_plan,
        shippingQuoteRequired: orderResult.order.shipping_quote_required,
      },
    });
  } catch (error: unknown) {
    return res.status(500).json({
      ok: false,
      error:
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message || 'smoke_failed')
          : 'smoke_failed',
    });
  } finally {
    await Promise.allSettled(cleanup.map((pathname) => deleteBlobJson(pathname)));
  }
}
