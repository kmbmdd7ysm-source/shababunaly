import type { ReactNode } from 'react';
import NotificationAndSecurity from './control/NotificationAndSecurity';
import MediaLibrary from './control/MediaLibrary';
import ContentCms from './control/ContentCms';
import CatalogDraftManager from './control/CatalogDraftManager';
import MerchandisingManager from './control/MerchandisingManager';
import FulfillmentManager from './control/FulfillmentManager';
import ProcurementAndBilling from './control/ProcurementAndBilling';
import type { OperationsRunFn } from '../../types/operations';

type OpsControlProps = {
  state: unknown;
  accessToken?: string;
  pick: (value: { en?: string; ar?: string } | string) => string;
  saving?: boolean;
  run: OperationsRunFn;
};

export default function OperationsControlCenter({
  state,
  accessToken,
  pick,
  saving,
  run,
}: OpsControlProps): ReactNode {
  return (
    <div className="operations-control-center">
      <NotificationAndSecurity state={state} pick={pick} saving={saving} run={run} />
      <MediaLibrary state={state} accessToken={accessToken} pick={pick} saving={saving} run={run} />
      <ContentCms state={state} pick={pick} saving={saving} run={run} />
      <CatalogDraftManager state={state} pick={pick} saving={saving} run={run} />
      <MerchandisingManager state={state} pick={pick} saving={saving} run={run} />
      <FulfillmentManager state={state} pick={pick} saving={saving} run={run} />
      <ProcurementAndBilling state={state} pick={pick} saving={saving} run={run} />
    </div>
  );
}
