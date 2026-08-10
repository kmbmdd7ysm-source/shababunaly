import type { ReactElement } from 'react';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useLanguage } from '../../context/LanguageContext';
import '../../styles/garment-concept.css';

type ViewPreset = 'front' | 'back' | 'left' | 'right' | 'detail';

type Garment3DStageProps = {
  productLabel?: string;
  baseColor?: string;
  accentColor?: string;
};

const PRESET_POS: Record<ViewPreset, [number, number, number]> = {
  front: [0, 0.25, 3.2],
  back: [0, 0.25, -3.2],
  left: [-3.2, 0.25, 0],
  right: [3.2, 0.25, 0],
  detail: [1.35, 0.85, 2.1],
};

function JerseyMesh({
  baseColor = '#1a1a1a',
  accentColor = '#c4a35a',
}: {
  baseColor?: string;
  accentColor?: string;
}) {
  const body = useMemo(() => [1.05, 1.35, 0.22] as [number, number, number], []);
  return (
    <group position={[0, 0.1, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.15, 0]}>
        <boxGeometry args={body} />
        <meshStandardMaterial color={baseColor} roughness={0.55} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <torusGeometry args={[0.28, 0.045, 12, 28]} />
        <meshStandardMaterial color={accentColor} roughness={0.4} metalness={0.15} />
      </mesh>
      <mesh castShadow position={[-0.72, 0.35, 0]} rotation={[0, 0, 0.45]}>
        <cylinderGeometry args={[0.16, 0.2, 0.55, 16]} />
        <meshStandardMaterial color={baseColor} roughness={0.55} metalness={0.08} />
      </mesh>
      <mesh castShadow position={[0.72, 0.35, 0]} rotation={[0, 0, -0.45]}>
        <cylinderGeometry args={[0.16, 0.2, 0.55, 16]} />
        <meshStandardMaterial color={baseColor} roughness={0.55} metalness={0.08} />
      </mesh>
      <mesh position={[-0.52, 0.05, 0]}>
        <boxGeometry args={[0.08, 1.0, 0.24]} />
        <meshStandardMaterial color={accentColor} roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[0.52, 0.05, 0]}>
        <boxGeometry args={[0.08, 1.0, 0.24]} />
        <meshStandardMaterial color={accentColor} roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[0, -0.55, 0]}>
        <boxGeometry args={[1.08, 0.08, 0.26]} />
        <meshStandardMaterial color={accentColor} roughness={0.45} metalness={0.12} />
      </mesh>
      {/* Ground disc for depth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.85, 0]} receiveShadow>
        <circleGeometry args={[2.2, 48]} />
        <meshStandardMaterial color="#141414" roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}

function OrbitRig({ preset }: { preset: ViewPreset }) {
  const { camera, gl } = useThree();
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const spherical = useRef({ theta: 0, phi: 1.15, radius: 3.2 });

  useEffect(() => {
    const [x, y, z] = PRESET_POS[preset];
    camera.position.set(x, y, z);
    camera.lookAt(0, 0.15, 0);
    const radius = Math.hypot(x, y - 0.15, z);
    spherical.current.radius = radius;
    spherical.current.theta = Math.atan2(x, z);
    spherical.current.phi = Math.acos(Math.min(1, Math.max(-1, (y - 0.15) / radius)));
  }, [camera, preset]);

  useEffect(() => {
    const el = gl.domElement;
    const onDown = (event: PointerEvent) => {
      dragging.current = true;
      last.current = { x: event.clientX, y: event.clientY };
      el.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      const dx = event.clientX - last.current.x;
      const dy = event.clientY - last.current.y;
      last.current = { x: event.clientX, y: event.clientY };
      spherical.current.theta -= dx * 0.008;
      spherical.current.phi = Math.min(
        Math.PI * 0.85,
        Math.max(Math.PI * 0.2, spherical.current.phi + dy * 0.008),
      );
    };
    const onUp = (event: PointerEvent) => {
      dragging.current = false;
      try {
        el.releasePointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      spherical.current.radius = Math.min(
        5,
        Math.max(1.8, spherical.current.radius + event.deltaY * 0.002),
      );
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, [gl]);

  useFrame(() => {
    const { theta, phi, radius } = spherical.current;
    camera.position.set(
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi) + 0.15,
      radius * Math.sin(phi) * Math.cos(theta),
    );
    camera.lookAt(0, 0.15, 0);
  });

  return null;
}

/**
 * Genuine WebGL CONCEPT 3D stage (Three.js / React Three Fiber).
 * DEVELOPMENT_CONCEPT_MODEL — not factory-accurate, not catalogue product media.
 */
export default function Garment3DStage({
  productLabel = '',
  baseColor = '#1a1a1a',
  accentColor = '#c4a35a',
}: Garment3DStageProps): ReactElement {
  const { pick } = useLanguage();
  const [preset, setPreset] = useState<ViewPreset>('front');
  const presets: ViewPreset[] = ['front', 'back', 'left', 'right', 'detail'];

  return (
    <div
      className="gw-garment gw-garment--webgl"
      role="group"
      aria-label={pick({ en: 'Concept 3D WebGL stage', ar: 'مسرح ثلاثي الأبعاد المفاهيمي' })}
    >
      <div className="gw-garment-badge">
        {pick({ en: 'CONCEPT 3D · DEVELOPMENT FIXTURE', ar: 'ثلاثي أبعاد مفاهيمي · نموذج تطوير' })}
      </div>
      <div className="gw-garment-stage gw-garment-stage--canvas">
        <Canvas
          shadows
          dpr={[1, 1.75]}
          camera={{ position: [0, 0.25, 3.2], fov: 35 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: '100%', height: '100%', touchAction: 'none' }}
          onCreated={({ gl }) => {
            gl.setClearColor('#0d0d0d', 1);
          }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight castShadow position={[3, 5, 2]} intensity={1.15} />
          <directionalLight position={[-3, 2, -2]} intensity={0.4} />
          <Suspense fallback={null}>
            <JerseyMesh baseColor={baseColor} accentColor={accentColor} />
          </Suspense>
          <OrbitRig preset={preset} />
        </Canvas>
      </div>
      <p className="gw-garment-caption">
        {productLabel || pick({ en: 'Blank development garment', ar: 'قطعة تطوير فارغة' })}
      </p>
      <div
        className="gw-garment-presets"
        role="toolbar"
        aria-label={pick({ en: 'Camera presets', ar: 'إعدادات الكاميرا' })}
      >
        {presets.map((item) => (
          <button
            key={item}
            type="button"
            className={`gw-garment-preset${preset === item ? ' is-active' : ''}`}
            onClick={() => setPreset(item)}
          >
            {pick({
              en: item,
              ar:
                item === 'front'
                  ? 'أمام'
                  : item === 'back'
                    ? 'خلف'
                    : item === 'left'
                      ? 'يسار'
                      : item === 'right'
                        ? 'يمين'
                        : 'تفاصيل',
            })}
          </button>
        ))}
      </div>
      <p className="gw-garment-help">
        {pick({
          en: 'Drag to orbit · Scroll to zoom · WebGL concept fixture — not factory geometry',
          ar: 'اسحب للدوران · مرّر للتكبير · نموذج مفاهيمي WebGL — ليست هندسة مصنع',
        })}
      </p>
    </div>
  );
}
