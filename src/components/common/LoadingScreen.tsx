import { SITE } from '../../config.ts';
import { useLanguage } from '../../context/LanguageContext';

export default function LoadingScreen() {
  const { t, pick } = useLanguage();
  const a11y = (t.a11y as { loading?: string } | undefined) || {};
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <img src={SITE.logo} alt="" width="88" height="88" />
      <div className="loading-ring" aria-hidden="true" />
      <strong>{SITE.shortName}</strong>
      <span className="sr-only">{a11y.loading}</span>
      <span className="loading-slogan">{pick(SITE.slogan)}</span>
    </div>
  );
}
