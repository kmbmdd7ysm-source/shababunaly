import type { ReactElement, ReactNode } from 'react';

export function Stat({ label, value }: { label?: ReactNode; value?: ReactNode }): ReactElement {
  return (
    <div className="operations-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
