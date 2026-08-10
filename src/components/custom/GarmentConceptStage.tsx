import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import '../../styles/garment-concept.css';

type ViewPreset = 'front' | 'back' | 'left' | 'right' | 'detail';

const PRESETS: Record<ViewPreset, { y: number; x: number }> = {
  front: { y: 0, x: -8 },
  back: { y: 180, x: -8 },
  left: { y: -90, x: -8 },
  right: { y: 90, x: -8 },
  detail: { y: 28, x: -18 },
};

type GarmentConceptStageProps = {
  productLabel?: string;
};

/**
 * Legally safe CONCEPT 3D development fixture — procedural garment stage.
 * Not factory-accurate. Not a catalogue product model.
 */
export default function GarmentConceptStage({
  productLabel = '',
}: GarmentConceptStageProps): ReactElement {
  const { pick } = useLanguage();
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(-8);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const applyPreset = useCallback((preset: ViewPreset) => {
    setYaw(PRESETS[preset].y);
    setPitch(PRESETS[preset].x);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') setYaw((value) => value - 15);
      if (event.key === 'ArrowRight') setYaw((value) => value + 15);
      if (event.key === 'ArrowUp') setPitch((value) => Math.max(-35, value - 8));
      if (event.key === 'ArrowDown') setPitch((value) => Math.min(25, value + 8));
      if (event.key === '1') applyPreset('front');
      if (event.key === '2') applyPreset('back');
      if (event.key === '3') applyPreset('left');
      if (event.key === '4') applyPreset('right');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [applyPreset]);

  return (
    <div
      className="gw-garment"
      role="group"
      aria-label={pick({ en: 'Concept 3D stage', ar: 'مسرح ثلاثي أبعاد مفاهيمي' })}
    >
      <div className="gw-garment-badge">
        {pick({ en: 'CONCEPT 3D', ar: 'ثلاثي أبعاد مفاهيمي' })}
      </div>
      <div
        className="gw-garment-stage"
        onPointerDown={(event) => {
          dragging.current = true;
          last.current = { x: event.clientX, y: event.clientY };
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragging.current) return;
          const dx = event.clientX - last.current.x;
          const dy = event.clientY - last.current.y;
          last.current = { x: event.clientX, y: event.clientY };
          setYaw((value) => value + dx * 0.45);
          setPitch((value) => Math.max(-35, Math.min(25, value - dy * 0.35)));
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        <div
          className="gw-garment-rig"
          style={{ transform: `rotateX(${pitch}deg) rotateY(${yaw}deg)` }}
        >
          <div className="gw-garment-body">
            <span className="gw-garment-panel gw-garment-panel--front" />
            <span className="gw-garment-panel gw-garment-panel--back" />
            <span className="gw-garment-panel gw-garment-panel--left" />
            <span className="gw-garment-panel gw-garment-panel--right" />
            <span className="gw-garment-sleeve gw-garment-sleeve--l" />
            <span className="gw-garment-sleeve gw-garment-sleeve--r" />
          </div>
        </div>
      </div>
      <p className="gw-garment-caption">
        {productLabel || pick({ en: 'Blank development garment', ar: 'قطعة تطوير فارغة' })}
      </p>
      <div
        className="gw-garment-presets"
        role="toolbar"
        aria-label={pick({ en: 'Camera presets', ar: 'إعدادات الكاميرا' })}
      >
        {(Object.keys(PRESETS) as ViewPreset[]).map((preset) => (
          <button
            key={preset}
            type="button"
            className="gw-garment-preset"
            onClick={() => applyPreset(preset)}
          >
            {pick({
              en: preset,
              ar:
                preset === 'front'
                  ? 'أمام'
                  : preset === 'back'
                    ? 'خلف'
                    : preset === 'left'
                      ? 'يسار'
                      : preset === 'right'
                        ? 'يمين'
                        : 'تفاصيل',
            })}
          </button>
        ))}
      </div>
      <p className="gw-garment-help">
        {pick({
          en: 'Drag to orbit · Arrow keys rotate · Not factory geometry',
          ar: 'اسحب للدوران · الأسهم للتحريك · ليست هندسة مصنع',
        })}
      </p>
    </div>
  );
}
