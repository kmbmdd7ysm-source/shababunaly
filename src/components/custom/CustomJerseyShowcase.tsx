import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useLanguage } from '../../context/LanguageContext';
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
  const { pick } = useLanguage();
  const ref = useRef<ModelViewerElement | null>(null);
  const [modelRequested, setModelRequested] = useState(false);
  const [modelModuleReady, setModelModuleReady] = useState(false);
  const [modelState, setModelState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  // The verified GLB is intentionally large. Never download it as part of the
  // initial Custom page payload: only load the model-viewer engine and attach
  // the GLB after the customer explicitly asks for the 3D preview.
  useEffect(() => {
    if (!modelRequested) return undefined;
    let active = true;
    setModelState('loading');
    void import('../product/engines/loadModelViewer.ts')
      .then(() => {
        if (active) setModelModuleReady(true);
      })
      .catch(() => {
        if (active) setModelState('error');
      });
    return () => {
      active = false;
    };
  }, [modelRequested]);

  useEffect(() => {
    if (!modelModuleReady) return undefined;
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
  }, [bodyColor, trimColor, modelModuleReady]);

  return (
    <div className="cx-jersey-stage cx-color-surface" data-body-color={customColorKey(bodyColor)} data-trim-color={customColorKey(trimColor)}>
      {modelModuleReady && modelState !== 'error' ? (
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
      ) : null}

      {modelState === 'idle' ? (
        <div className="cx-model-gate">
          <span className="cx-product-jersey-shape" aria-hidden="true" />
          <strong>{pick({ en: 'Interactive 3D preview', ar: 'معاينة ثلاثية الأبعاد تفاعلية' })}</strong>
          <button type="button" className="btn-secondary" onClick={() => setModelRequested(true)}>
            {pick({ en: 'Open 3D preview', ar: 'فتح المعاينة ثلاثية الأبعاد' })}
          </button>
          <small>{pick({ en: 'Loads only when you open it to keep this page fast.', ar: 'يتم تحميلها فقط عند فتحها للحفاظ على سرعة الصفحة.' })}</small>
        </div>
      ) : null}
      {modelState === 'loading' ? <div className="cx-model-status" role="status">{pick({ en: 'Loading 3D jersey…', ar: 'جارٍ تحميل القميص ثلاثي الأبعاد…' })}</div> : null}
      {modelState === 'error' ? (
        <div className="cx-model-fallback" role="status">
          <span className="cx-product-jersey-shape" aria-hidden="true" />
          <strong>{pick({ en: '3D preview is unavailable on this browser.', ar: 'المعاينة ثلاثية الأبعاد غير متاحة على هذا المتصفح.' })}</strong>
          <button type="button" className="btn-secondary" onClick={() => { setModelModuleReady(false); setModelState('idle'); setModelRequested(false); }}>
            {pick({ en: 'Try again', ar: 'حاول مرة أخرى' })}
          </button>
        </div>
      ) : null}
      <div className="cx-jersey-overlay" aria-hidden="true">
        {logoPreview ? <img className="cx-jersey-logo" src={logoPreview} alt="" /> : null}
        <div className="cx-jersey-team">{teamName || 'SHABABUNA'}</div>
        <div className="cx-jersey-number">{playerNumber || '00'}</div>
        <div className="cx-jersey-player">{playerName || ''}</div>
      </div>
      <p className="cx-jersey-note">{pick({ en: '3D concept preview · garment construction stays fixed · final production placement is confirmed with our team.', ar: 'معاينة ثلاثية الأبعاد للمفهوم · بنية القطعة ثابتة · يتم اعتماد مواضع الطباعة النهائية مع فريقنا.' })}</p>
    </div>
  );
}
