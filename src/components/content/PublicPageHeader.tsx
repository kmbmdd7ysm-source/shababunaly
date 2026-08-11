import type { ReactNode } from 'react';
import Breadcrumbs from '../common/Breadcrumbs';
import '../../styles/public-content.css';

export default function PublicPageHeader({
  eyebrow = null,
  index: _index = null,
  title,
  lede = null,
  figure = null,
  trail = null,
  tone = 'light',
  children = null,
}: {
  eyebrow?: ReactNode;
  index?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  figure?: { value: ReactNode; label: ReactNode } | null;
  trail?: Array<{ label: string; to?: string }> | null;
  tone?: 'night' | 'chalk' | 'light' | string;
  children?: ReactNode;
}) {
  return (
    <header className="sb-pagehead" data-tone={tone === 'night' ? 'dark' : 'light'}>
      <div className="sb-pagehead__inner">
        {trail && trail.length > 0 ? (
          <div className="sb-pagehead__trail"><Breadcrumbs items={trail} /></div>
        ) : null}
        <div className="sb-pagehead__copy">
          {eyebrow ? <p className="sb-pagehead__eyebrow">{eyebrow}</p> : null}
          <h1 className="sb-pagehead__title">{title}</h1>
          {lede ? <p className="sb-pagehead__lede">{lede}</p> : null}
          {children ? <div className="sb-pagehead__actions">{children}</div> : null}
        </div>
        {figure ? (
          <div className="sb-pagehead__figure" aria-label={`${String(figure.value)} ${String(figure.label)}`}>
            <strong>{figure.value}</strong>
            <span>{figure.label}</span>
          </div>
        ) : null}
      </div>
    </header>
  );
}
