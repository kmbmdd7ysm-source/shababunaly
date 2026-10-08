import { afterEach, describe, expect, it, vi } from './test-api.js';
import handler from '../api/center-vision-order-lookup.ts';

afterEach(() => vi.restoreAllMocks());

function res() {
  return {
    statusCode: 0,
    body: null,
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('Center Vision verified Shababuna order status proxy', () => {
  it('rejects malformed order identifiers and customer emails without fetching data', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => { throw new Error('unexpected'); });
    const response = res();
    await handler({ method: 'POST', body: { orderNumber: 'wrong', email: 'not-an-email' } }, response);
    expect(response.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not reveal customer data when the verified upstream order is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ status: 404, ok: false });
    const response = res();
    await handler({ method: 'POST', body: {
      orderNumber: 'SHB-20261008-0000001', email: 'buyer@example.com',
    } }, response);
    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe('order_not_found');
  });

  it('only returns authoritative status and shipment fields, never private customer details', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 200, ok: true,
      json: async () => ({
        externalOrderNumber: 'SHB-20261008-0000001',
        status: 'PROCESSING',
        paymentStatus: 'PAID',
        fulfillmentStatus: 'PARTIAL',
        shipment: { status: 'IN_TRANSIT', trackingNumber: 'TRACK-1' },
        customerPersonId: 'secret-person-id',
        shippingAddress: { city: 'Tripoli' },
      }),
    });
    const response = res();
    await handler({ method: 'POST', body: {
      orderNumber: 'SHB-20261008-0000001', email: 'buyer@example.com',
    } }, response);
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('PROCESSING');
    expect(response.body.shipment.trackingNumber).toBe('TRACK-1');
    expect(response.body).not.toHaveProperty('customerPersonId');
    expect(response.body).not.toHaveProperty('shippingAddress');
  });
});
