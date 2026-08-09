import type { ReactNode } from 'react';
export const ReadinessProvider: import('react').ComponentType<{ children?: ReactNode }>;
export function getProductionReadiness(): Record<string, unknown>;
export function useReadiness(): {
  open: boolean;
  dismiss: () => void;
  readiness: Record<string, unknown>;
};
