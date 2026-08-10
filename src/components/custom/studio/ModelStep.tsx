import type { ReactElement, ReactNode } from 'react';

type PickFn = (value: { en?: string; ar?: string } | string) => string;

export default function ModelStep({
  pick,
  stage,
  onBack,
  onContinue,
}: {
  pick: PickFn;
  stage: ReactNode;
  onBack: () => void;
  onContinue: () => void;
}): ReactElement {
  return (
    <section className="gw-toolbench gw-toolbench--stage-first" aria-labelledby="custom-model-title">
      <header className="gw-toolbench-head">
        <div>
          <p className="gw-kicker">{pick({ en: 'Model', ar: 'النموذج' })}</p>
          <h2 id="custom-model-title" className="gw-toolbench-title">
            {pick({ en: 'Concept 3D stage', ar: 'مسرح ثلاثي الأبعاد المفاهيمي' })}
          </h2>
          <p className="gw-toolbench-lede">
            {pick({
              en: 'Orbit the concept. Factory geometry appears only when verified.',
              ar: 'أدر النموذج. هندسة المصنع تظهر فقط بعد التحقق.',
            })}
          </p>
        </div>
      </header>
      <div className="gw-toolbench-stage">{stage}</div>
      <div className="studio-actions">
        <button className="gw-btn gw-btn--secondary" type="button" onClick={onBack}>
          {pick({ en: 'Back', ar: 'رجوع' })}
        </button>
        <button className="gw-btn gw-btn--primary" type="button" onClick={onContinue}>
          {pick({ en: 'Continue to Design', ar: 'متابعة إلى التصميم' })}
        </button>
      </div>
    </section>
  );
}
