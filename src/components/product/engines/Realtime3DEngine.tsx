import './loadModelViewer.ts';
import { useEffect, useState, type ReactElement } from 'react';
import type { LocaleValue } from '../../../context/LanguageContext';
import StaticMediaEngine from './StaticMediaEngine';

type PickFn = (value: LocaleValue) => string;

type Realtime3DEngineProps = {
  model?: string | undefined;
  fallbackSrc?: string | undefined;
  alt?: string | undefined;
  eager?: boolean | undefined;
  pick: PickFn;
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          'camera-controls'?: boolean;
          'touch-action'?: string;
          'shadow-intensity'?: string | number;
          exposure?: string | number;
          className?: string;
        },
        HTMLElement
      >;
    }
  }
}

/**
 * Level A — verified real-time 3D from .glb/.gltf.
 * Model-viewer loads via JS side-effect so package .d.ts never enters tsc.
 */
export default function Realtime3DEngine({
  model,
  fallbackSrc,
  alt,
  eager,
  pick,
}: Realtime3DEngineProps): ReactElement {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    setSupported(Boolean(gl) && Boolean(model));
  }, [model]);

  if (!supported) {
    return (
      <div className="gw-viewer-stage">
        <StaticMediaEngine
          src={String(fallbackSrc || '')}
          alt={String(alt || '')}
          {...(eager !== undefined ? { eager } : {})}
        />
        <p className="gw-spec gw-viewer-note">
          {pick({
            en: 'Verified 3D model is prepared, but real-time viewing is unavailable here — showing verified photograph.',
            ar: 'النموذج ثلاثي الأبعاد موثّق لكن العرض المباشر غير متاح هنا — تُعرض صورة موثّقة.',
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="gw-viewer-stage gw-viewer-stage--3d">
      <model-viewer
        className="gw-model-viewer"
        src={String(model || '')}
        alt={String(alt || '')}
        camera-controls
        touch-action="pan-y"
        shadow-intensity="0.6"
        exposure="1"
      />
    </div>
  );
}
