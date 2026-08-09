import Breadcrumbs from '../common/Breadcrumbs';
import '../../styles/composition.css';
import '../../styles/masthead.css';

/*
 * The route masthead — the structural replacement for `PageHero`.
 *
 * `PageHero` was a banner: a label, a title, a paragraph, centred, with a
 * breadcrumb strip floating underneath it on its own light band.
 *
 * This is the opening of a chapter instead. The trail lives INSIDE the dark
 * ground rather than on a separate strip, the eyebrow can carry an index, the
 * title sets at display scale, and the route's primary figure (a count, a
 * status, a date) sits opposite the title against a rule — so the reader gets
 * the page's single most important number without reading a sentence.
 *
 * @param {{
 *   eyebrow?: any,
 *   index?: string,
 *   title: any,
 *   lede?: any,
 *   figure?: { value: any, label: any },
 *   trail?: Array<{ label: any, to?: string }>,
 *   tone?: 'night' | 'chalk',
 *   children?: any,
 * }} props
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
