import type { ReactNode } from 'react';

type BadgeTone = 'new' | 'sale' | 'sold' | 'limited' | 'best' | 'free' | string;

export default function Badge({
  tone = 'new',
  children,
}: {
  tone?: BadgeTone;
  children?: ReactNode;
}) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
