export { DesignProofCard } from './DesignProofCard';
export { ReturnOperationsCard } from './ReturnOperationsCard';
export { QuoteCard } from './QuoteCard';
export { OrderOperationsCard } from './OrderOperationsCard';
export { SpecialRequestOperationsCard } from './SpecialRequestOperationsCard';
export { ProductContentCard } from './ProductContentCard';
export { CatalogRow } from './CatalogRow';
export { ShippingQuoteRow } from './ShippingQuoteRow';
export { Stat } from './Stat';
import { useEffect, useState } from 'react';
import {
  publishDesignProof,
  recordManualPayment,
  recordQuotePayment,
  recordRefund,
  setShippingQuote,
  updateAdminUserRole,
  updateCatalogProduct,
  updateCatalogVariant,
  updateOrderWorkflow,
  updateQuoteWorkflow,
  updateReturnRequest,
  updateSpecialRequest,
  uploadDesignProofFiles,
} from '../../services/operations';

import { ORDER_TRANSITIONS, QUOTE_TRANSITIONS, RETURN_TRANSITIONS, money } from './commerceHelpers';


export function StaffAccessManager({
  state,
  accessToken,
  currentUserId,
  pick,
  saving,
  run,
  onUpdated,
}) {
  if (state.loading)
    return <p role="status">{pick({ en: 'Loading users…', ar: 'جاري تحميل المستخدمين…' })}</p>;
  if (state.error) return <p className="form-error">{state.error}</p>;
  return (
    <div className="operations-table-wrap">
      <table className="operations-table staff-access-table">
        <thead>
          <tr>
            <th>{pick({ en: 'User', ar: 'المستخدم' })}</th>
            <th>{pick({ en: 'Account', ar: 'الحساب' })}</th>
            <th>{pick({ en: 'Role', ar: 'الصلاحية' })}</th>
            <th>{pick({ en: 'Action', ar: 'الإجراء' })}</th>
          </tr>
        </thead>
        <tbody>
          {state.rows.map((user) => (
            <StaffAccessRow
              key={user.id}
              user={user}
              accessToken={accessToken}
              currentUserId={currentUserId}
              pick={pick}
              saving={saving}
              run={run}
              onUpdated={onUpdated}
            />
          ))}
          {!state.rows.length && (
            <tr>
              <td colSpan="4">{pick({ en: 'No users found.', ar: 'لا يوجد مستخدمون.' })}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StaffAccessRow({ user, accessToken, currentUserId, pick, saving, run, onUpdated }) {
  const [role, setRole] = useState(user.role || 'customer');
  useEffect(() => setRole(user.role || 'customer'), [user.role]);
  const key = `staff-role-${user.id}`;
  return (
    <tr>
      <td>
        <strong>{user.displayName || user.email}</strong>
        <small>{user.email}</small>
      </td>
      <td>{user.organizationName || user.accountType || 'customer'}</td>
      <td>
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          disabled={user.id === currentUserId}
        >
          <option value="customer">Customer</option>
          <option value="sales">Sales</option>
          <option value="operations">Operations</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </td>
      <td>
        <button
          className="btn-secondary compact"
          disabled={saving === key || role === user.role || user.id === currentUserId}
          onClick={() =>
            run(
              key,
              async () => {
                const result = await updateAdminUserRole(accessToken, user.id, role);
                onUpdated(result.user);
                return result.user;
              },
              pick({ en: 'Staff role updated securely.', ar: 'تم تحديث صلاحية الموظف بأمان.' }),
            )
          }
        >
          {pick({ en: 'Save Role', ar: 'حفظ الصلاحية' })}
        </button>
      </td>
    </tr>
  );
}






