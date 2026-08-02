import onlineCard from './adapters/online-card.js';
import libyanBankCard from './adapters/libyan-bank-card.js';
const adapters = new Map([[onlineCard.id, onlineCard], [libyanBankCard.id, libyanBankCard]]);
export function getPaymentAdapter(id) { return adapters.get(String(id || '').trim().toLowerCase()) || null; }
export function configuredPaymentMethods() { return [...adapters.values()].filter((adapter) => adapter.configured()).map((adapter) => adapter.id); }
