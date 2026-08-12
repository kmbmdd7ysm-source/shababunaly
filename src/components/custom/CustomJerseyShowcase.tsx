import '../product/engines/loadModelViewer.ts';
import { useEffect, useRef, type ReactElement } from 'react';
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

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const apply = () => {
      try {
        node.model?.materials?.forEach((material, index) => {
          const materialName = String(material.name || '');
          // The owner-supplied GLB exposes four material groups. Keep the mesh and
          // garment construction untouched; use the two plain/fabric groups for
          // the body and the remaining edge/detail groups for trim.
          const next = BODY_MATERIALS.has(materialName) || index === 0 || index === 2 ? bodyColor : trimColor;
          material.pbrMetallicRoughness?.setBaseColorFactor?.(next);
        });
      } catch {
        // The official GLB still renders if a browser does not expose material controls.
      }
    };
    node.addEventListener('load', apply);
    apply();
    return () => node.removeEventListener('load', apply);
  }, [bodyColor, trimColor]);

  return (
    <div className="cx-jersey-stage cx-color-surface" data-body-color={customColorKey(bodyColor)} data-trim-color={customColorKey(trimColor)}>
      <model-viewer
        ref={ref as never}
        className="cx-jersey-model"
        src="/models/basketball_jersey.glb"
        alt="Shababuna custom basketball jersey"
        interaction-prompt="none"
        scale="0.001 0.001 0.001"
        camera-target="0m 1.14m 0m"
        camera-orbit="0deg 75deg 2.45m"
        shadow-intensity="0.42"
        exposure="1.04"
        field-of-view="28deg"
      />
      <div className="cx-jersey-brand" aria-hidden="true">SHABABUNA</div>
      {logoPreview ? <img className="cx-jersey-logo" src={logoPreview} alt="" /> : null}
      <div className="cx-jersey-team" aria-hidden="true">{teamName || 'SHABABUNA'}</div>
      <div className="cx-jersey-number" aria-hidden="true">{playerNumber || '00'}</div>
      <div className="cx-jersey-player" aria-hidden="true">{playerName || ''}</div>
      <p className="cx-jersey-note">3D concept preview · garment construction stays fixed · final production proof is confirmed with our team.</p>
    </div>
  );
}
