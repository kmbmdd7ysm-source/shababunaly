import type { ReactElement } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import '../../styles/placeholder-stage.css';

type PremiumPlaceholderStageProps = {
  name: string;
  category?: string;
  aspect?: 'portrait' | 'square' | 'wide';
  conceptLabel?: boolean;
};

/**
 * Unified premium presentation for products without verified photography.
 * Honest concept label — never claims multi-angle / 360 / lifestyle.
 */
export default function PremiumPlaceholderStage({
  name,
  category = '',
  aspect = 'portrait',
  conceptLabel = true,
}: PremiumPlaceholderStageProps): ReactElement {
  const { pick } = useLanguage();
  return (
    <div className={`gw-ph-stage gw-ph-stage--${aspect}`} data-category={category || 'general'}>
      <div className="gw-ph-silhouette" aria-hidden="true" />
      <div className="gw-ph-copy">
        <p className="gw-ph-name">{name}</p>
        {conceptLabel ? (
          <p className="gw-ph-label">
            {pick({ en: 'Concept presentation', ar: 'عرض مفاهيمي' })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
