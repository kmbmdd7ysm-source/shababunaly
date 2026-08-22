import type { ReactElement } from 'react';
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
  const bodyKey = customColorKey(props.bodyColor);
  const trimKey = customColorKey(props.trimColor);
  const media = STAGE_MEDIA[props.productType] || E.shanghaiPlayers;
  const showsPlayerIdentity = props.productType === 'game-jersey' || props.productType === 'game-set';

  return (
    <div className="cx-media-stage" data-body-color={bodyKey} data-trim-color={trimKey} aria-label={props.label}>
      <img src={media} alt="" className="cx-media-stage__image" />
      <span className="cx-media-stage__shade" aria-hidden="true" />
      <div className="cx-media-stage__content">
        <p>SHABABUNA CUSTOM</p>
        <strong>{props.label}</strong>
        <div className="cx-media-stage__identity" aria-label="Current customization selections">
          <span className="cx-media-stage__swatch" data-color={bodyKey} aria-label={`Body color ${bodyKey}`} />
          <span className="cx-media-stage__swatch" data-color={trimKey} aria-label={`Trim color ${trimKey}`} />
          <b>{props.teamName || 'SHABABUNA'}</b>
          {showsPlayerIdentity && props.playerName ? <em>{props.playerName}</em> : null}
          {showsPlayerIdentity && props.playerNumber ? <i>{props.playerNumber}</i> : null}
          {props.logoPreview ? <img src={props.logoPreview} alt="" className="cx-media-stage__logo" /> : null}
        </div>
      </div>
    </div>
  );
}
