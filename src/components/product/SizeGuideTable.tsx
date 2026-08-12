import type { ReactElement } from 'react';
import { sizeUnitNote } from '../../data/sizeGuide';

type LocaleText = { en: string; ar: string };
type SizeGuide = {
  title?: LocaleText;
  columns?: LocaleText[];
  rows?: string[][];
};

export default function SizeGuideTable({ guide, lang }: { guide: SizeGuide; lang: 'en' | 'ar' | string }): ReactElement {
  const language = lang === 'ar' ? 'ar' : 'en';
  const columns = Array.isArray(guide?.columns) ? guide.columns : [];
  const rows = Array.isArray(guide?.rows) ? guide.rows : [];
  return (
    <div className="pdx-size-guide-table" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {guide?.title ? <h3>{guide.title[language]}</h3> : null}
      <div className="pdx-size-table-scroll">
        <table>
          <thead>
            <tr>{columns.map((column, index) => <th key={`${column.en}-${index}`} scope="col">{column[language]}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${row[0] || rowIndex}-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>{sizeUnitNote[language]}</p>
    </div>
  );
}
