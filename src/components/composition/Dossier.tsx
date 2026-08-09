import type { ReactElement, ReactNode } from 'react';
import { useId } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import '../../styles/composition.css';

type DossierChapter = {
  id?: string;
  title?: ReactNode;
  body?: ReactNode;
};

type DossierProps = {
  chapters?: DossierChapter[];
  aside?: ReactNode;
  meta?: ReactNode;
  lede?: ReactNode;
};

/*
 * The dossier — structural replacement for stacked section blocks on legal,
 * help, FAQ and size-guide routes: sticky contents + numbered chapters.
 */
export default function Dossier({
  chapters = [],
  aside = null,
  meta = null,
  lede = null,
}: DossierProps): ReactElement | null {
  const { pick } = useLanguage();
  const uid = useId().replace(/:/g, '');
  const entries = chapters.map((chapter, position) => ({
    ...chapter,
    index: String(position + 1).padStart(2, '0'),
    anchor: chapter.id || `${uid}-ch-${position + 1}`,
  }));

  return (
    <div className="gw-dossier">
      <div className="gw-dossier-inner">
        <nav className="gw-dossier-index" aria-label={pick({ en: 'Contents', ar: 'المحتويات' })}>
          <p className="gw-spec">{pick({ en: 'Contents', ar: 'المحتويات' })}</p>
          <ol>
            {entries.map((entry) => (
              <li key={entry.anchor}>
                <a href={`#${entry.anchor}`}>
                  <span className="gw-dossier-index-num" aria-hidden="true">
                    {entry.index}
                  </span>
                  <span>{entry.title}</span>
                </a>
              </li>
            ))}
          </ol>
          {aside && <div className="gw-dossier-aside">{aside}</div>}
        </nav>

        <div className="gw-dossier-body">
          {meta && <p className="gw-dossier-meta">{meta}</p>}
          {lede && <p className="gw-dossier-lede">{lede}</p>}
          {entries.map((entry) => (
            <section key={entry.anchor} id={entry.anchor} className="gw-chapter-block">
              <h2 className="gw-chapter-heading">
                <span className="gw-chapter-index" aria-hidden="true">
                  {entry.index}
                </span>
                <span>{entry.title}</span>
              </h2>
              <div className="gw-chapter-body">{entry.body}</div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
