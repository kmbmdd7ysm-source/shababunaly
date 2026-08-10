import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { upsertShipment } from '../../../services/operations';
import { SHIPMENT_STATUSES } from './shared';
import type { OperationsRunFn } from '../../../types/operations';

export default function FulfillmentManager({
  state,
  pick,
  saving,
  run,
}: {
  state: unknown;
  pick: (value: string | { en?: string; ar?: string }) => string;
  saving?: string | boolean | undefined;
  run: OperationsRunFn;
}): ReactElement {
  const stateRecord = (state || {}) as Record<string, unknown>;
  const asRows = (value: unknown) =>
    Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
  const orders = asRows(stateRecord.orders);
  const carriers = asRows(stateRecord.carriers);
  const shipments = asRows(stateRecord.shipments);
  const [shipment, setShipment] = useState({
    orderId: '',
    carrierId: '',
    trackingNumber: '',
    status: 'pending',
  });
  return (
    <section className="operations-subsection">
      <h3>
        {pick({
          en: 'Shipments, tracking & partial fulfillment',
          ar: 'الشحنات والتتبع والتنفيذ الجزئي',
        })}
      </h3>
      <form
        className="enterprise-action-card"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          void Promise.resolve(
            run(
              'shipment-create',
              () =>
                upsertShipment({
                  orderId: shipment.orderId,
                  carrierId: shipment.carrierId || null,
                  trackingNumber: shipment.trackingNumber,
                  status: shipment.status,
                }),
              pick({
                en: 'Shipment created and notification queued.',
                ar: 'تم إنشاء الشحنة وإضافة الإشعار.',
              }),
            ),
          );
        }}
      >
        <div className="operations-form-grid">
          <select
            value={shipment.orderId}
            onChange={(event) => setShipment({ ...shipment, orderId: event.target.value })}
            required
          >
            <option value="">{pick({ en: 'Select order', ar: 'اختر الطلب' })}</option>
            {orders.map((row) => (
              <option key={String(row.id)} value={String(row.id || '')}>
                {String(row.order_number || '')}
              </option>
            ))}
          </select>
          <select
            value={shipment.carrierId}
            onChange={(event) => setShipment({ ...shipment, carrierId: event.target.value })}
          >
            <option value="">{pick({ en: 'Carrier', ar: 'شركة الشحن' })}</option>
            {carriers
              .filter((row) => Boolean(row.active))
              .map((row) => (
                <option key={String(row.id)} value={String(row.id || '')}>
                  {String(row.name || '')}
                </option>
              ))}
          </select>
          <input
            value={shipment.trackingNumber}
            onChange={(event) => setShipment({ ...shipment, trackingNumber: event.target.value })}
            placeholder={pick({ en: 'Tracking number', ar: 'رقم التتبع' })}
          />
          <select
            value={shipment.status}
            onChange={(event) => setShipment({ ...shipment, status: event.target.value })}
          >
            {SHIPMENT_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
        <button className="btn-primary compact" disabled={saving === 'shipment-create'}>
          {pick({ en: 'Create shipment', ar: 'إنشاء شحنة' })}
        </button>
      </form>
      <div className="workspace-list">
        {shipments.map((row) => (
          <ShipmentRow
            key={String(row.id)}
            row={row}
            carriers={carriers}
            pick={pick}
            saving={saving}
            run={run}
          />
        ))}
      </div>
    </section>
  );
}

function ShipmentRow({
  row,
  carriers,
  pick,
  saving,
  run,
}: {
  row: Record<string, unknown>;
  carriers: Array<Record<string, unknown>>;
  pick: (value: string | { en?: string; ar?: string }) => string;
  saving?: string | boolean | undefined;
  run: OperationsRunFn;
}): ReactElement {
  const [status, setStatus] = useState(String(row.status || 'pending'));
  const [carrierId, setCarrierId] = useState(String(row.carrier_id || ''));
  const [trackingNumber, setTrackingNumber] = useState(String(row.tracking_number || ''));
  return (
    <article>
      <div>
        <span className="workspace-status-dot" data-status={String(row.status || '')} />
        <div>
          <h3>{String(row.shipment_number || '')}</h3>
          <p>
            {String(row.tracking_number || '—')} · {String(row.status || '')}
          </p>
        </div>
      </div>
      <div className="operations-form-grid">
        <select value={carrierId} onChange={(event) => setCarrierId(event.target.value)}>
          <option value="">—</option>
          {carriers.map((carrier) => (
            <option key={String(carrier.id)} value={String(carrier.id || '')}>
              {String(carrier.name || '')}
            </option>
          ))}
        </select>
        <input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          {SHIPMENT_STATUSES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn-secondary compact"
          disabled={saving === `shipment-${String(row.id || '')}`}
          onClick={() => {
            void Promise.resolve(
              run(
                `shipment-${String(row.id || '')}`,
                () =>
                  upsertShipment({
                    shipmentId: row.id != null ? String(row.id) : null,
                    orderId: row.order_id != null ? String(row.order_id) : null,
                    quoteId: row.quote_id != null ? String(row.quote_id) : null,
                    carrierId: carrierId || null,
                    trackingNumber,
                    status,
                  }),
                pick({ en: 'Shipment updated.', ar: 'تم تحديث الشحنة.' }),
              ),
            );
          }}
        >
          {pick({ en: 'Update', ar: 'تحديث' })}
        </button>
      </div>
    </article>
  );
}
