import type { ReactElement } from 'react';
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
  const identityNumber = ['game-jersey', 'game-set', 'game-shorts', 'basketball'].includes(props.productType)
    ? props.playerNumber
    : '';

  // Phase 1 keeps the entire public configurator available while deliberately
  // removing the 3D presentation layer from the customer experience. The 3D
  // components and model assets remain in the project for a future re-enable.
  if (props.productType === 'game-set') {
    return (
      <div className="cx-concept-stage cx-concept-stage--game-set cx-color-surface" data-body-color={bodyKey} data-trim-color={trimKey}>
        <div className="cx-game-set-2d" aria-label={props.label}>
          <div className="cx-concept cx-concept--game-jersey">
            <Identity teamName={props.teamName} logoPreview={props.logoPreview} number={identityNumber} />
          </div>
          <div className="cx-concept cx-concept--shorts">
            <Identity teamName={props.teamName} logoPreview={props.logoPreview} number={identityNumber} />
          </div>
        </div>
        <p>{props.label}</p>
        <small>Concept preview · final artwork and production placement are confirmed with Shababuna.</small>
      </div>
    );
  }

  return <div className={`cx-concept-stage cx-concept-stage--${props.productType} cx-color-surface`} data-body-color={bodyKey} data-trim-color={trimKey}>
    <div className={`cx-concept cx-concept--${props.productType}`}>
      <Identity teamName={props.teamName} logoPreview={props.logoPreview} number={identityNumber} />
    </div>
    <p>{props.label}</p>
    <small>Concept preview · final artwork and production placement are confirmed with Shababuna.</small>
  </div>;
}
