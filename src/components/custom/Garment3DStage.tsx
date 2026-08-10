import type { ReactElement } from 'react';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, Shape, SRGBColorSpace } from 'three';
import { useLanguage } from '../../context/LanguageContext';
import '../../styles/garment-concept.css';

type ViewPreset = 'front' | 'back' | 'left' | 'right' | 'detail';

type Garment3DStageProps = {
  productLabel?: string;
  baseColor?: string;
  accentColor?: string;
  teamName?: string;
  playerName?: string;
  playerNumber?: string;
  pattern?: string;
  logoPreview?: string;
};

const PRESET_POS: Record<ViewPreset, [number, number, number]> = {
  front: [0, 0.25, 4.2],
  back: [0, 0.25, -4.2],
  left: [-4.2, 0.25, 0],
  right: [4.2, 0.25, 0],
  detail: [1.55, 1.05, 2.5],
};

function makeJerseyShape(): Shape {
  const shape = new Shape();
  shape.moveTo(-0.58, -0.78);
  shape.lineTo(-0.66, 0.30);
  shape.lineTo(-1.08, 0.48);
  shape.lineTo(-0.86, 0.92);
  shape.lineTo(-0.48, 0.76);
  shape.quadraticCurveTo(-0.28, 0.92, 0, 0.92);
  shape.quadraticCurveTo(0.28, 0.92, 0.48, 0.76);
  shape.lineTo(0.86, 0.92);
  shape.lineTo(1.08, 0.48);
  shape.lineTo(0.66, 0.30);
  shape.lineTo(0.58, -0.78);
  shape.quadraticCurveTo(0, -0.9, -0.58, -0.78);
  return shape;
}

function makeShortsShape(): Shape {
  const shape = new Shape();
  shape.moveTo(-0.67, 0.55);
  shape.lineTo(0.67, 0.55);
  shape.lineTo(0.74, -0.55);
  shape.lineTo(0.18, -0.68);
  shape.lineTo(0, -0.18);
  shape.lineTo(-0.18, -0.68);
  shape.lineTo(-0.74, -0.55);
  shape.closePath();
  return shape;
}

