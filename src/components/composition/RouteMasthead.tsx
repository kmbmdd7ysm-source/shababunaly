import type { ReactNode } from 'react';
import Breadcrumbs from '../common/Breadcrumbs';
import '../../styles/composition.css';
import '../../styles/masthead.css';

/*
 * The route masthead — the structural replacement for `PageHero`.
 */
export default function RouteMasthead({
  eyebrow = null,
  index = null,
  title,
  lede = null,
  figure = null,
  trail = null,
  tone = 'night',
  children = null,
}: {
  eyebrow?: ReactNode;
  index?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  figure?: { value: ReactNode; label: ReactNode } | null;
  trail?: Array<{ label: string; to?: string }> | null;
  tone?: 'night' | 'chalk' | string;
  children?: ReactNode;
}) {
  return (
    <section className="gw-routehead" data-tone={tone}>
      <div className="gw-routehead-inner">
        {trail && trail.length > 0 && (
          <div className="gw-routehead-trail">
            <Breadcrumbs items={trail} />
          </div>
        )}
        {(eyebrow || index) && (
          <p className="gw-spec gw-routehead-eyebrow">
            {index && (
              <span className="gw-routehead-index" aria-hidden="true">
                {index}
              </span>
            )}
            {eyebrow}
          </p>
        )}
        <div className="gw-routehead-row">
          <h1 className="gw-routehead-title">{title}</h1>
          {figure && (
            <p className="gw-routehead-figure">
              <span className="gw-figure gw-isolate-ltr">{figure.value}</span>
              <span className="gw-spec">{figure.label}</span>
            </p>
          )}
        </div>
        {lede && <p className="gw-routehead-lede">{lede}</p>}
        {children && <div className="gw-routehead-actions">{children}</div>}
      </div>
    </section>
  );
}
