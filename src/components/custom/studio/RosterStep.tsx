import type { ReactElement, ReactNode } from 'react';

type PickFn = (value: { en?: string; ar?: string } | string) => string;

/** Roster step chrome — editors remain owned by CustomizePage until fully extracted. */
export default function RosterStep({
  pick,
  onBack,
  onContinue,
  children,
}: {
  pick: PickFn;
  onBack: () => void;
  onContinue: () => void;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="gw-toolbench" aria-labelledby="custom-roster-title">
      <header className="gw-toolbench-head">
        <div>
          <p className="gw-kicker">{pick({ en: 'Roster', ar: 'القائمة' })}</p>
          <h2 id="custom-roster-title" className="gw-toolbench-title">
            {pick({ en: 'Player names and numbers', ar: 'أسماء وأرقام اللاعبين' })}
          </h2>
          <p className="gw-toolbench-lede">
            {pick({
              en: 'Import a spreadsheet or edit rows directly. State is preserved when you go back.',
              ar: 'استورد جدولًا أو عدّل الصفوف مباشرة. تُحفظ الحالة عند الرجوع.',
            })}
          </p>
        </div>
      </header>
      {children}
      <div className="studio-actions">
        <button className="gw-btn gw-btn--secondary" type="button" onClick={onBack}>
          {pick({ en: 'Back', ar: 'رجوع' })}
        </button>
        <button className="gw-btn gw-btn--primary" type="button" onClick={onContinue}>
          {pick({ en: 'Continue to Review', ar: 'متابعة إلى المراجعة' })}
        </button>
      </div>
    </section>
  );
}
