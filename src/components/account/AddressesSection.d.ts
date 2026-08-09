import type { ReactElement } from 'react';
export default function AddressesSection(props: {
  userId?: string;
  pick: (value: unknown) => string;
  language?: string;
  [key: string]: unknown;
}): ReactElement;
