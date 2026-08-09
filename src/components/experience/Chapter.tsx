import { useId, type ReactNode } from 'react';

/**
 * A dark, full-bleed chapter.
 */
export default function Chapter({
  label = '',
  title = '',
  children = null,
  titleClassName = 'gw-display',
}: {
  label?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  titleClassName?: string;
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
