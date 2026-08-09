import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { updateAdminUserRole } from '../../services/operations';

export function StaffAccessManager({
  state,
  accessToken,
  currentUserId,
  pick,
  saving,
  run,
  onUpdated,
}: {
  state: Record<string, unknown>;
  accessToken?: string | undefined;
  currentUserId?: string | undefined;
  pick: (value: import('../../context/LanguageContext').LocaleValue) => string;
  saving?: string | boolean | undefined;
  run: (...args: unknown[]) => unknown;
  onUpdated?: (user: Record<string, unknown>) => unknown;
}): ReactElement {
  if (state.loading)
    return <p role="status">{pick({ en: 'Loading users…', ar: 'جاري تحميل المستخدمين…' })}</p>;
  if (state.error) return <p className="form-error">{String(state.error)}</p>;
  const rows = Array.isArray(state.rows) ? (state.rows as Array<Record<string, unknown>>) : [];
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
          {rows.map((user) => (
            <StaffAccessRow
              key={String(user.id)}
              user={user}
              accessToken={accessToken}
              currentUserId={currentUserId}
              pick={pick}
              saving={saving}
              run={run}
              onUpdated={onUpdated}
            />
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan={4}>{pick({ en: 'No users found.', ar: 'لا يوجد مستخدمون.' })}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function StaffAccessRow({
  user,
  accessToken,
  currentUserId,
  pick,
  saving,
  run,
  onUpdated,
}: {
  user: Record<string, unknown>;
  accessToken?: string | undefined;
  currentUserId?: string | undefined;
  pick: (value: import('../../context/LanguageContext').LocaleValue) => string;
  saving?: string | boolean | undefined;
  run: (...args: unknown[]) => unknown;
  onUpdated?: (user: Record<string, unknown>) => unknown;
}): ReactElement {
  const [role, setRole] = useState(String(user.role || 'customer'));
  useEffect(() => setRole(String(user.role || 'customer')), [user.role]);
  const key = `staff-role-${String(user.id || '')}`;
  return (
    <tr>
      <td>
        <strong>{String(user.displayName || user.email || '')}</strong>
        <small>{String(user.email ?? '')}</small>
      </td>
      <td>{String(user.organizationName || user.accountType || 'customer')}</td>
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
          onClick={() => {
            void Promise.resolve(
              run(
                key,
                async () => {
                  const result = (await updateAdminUserRole(
                    String(accessToken || ''),
                    String(user.id || ''),
                    role,
                  )) as { user?: Record<string, unknown> };
                  onUpdated?.(result.user || {});
                  return result.user;
                },
                pick({
                  en: 'Staff role updated securely.',
                  ar: 'تم تحديث صلاحية الموظف بأمان.',
                }),
              ),
            );
          }}
        >
          {pick({ en: 'Save Role', ar: 'حفظ الصلاحية' })}
        </button>
      </td>
    </tr>
  );
}
