import '../product/engines/loadModelViewer.ts';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { customColorKey } from './customColors';

type RuntimeMaterial = {
  name?: string;
  pbrMetallicRoughness?: { setBaseColorFactor?: (value: string | number[]) => void };
};
type ModelViewerElement = HTMLElement & { model?: { materials?: RuntimeMaterial[] } };

const BODY_MATERIALS = new Set(['Default_Fabric_FRONT_3574', 'Material3996']);

export default function CustomJerseyShowcase({
  bodyColor,
  trimColor,
  teamName,
  playerName,
  playerNumber,
  logoPreview,
}: {
  bodyColor: string;
  trimColor: string;
  teamName: string;
  playerName: string;
  playerNumber: string;
  logoPreview?: string;
}): ReactElement {
  const ref = useRef<ModelViewerElement | null>(null);
  const [modelState, setModelState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const apply = () => {
      try {
        node.model?.materials?.forEach((material, index) => {
          const materialName = String(material.name || '');
          const next = BODY_MATERIALS.has(materialName) || index === 0 || index === 2 ? bodyColor : trimColor;
          material.pbrMetallicRoughness?.setBaseColorFactor?.(next);
        });
      } catch {
        // Keep the verified GLB visible even when a browser exposes a reduced material API.
      }
    };
    const onLoad = () => {
      apply();
      setModelState('ready');
    };
    const onError = () => setModelState('error');
    node.addEventListener('load', onLoad);
    node.addEventListener('error', onError);
    apply();
    return () => {
      node.removeEventListener('load', onLoad);
      node.removeEventListener('error', onError);
    };
  }, [bodyColor, trimColor]);

  return (
    <div className="cx-jersey-stage cx-color-surface" data-body-color={customColorKey(bodyColor)} data-trim-color={customColorKey(trimColor)}>
      <model-viewer
        ref={ref as never}
        className="cx-jersey-model"
        src="/models/basketball_jersey.glb"
        alt="Shababuna custom basketball jersey 3D preview"
        interaction-prompt="none"
        camera-controls
        disable-pan
        scale="0.001 0.001 0.001"
        camera-target="0m 1.14m 0m"
        camera-orbit="0deg 77deg 2.2m"
        min-camera-orbit="-28deg 68deg 1.9m"
        max-camera-orbit="28deg 86deg 2.8m"
        shadow-intensity="0.32"
        shadow-softness="0.9"
        exposure="1.08"
        field-of-view="26deg"
      />
      {modelState === 'loading' ? <div className="cx-model-status" role="status">Loading 3D jersey…</div> : null}
      {modelState === 'error' ? (
        <div className="cx-model-fallback" role="status">
          <span className="cx-product-jersey-shape" aria-hidden="true" />
          <strong>3D preview unavailable on this browser.</strong>
        </div>
      ) : null}
      <div className="cx-jersey-overlay" aria-hidden="true">
        {logoPreview ? <img className="cx-jersey-logo" src={logoPreview} alt="" /> : null}
        <div className="cx-jersey-team">{teamName || 'SHABABUNA'}</div>
        <div className="cx-jersey-number">{playerNumber || '00'}</div>
        <div className="cx-jersey-player">{playerName || ''}</div>
      </div>
      <p className="cx-jersey-note">3D concept preview · garment construction stays fixed · final production placement is confirmed with our team.</p>
    </div>
  );
}
