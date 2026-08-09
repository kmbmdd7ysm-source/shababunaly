import NotificationAndSecurity from './control/NotificationAndSecurity';
import MediaLibrary from './control/MediaLibrary';
import ContentCms from './control/ContentCms';
import CatalogDraftManager from './control/CatalogDraftManager';
import MerchandisingManager from './control/MerchandisingManager';
import FulfillmentManager from './control/FulfillmentManager';
import ProcurementAndBilling from './control/ProcurementAndBilling';

export default function OperationsControlCenter({ state, accessToken, pick, saving, run }) {
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
