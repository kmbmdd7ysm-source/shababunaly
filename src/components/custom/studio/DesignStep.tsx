import type { ReactElement, ReactNode } from 'react';

type PickFn = (value: { en?: string; ar?: string } | string) => string;

/**
 * Design step dock — WebGL stage is owned by CustomizeShell.
 * This component owns the tool tray chrome and primary actions.
 */
export default function DesignStep({
  pick,
  busy,
  onSave,
  onBack,
  onContinue,
  children,
}: {
  pick: PickFn;
  busy: boolean;
  onSave: () => void | Promise<void>;
  onBack: () => void;
  onContinue: () => void;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="gw-toolbench" aria-labelledby="custom-design-title">
      <header className="gw-toolbench-head">
        <div>
          <p className="gw-kicker">{pick({ en: 'Design', ar: 'التصميم' })}</p>
          <h2 id="custom-design-title" className="gw-toolbench-title">
            {pick({ en: 'Build the visual direction', ar: 'ابنِ الاتجاه البصري' })}
          </h2>
          <p className="gw-toolbench-lede">
            {pick({
              en: 'Colors and identity update the concept 3D stage live. A factory proof is still required before production.',
              ar: 'الألوان والهوية تحدّث المسرح ثلاثي الأبعاد المفاهيمي مباشرة. ما زالت بروفة المصنع مطلوبة قبل الإنتاج.',
            })}
          </p>
        </div>
        <button
          className="gw-btn gw-btn--secondary"
          type="button"
          onClick={() => {
            void onSave();
          }}
          disabled={busy}
        >
          {pick({ en: 'Save Design', ar: 'حفظ التصميم' })}
        </button>
      </header>
      <p className="gw-toolbench-accuracy" role="status">
        {pick({
          en: 'Customer concept preview — not factory-accurate until CAD patterns and approvals are supplied.',
          ar: 'معاينة مفهوم العميل — ليست دقيقة للمصنع حتى تتوفر نماذج CAD والاعتمادات.',
        })}
      </p>
      {children}
      <div className="studio-actions">
        <button className="gw-btn gw-btn--secondary" type="button" onClick={onBack}>
          {pick({ en: 'Back', ar: 'رجوع' })}
        </button>
        <button className="gw-btn gw-btn--primary" type="button" onClick={onContinue}>
          {pick({ en: 'Continue to Roster', ar: 'متابعة إلى القائمة' })}
        </button>
      </div>
    </section>
  );
}
