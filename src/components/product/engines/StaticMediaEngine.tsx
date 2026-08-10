import type { ReactElement } from 'react';
import SmartImage from '../../common/SmartImage';
import PremiumPlaceholderStage from '../PremiumPlaceholderStage';

function isConceptMedia(src?: string): boolean {
  if (!src) return true;
  return /(?:^|\/)(?:images\/catalog\/|placeholder|concept)|\.svg(?:$|\?)/i.test(src);
}

export default function StaticMediaEngine({
  src,
  alt,
  eager = false,
  productName,
  category,
}: {
  src?: string;
  alt?: string;
  eager?: boolean;
  productName?: string;
  category?: string;
}): ReactElement {
  if (isConceptMedia(src)) {
    return (
      <PremiumPlaceholderStage
        name={String(productName || alt || 'Shababuna')}
        category={String(category || '')}
        aspect="portrait"
        conceptLabel
      />
    );
  }

  return (
    <SmartImage
      {...(src ? { src } : {})}
      {...(alt ? { alt } : {})}
      width={900}
      height={1125}
      eager={eager}
      className="gw-viewer-image"
      sizes="(min-width: 900px) 50vw, 100vw"
    />
  );
}
