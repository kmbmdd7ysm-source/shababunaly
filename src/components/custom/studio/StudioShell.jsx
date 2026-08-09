import { Link } from 'react-router-dom';

/**
 * Shared Customize studio chrome — step rail + dual-pane lab layout.
 * Steps keep their own state in CustomizePage / future step modules.
 */
export default function StudioShell({ pick, steps, step, setStep, stage, children }) {
  return (
    <div className="gw-lab">
      <nav
        className="gw-lab-steps"
        aria-label={pick({ en: 'Customize steps', ar: 'خطوات التخصيص' })}
      >
        {steps.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className={`gw-lab-step${step === entry.key ? ' is-active' : ''}`}
            aria-current={step === entry.key ? 'step' : undefined}
            onClick={() => setStep(entry.key)}
          >
            {pick({ en: entry.en, ar: entry.ar })}
          </button>
        ))}
        <Link className="gw-lab-help" to="/help">
          {pick({ en: 'Help', ar: 'مساعدة' })}
        </Link>
      </nav>
      <div className="gw-lab-layout">
        <div className="gw-lab-stage">{stage}</div>
        <div className="gw-lab-panel">{children}</div>
      </div>
    </div>
  );
}