function useArtworkTexture({
  side,
  teamName,
  playerName,
  playerNumber,
  color,
  accentColor,
  pattern,
  logoPreview,
}: {
  side: 'front' | 'back';
  teamName: string;
  playerName: string;
  playerNumber: string;
  color: string;
  accentColor: string;
  pattern: string;
  logoPreview?: string;
}) {
  const [texture, setTexture] = useState<CanvasTexture | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let disposed = false;
    const drawBase = () => {
      ctx.clearRect(0, 0, 1024, 1024);

      // A restrained concept pattern. This is deliberately screen artwork,
      // not a claim about factory print placement or calibrated colour.
      if (pattern && pattern !== 'solid') {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = pattern.includes('bold') ? 54 : 28;
        const spacing = pattern.includes('micro') ? 86 : 138;
        for (let x = -900; x < 1600; x += spacing) {
          ctx.beginPath();
          ctx.moveTo(x, 1024);
          ctx.lineTo(x + 760, 0);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (side === 'front') {
        ctx.font = '700 72px Arial, sans-serif';
        ctx.fillText((teamName || 'SHABABUNA').slice(0, 18), 512, 315);
        ctx.font = '900 280px Arial, sans-serif';
        ctx.fillText((playerNumber || '00').slice(0, 2), 512, 590);
      } else {
        ctx.font = '700 60px Arial, sans-serif';
        ctx.fillText((playerName || 'PLAYER').slice(0, 14), 512, 290);
        ctx.font = '900 330px Arial, sans-serif';
        ctx.fillText((playerNumber || '00').slice(0, 2), 512, 590);
      }
    };

    const publish = () => {
      if (disposed) return;
      const next = new CanvasTexture(canvas);
      next.colorSpace = SRGBColorSpace;
      next.needsUpdate = true;
      setTexture((previous) => {
        previous?.dispose();
        return next;
      });
    };

    drawBase();
    if (side === 'front' && logoPreview) {
      const logo = new Image();
      logo.decoding = 'async';
      logo.onload = () => {
        if (disposed) return;
        drawBase();
        const max = 170;
        const ratio = Math.min(
          max / Math.max(1, logo.naturalWidth),
          max / Math.max(1, logo.naturalHeight),
        );
        const width = Math.max(1, logo.naturalWidth * ratio);
        const height = Math.max(1, logo.naturalHeight * ratio);
        ctx.drawImage(logo, 512 - width / 2, 108, width, height);
        publish();
      };
      logo.onerror = publish;
      logo.src = logoPreview;
    } else {
      publish();
    }

    return () => {
      disposed = true;
    };
  }, [accentColor, color, logoPreview, pattern, playerName, playerNumber, side, teamName]);

  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

function JerseyMesh({
  baseColor = '#1a1a1a',
  accentColor = '#c4a35a',
  teamName = '',
  playerName = '',
  playerNumber = '00',
  pattern = 'solid',
  logoPreview,
}: {
  baseColor?: string;
  accentColor?: string;
  teamName?: string;
  playerName?: string;
  playerNumber?: string;
  pattern?: string;
  logoPreview?: string;
}) {
  const shape = useMemo(makeJerseyShape, []);
  const frontArtwork = useArtworkTexture({
    side: 'front',
    teamName,
    playerName,
    playerNumber,
    color: '#f6f3eb',
    accentColor,
    pattern,
    logoPreview,
  });
  const backArtwork = useArtworkTexture({
    side: 'back',
    teamName,
    playerName,
    playerNumber,
    color: '#f6f3eb',
    accentColor,
    pattern,
  });

  return (
    <group position={[0, 0.3, 0]}>
      <mesh castShadow receiveShadow>
        <extrudeGeometry
          args={[
            shape,
            {
              depth: 0.18,
              bevelEnabled: true,
              bevelSegments: 3,
              steps: 1,
              bevelSize: 0.035,
              bevelThickness: 0.025,
            },
          ]}
        />
        <meshStandardMaterial color={baseColor} roughness={0.78} metalness={0.01} />
      </mesh>

      {/* Side-panel language: visible in orbit, driven by the selected accent. */}
      <mesh position={[-0.575, -0.08, 0.205]}>
        <boxGeometry args={[0.075, 1.1, 0.025]} />
        <meshStandardMaterial color={accentColor} roughness={0.68} />
      </mesh>
      <mesh position={[0.575, -0.08, 0.205]}>
        <boxGeometry args={[0.075, 1.1, 0.025]} />
        <meshStandardMaterial color={accentColor} roughness={0.68} />
      </mesh>

      {/* Collar ring. */}
      <mesh position={[0, 0.82, 0.235]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.25, 0.035, 18, 40]} />
        <meshStandardMaterial color={accentColor} roughness={0.55} />
      </mesh>

      {/* Live concept artwork. It is deliberately a screen concept layer, not
          a factory print claim. */}
      {frontArtwork && (
        <mesh position={[0, 0.08, 0.225]}>
          <planeGeometry args={[0.88, 0.88]} />
          <meshBasicMaterial map={frontArtwork} transparent side={DoubleSide} />
        </mesh>
      )}
      {backArtwork && (
        <mesh position={[0, 0.08, -0.018]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.88, 0.88]} />
          <meshBasicMaterial map={backArtwork} transparent side={DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function ShortsMesh({
  baseColor = '#1a1a1a',
  accentColor = '#c4a35a',
}: {
  baseColor?: string;
  accentColor?: string;
}) {
  const shape = useMemo(makeShortsShape, []);
  return (
    <group position={[0, -1.28, 0]} scale={[0.9, 0.9, 0.9]}>
      <mesh castShadow receiveShadow>
        <extrudeGeometry
          args={[
            shape,
            {
              depth: 0.18,
              bevelEnabled: true,
              bevelSegments: 3,
              bevelSize: 0.03,
              bevelThickness: 0.025,
            },
          ]}
        />
        <meshStandardMaterial color={baseColor} roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.51, 0.21]}>
        <boxGeometry args={[1.33, 0.08, 0.028]} />
        <meshStandardMaterial color={accentColor} roughness={0.62} />
      </mesh>
      <mesh position={[-0.63, -0.05, 0.21]}>
        <boxGeometry args={[0.06, 0.94, 0.028]} />
        <meshStandardMaterial color={accentColor} roughness={0.62} />
      </mesh>
      <mesh position={[0.63, -0.05, 0.21]}>
        <boxGeometry args={[0.06, 0.94, 0.028]} />
        <meshStandardMaterial color={accentColor} roughness={0.62} />
      </mesh>
    </group>
  );
}

function ConceptKit({
  productLabel,
  baseColor,
  accentColor,
  teamName,
  playerName,
  playerNumber,
  pattern,
  logoPreview,
}: Required<Pick<Garment3DStageProps, 'productLabel' | 'baseColor' | 'accentColor'>> &
  Pick<Garment3DStageProps, 'teamName' | 'playerName' | 'playerNumber' | 'pattern' | 'logoPreview'>) {
  const normalized = productLabel.toLowerCase();
  const shortsOnly = normalized.includes('short') && !normalized.includes('set');
  const fullSet = normalized.includes('set') || normalized.includes('kit');

  return (
    <group position={[0, fullSet ? 0.35 : -0.05, 0]}>
      {!shortsOnly && (
        <JerseyMesh
          baseColor={baseColor}
          accentColor={accentColor}
          teamName={teamName}
          playerName={playerName}
          playerNumber={playerNumber}
          pattern={pattern}
          logoPreview={logoPreview}
        />
      )}
      {(shortsOnly || fullSet) && <ShortsMesh baseColor={baseColor} accentColor={accentColor} />}
    </group>
  );
}

function OrbitRig({ preset }: { preset: ViewPreset }) {
  const { camera, gl } = useThree();
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const spherical = useRef({ theta: 0, phi: 1.15, radius: 4.2 });

  useEffect(() => {
    const [x, y, z] = PRESET_POS[preset];
    camera.position.set(x, y, z);
    camera.lookAt(0, 0.05, 0);
    const radius = Math.hypot(x, y - 0.05, z);
    spherical.current.radius = radius;
    spherical.current.theta = Math.atan2(x, z);
    spherical.current.phi = Math.acos(Math.min(1, Math.max(-1, (y - 0.05) / radius)));
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
        Math.PI * 0.84,
        Math.max(Math.PI * 0.18, spherical.current.phi + dy * 0.008),
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
        6,
        Math.max(2.3, spherical.current.radius + event.deltaY * 0.0025),
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
      radius * Math.cos(phi) + 0.05,
      radius * Math.sin(phi) * Math.cos(theta),
    );
    camera.lookAt(0, 0.05, 0);
  });

  return null;
}

/**
 * Genuine WebGL CONCEPT 3D stage (Three.js / React Three Fiber).
 * DEVELOPMENT_CONCEPT_MODEL — not factory-accurate, not catalogue product media.
 *
 * Unlike the former CSS pseudo-3D fixture this is real geometry, orbitable in
 * WebGL, and its material colours + concept artwork respond to the active
 * design state. Factory geometry remains externally gated.
 */
export default function Garment3DStage({
  productLabel = '',
  baseColor = '#1a1a1a',
  accentColor = '#c4a35a',
  teamName = '',
  playerName = '',
  playerNumber = '00',
  pattern = 'solid',
  logoPreview,
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
        {pick({ en: 'CONCEPT 3D · LIVE DESIGN', ar: 'ثلاثي أبعاد مفاهيمي · تصميم حي' })}
      </div>
      <div className="gw-garment-stage gw-garment-stage--canvas">
        <Canvas
          shadows
          dpr={[1, 1.6]}
          camera={{ position: [0, 0.25, 4.2], fov: 32 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          className="gw-garment-canvas"
          onCreated={({ gl }) => {
            gl.setClearColor('#090a0c', 1);
          }}
        >
          <ambientLight intensity={0.72} />
          <directionalLight castShadow position={[3.5, 5.5, 3]} intensity={1.35} />
          <directionalLight position={[-4, 2, -3]} intensity={0.52} color="#9db7c4" />
          <pointLight position={[0, -1.5, 3]} intensity={0.25} color="#e39b3d" />
          <Suspense fallback={null}>
            <ConceptKit
              productLabel={productLabel}
              baseColor={baseColor}
              accentColor={accentColor}
              teamName={teamName}
              playerName={playerName}
              playerNumber={playerNumber}
              pattern={pattern}
              logoPreview={logoPreview}
            />
          </Suspense>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.92, 0]} receiveShadow>
            <circleGeometry args={[2.5, 64]} />
            <meshStandardMaterial color="#101114" roughness={0.96} />
          </mesh>
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
          en: 'Drag to orbit · Scroll to zoom · Live concept only — factory geometry requires approved production files',
          ar: 'اسحب للدوران · مرّر للتكبير · مفهوم حي فقط — هندسة المصنع تتطلب ملفات إنتاج معتمدة',
        })}
      </p>
    </div>
  );
}
