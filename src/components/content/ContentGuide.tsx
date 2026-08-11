import type { ReactElement, ReactNode } from 'react';
import { useId } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import '../../styles/public-content.css';

type ContentSection = { id?: string; title?: ReactNode; body?: ReactNode };

export default function ContentGuide({
  chapters = [],
  aside = null,
  meta = null,
  lede = null,
}: {
  chapters?: ContentSection[];
  aside?: ReactNode;
  meta?: ReactNode;
  lede?: ReactNode;
}): ReactElement | null {
  const { pick } = useLanguage();
  const uid = useId().replace(/:/g, '');
  const entries = chapters.map((chapter, position) => ({
    ...chapter,
    anchor: chapter.id || `${uid}-section-${position + 1}`,
  }));

  return (
    <div className="sb-content-guide">
      <div className="sb-content-guide__inner">
        {entries.length > 1 || aside ? (
          <aside className="sb-content-guide__nav">
            {entries.length > 1 ? (
              <>
                <p className="sb-content-guide__nav-label">{pick({ en: 'On this page', ar: 'في هذه الصفحة' })}</p>
                <nav aria-label={pick({ en: 'On this page', ar: 'في هذه الصفحة' })}>
                  <ul>
                    {entries.map((entry) => (
                      <li key={entry.anchor}><a href={`#${entry.anchor}`}>{entry.title}</a></li>
                    ))}
                  </ul>
                </nav>
              </>
            ) : null}
            {aside ? <div className="sb-content-guide__aside">{aside}</div> : null}
          </aside>
        ) : null}

        <article className="sb-content-guide__body">
          {meta ? <p className="sb-content-guide__meta">{meta}</p> : null}
          {lede ? <p className="sb-content-guide__lede">{lede}</p> : null}
          {entries.map((entry) => (
            <section key={entry.anchor} id={entry.anchor} className="sb-content-guide__section">
              {entry.title ? <h2>{entry.title}</h2> : null}
              <div className="sb-content-guide__section-body">{entry.body}</div>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
