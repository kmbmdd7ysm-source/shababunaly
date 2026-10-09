import type { ReactElement } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { EDITORIAL as E } from '../../data/editorialAssets';
import { customColorKey } from './customColors';

type Props = {
  productType: string;
  bodyColor: string;
  trimColor: string;
  teamName: string;
  playerName: string;
  playerNumber: string;
  logoPreview?: string;
  label: string;
};

const STAGE_MEDIA: Record<string, string> = {
  'game-set': E.franceGroup,
  'game-jersey': E.lebronUsa,
  'game-shorts': E.curryPatternRear,
  'practice-set': E.curryDrive,
  'shooting-shirt': E.tatumKids,
  hoodie: E.curryWhiteHoodClose,
  'team-pants': E.lameloSpaceStanding,
  tracksuit: E.lebronShanghai,
  'team-bag': E.eventSigning,
  sleeve: E.lebronClose,
  basketball: E.curryHeroBall,
  'hoop-padding': E.jordanDunkEvent,
};

export default function CustomProductShowcase(props: Props): ReactElement {
  const { pick, lang } = useLanguage();
  const bodyKey = customColorKey(props.bodyColor);
  const trimKey = customColorKey(props.trimColor);
  const media = STAGE_MEDIA[props.productType] || E.shanghaiPlayers;
  const showsPlayerIdentity = props.productType === 'game-jersey' || props.productType === 'game-set';

  return (
    <div className="cx-media-stage" role="group" data-body-color={bodyKey} data-trim-color={trimKey} aria-label={props.label}>
      <img src={media} alt="" className="cx-media-stage__image" />
      <span className="cx-media-stage__shade" aria-hidden="true" />
      <div className="cx-media-stage__content">
        <p>{pick({ en: 'SHABABUNA CUSTOM', ar: 'تخصيص شبابنا' })}</p>
        <strong>{props.label}</strong>
        <div className="cx-media-stage__identity" role="group" aria-label={pick({ en: 'Current customization selections', ar: 'خيارات التخصيص الحالية' })}>
          <span className="cx-media-stage__swatch" role="img" data-color={bodyKey} aria-label={pick({ en: `Body color ${bodyKey}`, ar: `لون القماش ${bodyKey}` })} />
          <span className="cx-media-stage__swatch" role="img" data-color={trimKey} aria-label={pick({ en: `Trim color ${trimKey}`, ar: `لون الحواف ${trimKey}` })} />
          <b>{props.teamName || (lang === 'ar' ? 'شبابنا' : 'SHABABUNA')}</b>
          {showsPlayerIdentity && props.playerName ? <em>{props.playerName}</em> : null}
          {showsPlayerIdentity && props.playerNumber ? <i>{props.playerNumber}</i> : null}
          {props.logoPreview ? <img src={props.logoPreview} alt="" className="cx-media-stage__logo" /> : null}
        </div>
      </div>
    </div>
  );
}
