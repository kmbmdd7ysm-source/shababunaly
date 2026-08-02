import { useLanguage } from '../context/LanguageContext';
import Seo from '../components/common/Seo';
import PageHero from '../components/common/PageHero';
import Breadcrumbs from '../components/common/Breadcrumbs';
import { sizeGuides, sizeUnitNote } from '../data/sizeGuide';

export default function SizeGuidePage() {
  const { t, pick, lang } = useLanguage();

  return (
    <>
      <Seo title={t.sizeGuide.title} description={t.sizeGuide.sub} path="/size-guide" />
      <PageHero label={t.sizeGuide.label} title={t.sizeGuide.title} description={t.sizeGuide.sub} />
      <div className="container">
        <Breadcrumbs items={[{ label: t.sizeGuide.title }]} />
      </div>

      <section className="section">
        <div className="container size-guide-layout">
          <p className="notice notice--muted">{pick(sizeUnitNote)}</p>
          {sizeGuides.map((g) => (
            <div key={g.key} className="size-guide-block">
              <h2 className="section-title">{pick(g.title)}</h2>
              <div className="size-table-wrap">
                <table className="size-table">
                  <thead>
                    <tr>
                      {g.columns.map((c, i) => (
                        <th key={i}>{c[lang] ?? c.en}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
