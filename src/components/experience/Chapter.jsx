import { useId } from 'react';

/**
 * A dark, full-bleed chapter.
 *
 * The governing rule of the GROUNDWORK direction: the system is measured and
 * light, the film is lit and dark, and the two meet at a threshold but never
 * blend. A chapter is therefore always full-bleed, always bounded top and
 * bottom by a drawn rule, and always exits back to the measured chalk field.
 * There is no gradient between the two worlds and no dark UI chrome.
 *
 * @param {{
 *   label?: string,
 *   title?: string,
 *   children?: import('react').ReactNode,
 *   titleClassName?: string,
 * }} props
 */
export default function Chapter({
  label = '',
  title = '',
  children = null,
  titleClassName = 'gw-display',
}) {
  const headingId = useId();
  const labelled = title ? { 'aria-labelledby': headingId } : {};
  return (
    <section className="gw-chapter" {...labelled}>
      <div className="gw-container">
        <div className="gw-stack gw-stack--loose">
          {label && <p className="gw-spec">{label}</p>}
          {title && (
            <h2 id={headingId} className={titleClassName}>
              {title}
            </h2>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
