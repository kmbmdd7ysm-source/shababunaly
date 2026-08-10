import { lazy, Suspense, type ComponentType, type ReactElement, type ReactNode } from 'react';

const SecuritySection = lazy(() => import('./SecuritySection.tsx'));
const OrdersSection = lazy(() => import('./OrdersSection.tsx'));
const ProfileSection = lazy(() => import('./ProfileSection.tsx'));
const PreferencesSection = lazy(() => import('./PreferencesSection.tsx'));
const SavedSection = lazy(() => import('./SavedSection.tsx'));

function SectionFallback(): ReactElement {
  return <p role="status">…</p>;
}

export function LazyAccountSection({ children }: { children: ReactNode }): ReactElement {
  return <Suspense fallback={<SectionFallback />}>{children}</Suspense>;
}

export { SecuritySection, OrdersSection, ProfileSection, PreferencesSection, SavedSection };

export type LazySection = ComponentType<Record<string, unknown>>;
