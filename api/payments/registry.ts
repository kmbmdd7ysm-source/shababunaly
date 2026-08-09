import onlineCard from './adapters/online-card.ts';
import libyanBankCard from './adapters/libyan-bank-card.ts';
import type { PaymentAdapter } from './adapters/base.js';

const adapters = new Map<string, PaymentAdapter>([
  [onlineCard.id, onlineCard],
  [libyanBankCard.id, libyanBankCard],
]);

export function getPaymentAdapter(id: string | null | undefined): PaymentAdapter | null {
  return (
    adapters.get(
      String(id || '')
        .trim()
        .toLowerCase(),
    ) || null
  );
}

export function configuredPaymentMethods(): string[] {
  return [...adapters.values()]
    .filter((adapter) => adapter.configured())
    .map((adapter) => adapter.id);
}
