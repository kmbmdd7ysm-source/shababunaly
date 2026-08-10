import crypto from 'node:crypto';

export const clean = (value: unknown, max = 1000): string =>
  String(value ?? '')
    .trim()
    .slice(0, max);

export function verifyHmacSha256(
  raw: Buffer | string,
  secret: string,
  header: unknown,
): boolean {
  if (!secret || !header) return false;
  const candidate = clean(header, 5000).replace(/^sha256=/i, '');
  const expectedHex = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const expectedBase64 = crypto.createHmac('sha256', secret).update(raw).digest('base64');
  return [expectedHex, expectedBase64].some((expected) => {
    const a = Buffer.from(candidate);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

export function normalizeProviderEvent(
  payload: unknown,
  provider: string,
  amountUnit = 'minor',
  statusMap: Record<string, { kind: string; status: string }> = {},
) {
  const source = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const dataObj =
    source.data && typeof source.data === 'object'
      ? (source.data as Record<string, unknown>)
      : {};
  const object =
    dataObj.object && typeof dataObj.object === 'object'
      ? (dataObj.object as Record<string, unknown>)
      : Object.keys(dataObj).length
        ? dataObj
        : source;
  const metadata =
    (object.metadata && typeof object.metadata === 'object'
      ? (object.metadata as Record<string, unknown>)
      : null) ||
    (source.metadata && typeof source.metadata === 'object'
      ? (source.metadata as Record<string, unknown>)
      : {});
  const providerStatus = clean(source.status || object.status || source.type, 100).toLowerCase();
  const mapped = statusMap[providerStatus];
  if (!mapped) throw Object.assign(new Error('unsupported_provider_event'), { status: 400 });
  const explicitMinor = Number(object.amountMinor ?? object.amount_minor ?? source.amountMinor);
  const generic = Number(
    mapped.kind === 'refund'
      ? (object.amount_refunded ?? source.amount_refunded ?? object.amount ?? source.amount)
      : (object.amount_received ?? object.amount_paid ?? object.amount ?? source.amount),
  );
  const amount = Number.isFinite(explicitMinor)
    ? explicitMinor / 100
    : amountUnit === 'major'
      ? generic
      : generic / 100;
  if (!Number.isFinite(amount) || amount < 0)
    throw Object.assign(new Error('invalid_provider_amount'), { status: 400 });
  return {
    provider,
    kind: mapped.kind,
    eventId: clean(source.id || source.eventId || object.eventId, 240),
    eventStatus: mapped.status,
    entityType: clean(
      metadata.entityType ||
        metadata.entity_type ||
        object.entityType ||
        source.entityType ||
        'order',
      20,
    ).toLowerCase(),
    orderNumber: clean(
      metadata.orderNumber || metadata.order_number || object.orderNumber || source.orderNumber,
      80,
    ).toUpperCase(),
    quoteNumber: clean(
      metadata.quoteNumber || metadata.quote_number || object.quoteNumber || source.quoteNumber,
      80,
    ).toUpperCase(),
    amount,
    currency: clean(object.currency || source.currency || 'USD', 10).toUpperCase(),
    transactionId: clean(
      object.payment_intent || object.transactionId || object.id || source.transactionId,
      240,
    ),
  };
}

function requireHttpsEnv(name: string): string {
  const value = clean(process.env[name], 1500);
  if (!value || !/^https:\/\//i.test(value))
    throw Object.assign(new Error(`${name.toLowerCase()}_not_configured`), { status: 503 });
  return value;
}

function expandTemplate(template: string, values: Record<string, unknown>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) =>
    encodeURIComponent(clean(values[key], 500)),
  );
}

async function providerRequest({
  url,
  secret,
  method = 'POST',
  body,
  idempotencyKey,
  timeoutMs = 20000,
}: {
  url: string;
  secret: string;
  method?: string;
  body?: unknown;
  idempotencyKey?: string;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    };
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    const init: RequestInit = {
      method,
      headers,
      signal: controller.signal,
      cache: 'no-store',
    };
    if (body != null) init.body = JSON.stringify(body);
    const response = await fetch(url, init);
    const text = await response.text().catch(() => '');
    let data: Record<string, unknown> = {};
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      data = { raw: text.slice(0, 500) };
    }
    if (!response.ok) {
      const error = Object.assign(new Error('provider_rejected'), {
        status: response.status === 429 ? 429 : response.status >= 500 ? 502 : 400,
        providerStatus: response.status,
        providerCode: clean(data.code || data.error || data.message, 120),
      });
      throw error;
    }
    clearTimeout(timeout);
    return data;
  } catch (error: unknown) {
    clearTimeout(timeout);
    if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError')
      throw Object.assign(new Error('provider_timeout'), { status: 504 });
    throw error;
  }
}

export type HttpAdapterConfig = {
  id: string;
  secretEnv: string;
  providerEnv: string;
  endpointEnv: string;
  retrieveEnv: string;
  refundEnv: string;
  webhookSecretEnv: string;
  signatureHeaderEnv: string;
  amountUnitEnv: string;
  statusMap: Record<string, { kind: string; status: string }>;
  sessionTimeoutMs?: number;
  retrieveTimeoutMs?: number;
  refundTimeoutMs?: number;
};

export type PaymentAdapter = ReturnType<typeof createHttpAdapter>;

