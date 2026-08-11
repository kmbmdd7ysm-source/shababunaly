import '../product/engines/loadModelViewer.ts';
import { useEffect, useRef, type ReactElement } from 'react';

type ModelViewerElement = HTMLElement & {
  model?: {
    materials?: Array<{
      pbrMetallicRoughness?: { setBaseColorFactor?: (value: string | number[]) => void };
    }>;
  };
};

export default function CustomJerseyShowcase({
  color,
  teamName,
  playerName,
  playerNumber,
  logoPreview,
}: {
  color: string;
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
        node.model?.materials?.forEach((material) => {
          material.pbrMetallicRoughness?.setBaseColorFactor?.(color);
        });
      } catch {
        // The supplied GLB remains usable even when a material does not expose runtime colour controls.
      }
    };
    node.addEventListener('load', apply);
    apply();
    return () => node.removeEventListener('load', apply);
  }, [color]);

  return (
    <div className="cx-jersey-stage">
      <model-viewer
        ref={ref as never}
        className="cx-jersey-model"
        src="/models/basketball_jersey.glb"
        alt="Shababuna custom basketball jersey"
        camera-controls
        touch-action="pan-y"
        shadow-intensity="0.55"
        exposure="1"
      />
      <div className="cx-jersey-brand" aria-hidden="true">SHABABUNA</div>
      {logoPreview ? <img className="cx-jersey-logo" src={logoPreview} alt="" /> : null}
      <div className="cx-jersey-team" aria-hidden="true">{teamName || 'SHABABUNA'}</div>
      <div className="cx-jersey-number" aria-hidden="true">{playerNumber || '00'}</div>
      <div className="cx-jersey-player" aria-hidden="true">{playerName || ''}</div>
      <p className="cx-jersey-note">3D concept preview · final production proof is confirmed with our team.</p>
    </div>
  );
}
