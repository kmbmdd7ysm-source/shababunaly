import crypto from 'node:crypto';

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

  const origin = 'https://shababunaly.vercel.app';
  const email = 'shababuna-order-intake-smoke@example.com';
  const idempotencyKey = crypto.randomUUID();

  try {
    const response = await fetch(`${origin}/api/order-intake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: origin,
        'User-Agent': 'Shababuna-Production-Smoke/1.0',
      },
      body: JSON.stringify({
        idempotencyKey,
        currency: 'USD',
        paymentMethod: 'cash',
        email,
        shipping: {
          country: 'LY',
          paymentPlan: 'half',
          displayCurrency: 'USD',
          customer: {
            name: 'Shababuna Order Intake Smoke',
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
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const body = await response.json().catch(() => ({}));
    return res.status(response.ok ? 200 : 503).json({
      ok: response.ok,
      upstreamStatus: response.status,
      idempotencyKey,
      response: body,
    });
  } catch (error: unknown) {
    return res.status(503).json({
      ok: false,
      error:
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message || 'order_intake_smoke_failed')
          : 'order_intake_smoke_failed',
    });
  }
}