export function createHttpAdapter(config: HttpAdapterConfig) {
  const secret = () => clean(process.env[config.secretEnv], 5000);
  const providerName = () => clean(process.env[config.providerEnv] || config.id, 100);
  return {
    id: config.id,
    configured: () => Boolean(clean(process.env[config.endpointEnv]) && secret()),
    capabilities: () => ({
      checkout: Boolean(clean(process.env[config.endpointEnv]) && secret()),
      retrieve: Boolean(clean(process.env[config.retrieveEnv]) && secret()),
      refund: Boolean(clean(process.env[config.refundEnv]) && secret()),
      webhook: Boolean(clean(process.env[config.webhookSecretEnv])),
    }),
    async createSession({
      trustedOrder,
      idempotencyKey,
      successUrl,
      cancelUrl,
    }: {
      trustedOrder: Record<string, unknown>;
      idempotencyKey?: string;
      successUrl?: string;
      cancelUrl?: string;
    }) {
      const endpoint = requireHttpsEnv(config.endpointEnv);
      const providerSecret = secret();
      if (!providerSecret)
        throw Object.assign(new Error('payment_provider_not_connected'), { status: 503 });
      const data = await providerRequest({
        url: endpoint,
        secret: providerSecret,
        ...(idempotencyKey ? { idempotencyKey } : {}),
        timeoutMs: Number(config.sessionTimeoutMs) > 0 ? Number(config.sessionTimeoutMs) : 20000,
        body: {
          paymentMethod: config.id,
          provider: providerName(),
          trustedOrder,
          successUrl,
          cancelUrl,
        },
      });
      if (!/^https:\/\//i.test(String(data.url || '')))
        throw Object.assign(new Error('provider_missing_checkout_url'), { status: 502 });
      return { url: data.url, providerSessionId: clean(data.id || data.sessionId, 240) };
    },
    verifyWebhook(raw: Buffer, headers: Record<string, string | string[] | undefined>) {
      const headerName = clean(
        process.env[config.signatureHeaderEnv] || 'x-shababuna-signature',
        100,
      ).toLowerCase();
      return verifyHmacSha256(
        raw,
        clean(process.env[config.webhookSecretEnv], 5000),
        headers[headerName] || headers['x-webhook-signature'] || headers['x-signature'],
      );
    },
    normalizeEvent(payload: unknown) {
      return normalizeProviderEvent(
        payload,
        config.id,
        clean(process.env[config.amountUnitEnv], 20).toLowerCase() === 'major' ? 'major' : 'minor',
        config.statusMap,
      );
    },
    async retrievePayment({
      transactionId,
      providerSessionId,
      orderNumber,
      quoteNumber,
    }: {
      transactionId?: string;
      providerSessionId?: string;
      orderNumber?: string;
      quoteNumber?: string;
    }) {
      const template = requireHttpsEnv(config.retrieveEnv);
      const providerSecret = secret();
      if (!providerSecret)
        throw Object.assign(new Error('payment_provider_not_connected'), { status: 503 });
      const url = expandTemplate(template, {
        transactionId,
        providerSessionId,
        orderNumber,
        quoteNumber,
      });
      const data = await providerRequest({
        url,
        secret: providerSecret,
        method: 'GET',
        timeoutMs: Number(config.retrieveTimeoutMs) > 0 ? Number(config.retrieveTimeoutMs) : 15000,
      });
      return {
        provider: config.id,
        raw: data,
        id: clean(data.id || data.transactionId || transactionId, 240),
        status: clean(data.status, 100).toLowerCase(),
        amount: data.amount,
        currency: clean(data.currency || 'USD', 10).toUpperCase(),
      };
    },
    async refund({
      transactionId,
      amount,
      currency = 'USD',
      idempotencyKey,
      reason = '',
      metadata = {},
    }: {
      transactionId?: string;
      amount?: number;
      currency?: string;
      idempotencyKey?: string;
      reason?: string;
      metadata?: Record<string, unknown>;
    }) {
      const endpoint = requireHttpsEnv(config.refundEnv);
      const providerSecret = secret();
      if (!providerSecret)
        throw Object.assign(new Error('payment_provider_not_connected'), { status: 503 });
      const numericAmount = Number(amount);
      if (!transactionId || !Number.isFinite(numericAmount) || numericAmount <= 0)
        throw Object.assign(new Error('invalid_refund_request'), { status: 400 });
      const data = await providerRequest({
        url: endpoint,
        secret: providerSecret,
        ...(idempotencyKey ? { idempotencyKey } : {}),
        timeoutMs: Number(config.refundTimeoutMs) > 0 ? Number(config.refundTimeoutMs) : 20000,
        body: {
          provider: providerName(),
          paymentMethod: config.id,
          transactionId,
          amount: numericAmount,
          amountMinor: Math.round(numericAmount * 100),
          currency: clean(currency, 10).toUpperCase(),
          reason: clean(reason, 500),
          metadata,
        },
      });
      return {
        provider: config.id,
        id: clean(data.id || data.refundId, 240),
        status: clean(data.status || 'pending', 100).toLowerCase(),
        raw: data,
      };
    },
    mapError(error: unknown) {
      const err = error && typeof error === 'object' ? (error as Record<string, unknown>) : {};
      const code = clean(err.message || 'payment_provider_error', 120);
      return {
        status: Number(err.status || 502),
        code,
        providerCode: clean(err.providerCode, 120),
      };
    },
  };
}
