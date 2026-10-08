import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOrder } from '../src/services/orders.ts';

const input = (method, shippingQuoteRequired = false) => ({
  orderNumber: 'SHB-20261008-0000001',
  email: 'customer@example.test',
  paymentMethod: method,
  shippingQuoteRequired,
  items: [{ id: 'jersey', type: 'product', sku: 'L', quantity: 1, unitPrice: 20 }],
});

test('cash, bank transfer and pending quotes fail closed when server cannot save an order', async () => {
  const previousFetch = globalThis.fetch;
  const seen = [];
  try {
    globalThis.fetch = async (_url, options) => {
      seen.push(JSON.parse(String(options.body)));
      return { ok: false, status: 503, json: async () => ({ error: 'backend_unavailable' }) };
    };
    for (const [method, pending] of [
      ['cash', false],
      ['bank_transfer', false],
      ['cash', true],
    ]) {
      await assert.rejects(
        () =>
          createOrder(input(method, pending), {
            cloud: true,
            allowPending: true,
            idempotencyKey: 'stable-retry-key',
          }),
        { message: 'cloud_order_creation_failed' },
      );
    }
    assert.equal(seen.length, 3);
    assert.ok(seen.every((body) => body.idempotencyKey === 'stable-retry-key'));
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('missing server confirmation and network failures cannot masquerade as completed orders', async () => {
  const previousFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) });
    await assert.rejects(
      () => createOrder(input('cash'), { idempotencyKey: 'missing-confirmation' }),
      { message: 'cloud_order_creation_failed' },
    );
    globalThis.fetch = async () => {
      throw new Error('network_offline');
    };
    await assert.rejects(() => createOrder(input('cash'), { idempotencyKey: 'offline-key' }), {
      message: 'cloud_order_creation_failed',
    });
  } finally {
    globalThis.fetch = previousFetch;
  }
});
