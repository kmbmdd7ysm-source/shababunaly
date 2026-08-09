import '@google/model-viewer';
import { useEffect, useState } from 'react';
import StaticMediaEngine from './StaticMediaEngine';

/**
 * Level A — verified real-time 3D from .glb/.gltf.
 * Renders <model-viewer> only when the custom element is already registered
 * (application may load @google/model-viewer as an optional peer). Never claims
 * 3D when WebGL/model support is missing — falls back to verified photography.
 */
export default function Realtime3DEngine({ model, fallbackSrc, alt, eager, pick }) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    setSupported(Boolean(gl) && Boolean(model));
  }, [model]);

  if (!supported) {
    return (
      <div className="gw-viewer-stage">
        <StaticMediaEngine src={fallbackSrc} alt={alt} eager={eager} />
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
        src={model}
        alt={alt}
        camera-controls
        touch-action="pan-y"
        shadow-intensity="0.6"
        exposure="1"
      />
    </div>
  );
}
