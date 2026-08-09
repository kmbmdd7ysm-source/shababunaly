import type { ReactElement } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Seo from '../components/common/Seo.tsx';
import RouteMasthead from '../components/composition/RouteMasthead';
import Dossier from '../components/composition/Dossier.jsx';
import { sizeGuides, sizeUnitNote } from '../data/sizeGuide.ts';

/*
 * The size guide, rebuilt as a DOSSIER of specifications.
 *
 * WAS: PageHero, a breadcrumb strip, a notice, then every table stacked in one
 * column — so finding the right garment meant scrolling past all the others.
 *
 * NOW: a masthead with the guide count as a figure, a sticky numbered index of
 * garments, and each table as its own numbered chapter with a stable anchor,
 * so a product page can deep-link straight to the right one.
 *
 * Same `sizeGuides` data, same columns, same rows, same unit note.
 */
export default function SizeGuidePage(): ReactElement {
  const { t, pick, lang } = useLanguage();
  const sizeGuide = (t.sizeGuide || {}) as Record<string, string>;

  return (
    <>
      <Seo title={sizeGuide.title || ''} description={sizeGuide.sub || ''} path="/size-guide" />
      <RouteMasthead
        eyebrow={sizeGuide.label}
        title={sizeGuide.title}
        lede={sizeGuide.sub}
        trail={[{ label: sizeGuide.title || '' }]}
        figure={{ value: sizeGuides.length, label: pick({ en: 'guides', ar: 'أدلة' }) }}
      />
      <Dossier
        meta={pick(sizeUnitNote)}
        aside={pick(sizeUnitNote)}
        chapters={sizeGuides.map((guide) => ({
          id: `size-${guide.key}`,
          title: pick(guide.title),
          body: (
            <div className="size-table-wrap">
              <table className="size-table">
                <thead>
                  <tr>
                    {guide.columns.map((column, index) => (
                      <th key={index}>{column[lang] ?? column.en}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {guide.rows.map((row, index) => (
                    <tr key={index}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ),
        }))}
      />
    </>
  );
}
