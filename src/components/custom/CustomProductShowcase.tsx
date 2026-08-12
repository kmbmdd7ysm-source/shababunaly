import type { ReactElement } from 'react';
import CustomJerseyShowcase from './CustomJerseyShowcase';
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

function Identity({ teamName, logoPreview, number }: { teamName: string; logoPreview?: string; number?: string }) {
  return <div className="cx-concept-identity" aria-hidden="true">
    {logoPreview ? <img src={logoPreview} alt="" /> : null}
    <strong>{teamName || 'SHABABUNA'}</strong>
    {number ? <b>{number}</b> : null}
  </div>;
}

export default function CustomProductShowcase(props: Props): ReactElement {
  const bodyKey = customColorKey(props.bodyColor);
  const trimKey = customColorKey(props.trimColor);
  if (props.productType === 'game-jersey') return <CustomJerseyShowcase {...props} />;
  if (props.productType === 'game-set') {
    return <div className="cx-game-set-stage cx-color-surface" data-body-color={bodyKey} data-trim-color={trimKey}>
      <div className="cx-game-set-jersey"><CustomJerseyShowcase {...props} /></div>
      <div className="cx-concept cx-concept--shorts"><Identity teamName={props.teamName} logoPreview={props.logoPreview} number={props.playerNumber} /></div>
    </div>;
  }
  return <div className={`cx-concept-stage cx-concept-stage--${props.productType} cx-color-surface`} data-body-color={bodyKey} data-trim-color={trimKey}>
    <div className={`cx-concept cx-concept--${props.productType}`}>
      <Identity teamName={props.teamName} logoPreview={props.logoPreview} number={['game-shorts','basketball'].includes(props.productType) ? props.playerNumber : ''} />
    </div>
    <p>{props.label}</p>
    <small>Concept preview · final artwork and production placement are confirmed with Shababuna.</small>
  </div>;
}
