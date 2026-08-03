import { useId } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import '../../styles/composition.css';

/*
 * The dossier — the structural replacement for "a container with stacked
 * `<section>` blocks", used by the legal, help, FAQ and size-guide routes.
 *
 * Those pages were a single scrolling column with no way to see the document's
 * shape or jump inside it. A dossier is a real document:
 *
 *   - a sticky INDEX rail listing every chapter, numbered, with the current
 *     one marked — so the reader can see the whole shape at once
 *   - numbered CHAPTERS on hairline rules, each with a stable anchor id
 *   - a capped measure so long legal prose stays readable
 *
 * The index is generated from the chapters, so it can never drift from the
 * content, and it degrades to a plain list of in-page links with no JavaScript
 * beyond React's own rendering.
 *
 * @param {{
 *   chapters: Array<{ id?: string, title: any, body: any }>,
 *   aside?: any,
 *   meta?: any,
 *   lede?: any,
 * }} props
 */
export default function Dossier({ chapters, aside = null, meta = null, lede = null }) {
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
