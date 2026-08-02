import { createHttpAdapter } from './base.js';
export default createHttpAdapter({
  id: 'online_card',
  providerEnv: 'PAYMENTS_PROVIDER',
  endpointEnv: 'PAYMENTS_SESSION_URL',
  retrieveEnv: 'PAYMENTS_RETRIEVE_URL',
  refundEnv: 'PAYMENTS_REFUND_URL',
  secretEnv: 'PAYMENTS_SECRET_KEY',
  webhookSecretEnv: 'PAYMENTS_WEBHOOK_SECRET',
  signatureHeaderEnv: 'PAYMENTS_SIGNATURE_HEADER',
  amountUnitEnv: 'PAYMENTS_WEBHOOK_AMOUNT_UNIT',
  statusMap: {
    'payment.succeeded': { kind: 'payment', status: 'succeeded' },
    'payment.failed': { kind: 'payment', status: 'failed' },
    'payment.cancelled': { kind: 'payment', status: 'cancelled' },
    'succeeded': { kind: 'payment', status: 'succeeded' },
    'failed': { kind: 'payment', status: 'failed' },
    'cancelled': { kind: 'payment', status: 'cancelled' },
    'refund.succeeded': { kind: 'refund', status: 'refunded' },
    'refunded': { kind: 'refund', status: 'refunded' },
  },
});
