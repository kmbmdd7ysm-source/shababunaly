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

  // The public configurator always renders ONE selected product. The previous
  // game-set composition mounted a 3D jersey and a large CSS shorts object at
  // the same time, which produced the black block seen in production.
  if (props.productType === 'game-jersey' || props.productType === 'game-set') {
    return (
      <div className="cx-selected-product-stage">
        <CustomJerseyShowcase {...props} />
        {props.productType === 'game-set' ? (
          <div className="cx-set-companion" aria-label="Matching shorts included">
            <div className="cx-concept cx-concept--shorts cx-color-surface" data-body-color={bodyKey} data-trim-color={trimKey}>
              <Identity teamName={props.teamName} logoPreview={props.logoPreview} number={props.playerNumber} />
            </div>
            <span>Matching shorts</span>
          </div>
        ) : null}
      </div>
    );
  }

  return <div className={`cx-concept-stage cx-concept-stage--${props.productType} cx-color-surface`} data-body-color={bodyKey} data-trim-color={trimKey}>
    <div className={`cx-concept cx-concept--${props.productType}`}>
      <Identity teamName={props.teamName} logoPreview={props.logoPreview} number={['game-shorts','basketball'].includes(props.productType) ? props.playerNumber : ''} />
    </div>
    <p>{props.label}</p>
    <small>Concept preview · final artwork and production placement are confirmed with Shababuna.</small>
  </div>;
}
