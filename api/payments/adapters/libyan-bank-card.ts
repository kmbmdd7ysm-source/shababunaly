import { createHttpAdapter } from './base.js';
export default createHttpAdapter({
  id: 'libyan_bank_card',
  providerEnv: 'LIBYAN_BANK_CARD_PROVIDER',
  endpointEnv: 'LIBYAN_BANK_CARD_SESSION_URL',
  retrieveEnv: 'LIBYAN_BANK_CARD_RETRIEVE_URL',
  refundEnv: 'LIBYAN_BANK_CARD_REFUND_URL',
  secretEnv: 'LIBYAN_BANK_CARD_SECRET_KEY',
  webhookSecretEnv: 'LIBYAN_BANK_CARD_WEBHOOK_SECRET',
  signatureHeaderEnv: 'LIBYAN_BANK_CARD_SIGNATURE_HEADER',
  amountUnitEnv: 'LIBYAN_BANK_CARD_WEBHOOK_AMOUNT_UNIT',
  statusMap: {
    'payment.succeeded': { kind: 'payment', status: 'succeeded' },
    'payment.failed': { kind: 'payment', status: 'failed' },
    'payment.cancelled': { kind: 'payment', status: 'cancelled' },
    succeeded: { kind: 'payment', status: 'succeeded' },
    failed: { kind: 'payment', status: 'failed' },
    cancelled: { kind: 'payment', status: 'cancelled' },
    'refund.succeeded': { kind: 'refund', status: 'refunded' },
    refunded: { kind: 'refund', status: 'refunded' },
  },
});
