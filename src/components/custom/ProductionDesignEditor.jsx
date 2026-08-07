import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { getCustomProductType } from '../../data/customization';
import {
  DESIGN_VIEWS, addDesignComment, addDesignLayer, createDefaultStudio, createHistory, duplicateDesignLayer,
  moveDesignLayer, normalizeStudio, pushHistory, redoHistory, removeDesignLayer, resolveDesignComment,
  undoHistory, updateDesignLayer,
} from '../../services/designStudio';

const FONT_STACK = {
  block: 'Impact, Arial Black, sans-serif',
  condensed: 'Arial Narrow, Arial, sans-serif',
  modern: 'Inter, system-ui, sans-serif',
};

function ProductBase({ design, view }) {
  const product = getCustomProductType(design.productType);
  const preview = product.preview;
  const side = view === 'side';
  const suffix = `${String(design.productType || 'custom').replace(/[^a-z0-9-]/gi, '')}-${view}`;
  const fill = design.pattern === 'gradient' ? `url(#prod-gradient-${suffix})` : design.pattern === 'geometric' ? `url(#prod-grid-${suffix})` : design.primary;
  const defs = <defs><linearGradient id={`prod-gradient-${suffix}`} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor={design.primary} /><stop offset="1" stopColor={design.secondary} /></linearGradient><pattern id={`prod-grid-${suffix}`} width="42" height="42" patternUnits="userSpaceOnUse" patternTransform="rotate(28)"><rect width="42" height="42" fill={design.primary} /><rect width="13" height="42" fill={design.secondary} opacity=".24" /><rect x="29" width="5" height="42" fill={design.accent} opacity=".55" /></pattern></defs>;
  const top = <g transform={side ? 'translate(170 70) scale(.56 1)' : 'translate(55 38)'}><path d="M126 20L190 60H300L364 20L456 96L416 180L374 152V548H116V152L74 180L34 96Z" fill={fill} stroke={design.secondary} strokeWidth="7" />{design.pattern === 'side-stripe' && <><path d="M115 150H153V548H115Z" fill={design.secondary} /><path d="M337 150H375V548H337Z" fill={design.secondary} /></>}{design.pattern === 'split' && <path d="M245 60H416V548H245Z" fill={design.secondary} opacity=".28" />}<path d={design.neckline === 'v-neck' ? 'M190 60L245 132L300 60' : design.neckline === 'crew' ? 'M190 60Q245 112 300 60' : 'M190 60Q245 145 300 60'} fill="none" stroke={design.secondary} strokeWidth="16" /></g>;
  const shorts = <g transform={side ? 'translate(220 205) scale(.42 1)' : 'translate(92 42)'}><path d="M132 360H358L392 655L260 650L245 520L230 650L98 655Z" fill={fill} stroke={design.secondary} strokeWidth="8" />{design.pattern === 'side-stripe' && <><path d="M101 382H139L160 630H113Z" fill={design.secondary}/><path d="M351 382H389L377 630H330Z" fill={design.secondary}/></>}</g>;
  let artwork;
  if (preview === 'uniform') artwork = <>{top}{shorts}</>;
  else if (preview === 'jersey' || preview === 'shirt') artwork = top;
  else if (preview === 'shorts') artwork = shorts;
  else if (preview === 'hoodie') artwork = <g transform={side ? 'translate(175 60) scale(.55 1)' : 'translate(55 25)'}><path d="M185 34Q245 -8 305 34L345 80L452 132L405 242L374 220V594H116V220L85 242L38 132L145 80Z" fill={fill} stroke={design.secondary} strokeWidth="8"/><path d="M185 34Q245 118 305 34" fill="none" stroke={design.secondary} strokeWidth="12"/><path d="M192 436Q245 476 298 436V525H192Z" fill="none" stroke={design.secondary} strokeWidth="7"/></g>;
  else if (preview === 'pants') artwork = <g transform={side ? 'translate(225 55) scale(.42 1)' : 'translate(95 22)'}><path d="M128 52H362L392 674H270L245 318L220 674H98Z" fill={fill} stroke={design.secondary} strokeWidth="8"/><path d="M245 52V318" stroke={design.secondary} strokeWidth="7"/><path d="M128 90H362" stroke={design.accent} strokeWidth="5"/></g>;
  else if (preview === 'tracksuit') artwork = <><g transform={side ? 'translate(170 32) scale(.55 .62)' : 'translate(55 15) scale(1 .62)'}><path d="M185 34Q245 -8 305 34L345 80L452 132L405 242L374 220V594H116V220L85 242L38 132L145 80Z" fill={fill} stroke={design.secondary} strokeWidth="8"/><path d="M185 34Q245 118 305 34" fill="none" stroke={design.secondary} strokeWidth="12"/></g><g transform={side ? 'translate(225 328) scale(.42 .55)' : 'translate(95 328) scale(1 .55)'}><path d="M128 52H362L392 674H270L245 318L220 674H98Z" fill={fill} stroke={design.secondary} strokeWidth="8"/></g></>;
  else if (preview === 'bag') artwork = <g transform={side ? 'translate(155 145) scale(.68 1)' : 'translate(70 135)'}><path d="M105 160Q245 75 385 160L425 515Q245 580 65 515Z" fill={fill} stroke={design.secondary} strokeWidth="9"/><path d="M146 172Q155 52 245 52Q335 52 344 172" fill="none" stroke={design.secondary} strokeWidth="18"/><path d="M118 250H372" stroke={design.accent} strokeWidth="8"/><path d="M245 210V510" stroke={design.secondary} strokeWidth="5" opacity=".55"/></g>;
  else if (preview === 'sleeve') artwork = <g transform={side ? 'translate(215 70) scale(.48 1)' : 'translate(120 70)'}><path d="M148 30H352L390 650Q250 700 110 650Z" fill={fill} stroke={design.secondary} strokeWidth="9"/><path d="M132 160H368M120 540H380" stroke={design.accent} strokeWidth="8"/></g>;
  else if (preview === 'ball') artwork = <g transform={side ? 'translate(130 120) scale(.72 1)' : 'translate(40 120)'}><circle cx="260" cy="260" r="220" fill={fill} stroke={design.secondary} strokeWidth="10"/><path d="M40 260H480M260 40V480M95 105Q260 260 425 415M425 105Q260 260 95 415" fill="none" stroke={design.secondary} strokeWidth="9"/><circle cx="260" cy="260" r="90" fill={design.primary} stroke={design.accent} strokeWidth="6"/></g>;
  else if (preview === 'padding') artwork = <g transform={side ? 'translate(200 45) scale(.5 1)' : 'translate(55 35)'}><rect x="195" y="28" width="100" height="520" rx="24" fill={fill} stroke={design.secondary} strokeWidth="9"/><rect x="60" y="510" width="370" height="110" rx="25" fill={fill} stroke={design.secondary} strokeWidth="9"/><rect x="36" y="42" width="418" height="64" rx="14" fill={design.secondary} opacity=".18"/></g>;
  else artwork = top;
  return <svg className="production-editor-garment" viewBox="0 0 600 720" aria-hidden="true">{defs}<rect width="600" height="720" fill="#111" />{artwork}<text x="300" y="690" textAnchor="middle" fill="#fff" opacity=".4" fontFamily="system-ui,sans-serif" fontSize="14" letterSpacing="2">{String(product.label.en).toUpperCase()} · {view.toUpperCase()}</text></svg>;
}
function LayerNode({ layer, selected, onSelect, onPatch }) {
  const node = useRef(null);
  const start = useRef(null);
  const onPointerDown = (event) => {
    onSelect(layer.id);
    if (layer.locked) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    start.current = { px: event.clientX, py: event.clientY, x: layer.x, y: layer.y };
  };
  const onPointerMove = (event) => {
    if (!start.current || layer.locked) return;
    const bounds = node.current?.ownerSVGElement?.getBoundingClientRect();
    if (!bounds?.width || !bounds?.height) return;
    const x = Math.min(97, Math.max(3, start.current.x + ((event.clientX - start.current.px) / bounds.width) * 100));
    const y = Math.min(97, Math.max(3, start.current.y + ((event.clientY - start.current.py) / bounds.height) * 100));
    onPatch({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
  };
  const end = () => { start.current = null; };
  if (!layer.visible) return null;
  const x = layer.x * 6;
  const y = layer.y * 7.2;
  const width = Math.max(28, layer.width * 6);
  const fontSize = layer.type === 'number' ? Math.max(44, width * 0.82) : Math.max(18, width * 0.23);
  const height = layer.type === 'logo' ? width : Math.max(34, fontSize * 1.25);
  const fontFamily = FONT_STACK[layer.font] || FONT_STACK.block;
  return (
    <g
      ref={node}
      className={`production-layer production-layer--${layer.type}${selected ? ' selected' : ''}${layer.locked ? ' locked' : ''}`}
      transform={`translate(${x} ${y}) rotate(${layer.rotation})`}
      role="button"
      tabIndex="0"
      aria-label={layer.label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onClick={() => onSelect(layer.id)}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(layer.id); } }}
    >
      <rect x={-width / 2} y={-height / 2} width={width} height={height} rx="5" fill="transparent" stroke={selected ? '#42d17a' : 'transparent'} strokeWidth={selected ? 2 : 0} />
      {layer.type === 'logo'
        ? <image href={layer.content} x={-width / 2} y={-height / 2} width={width} height={height} preserveAspectRatio="xMidYMid meet" draggable="false" />
        : <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fill={layer.color} fontFamily={fontFamily} fontSize={fontSize} fontWeight="900" letterSpacing="1">{layer.content || 'TEXT'}</text>}
    </g>
  );
}

export default function ProductionDesignEditor({ design, value, onChange, readOnly = false, onCanvasPoint = null }) {
  const { pick } = useLanguage();
  const initial = useMemo(() => normalizeStudio(value || createDefaultStudio(design), design), []);
  const [history, setHistory] = useState(() => createHistory(initial));
  const studio = history.present;
  const [selectedId, setSelectedId] = useState(studio.layers.find((layer) => layer.view === studio.activeView)?.id || null);
  const [commentText, setCommentText] = useState('');
  const [commentPoint, setCommentPoint] = useState({ x: 50, y: 50 });
  const selected = studio.layers.find((layer) => layer.id === selectedId) || null;

  useEffect(() => { onChange?.(studio); }, [studio]);
  useEffect(() => {
    const current = normalizeStudio(value || studio, design);
    const synced = current.layers.map((layer) => {
      if (layer.label === 'Team name') return { ...layer, content: design.teamName || layer.content, color: design.secondary, font: design.font };
      if (layer.label === 'Player name') return { ...layer, content: design.playerName || layer.content, color: design.secondary, font: design.font };
      if (layer.type === 'number') return { ...layer, content: design.number || layer.content, color: design.secondary, font: design.font };
      if (layer.type === 'sponsor') return { ...layer, content: design.sponsorName || layer.content, color: design.accent };
      return layer;
    });
    if (design.logoPreview && !synced.some((layer) => layer.type === 'logo')) synced.push(addDesignLayer({ ...current, layers: synced }, { type: 'logo', label: 'Team logo', content: design.logoPreview, width: 20 }, design).layers.at(-1));
    setHistory((old) => pushHistory(old, normalizeStudio({ ...current, layers: synced }, design)));
  }, [design.teamName, design.playerName, design.number, design.sponsorName, design.logoPreview, design.secondary, design.accent, design.font]);

  const commit = (next) => setHistory((old) => pushHistory(old, normalizeStudio(next, design)));
  const patchLayer = (patch) => { if (!selectedId || readOnly) return; commit(updateDesignLayer(studio, selectedId, patch, design)); };
  const setView = (view) => { const next = { ...studio, activeView: view }; commit(next); setSelectedId(next.layers.find((layer) => layer.view === view)?.id || null); };
  const add = (type) => {
    const content = type === 'number' ? design.number || '00' : type === 'logo' ? design.logoPreview : type === 'sponsor' ? design.sponsorName || 'SPONSOR' : type === 'text' ? design.teamName || 'TEAM' : 'BADGE';
    if (type === 'logo' && !content) return;
    const next = addDesignLayer(studio, { type, content, ...(type === 'logo' ? (design.logoMetadata || {}) : {}), label: type === 'logo' ? 'Team logo' : type === 'number' ? 'Number' : type === 'sponsor' ? 'Sponsor' : 'Custom text', width: type === 'number' ? 30 : type === 'logo' ? 20 : 38 }, design);
    commit(next); setSelectedId(next.layers.at(-1)?.id || null);
  };
  const selectCanvasPoint = (event) => {
    if (event.target.closest?.('.production-layer, .production-comment-pin')) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const point = {
      x: Number(Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100)).toFixed(2)),
      y: Number(Math.min(100, Math.max(0, ((event.clientY - bounds.top) / bounds.height) * 100)).toFixed(2)),
    };
    setCommentPoint(point);
    onCanvasPoint?.({ ...point, view: studio.activeView });
  };
  const addCommentAtPoint = () => {
    if (!commentText.trim()) return;
    commit(addDesignComment(studio, { view: studio.activeView, ...commentPoint, text: commentText }, design));
    setCommentText('');
  };
  const visibleLayers = studio.layers.filter((layer) => layer.view === studio.activeView).sort((a, b) => b.zIndex - a.zIndex);
  const canvasLayers = [...visibleLayers].sort((a, b) => a.zIndex - b.zIndex);
  const comments = studio.comments.filter((comment) => comment.view === studio.activeView);

  return (
    <section className="production-editor" aria-label={pick({ en: 'Production design editor', ar: 'محرر تصميم الإنتاج' })}>
      <div className="production-editor-toolbar">
        <div className="production-view-tabs" role="tablist">{DESIGN_VIEWS.map((view) => <button type="button" role="tab" aria-selected={studio.activeView === view} className={studio.activeView === view ? 'active' : ''} onClick={() => setView(view)} key={view}>{pick({ en: view, ar: view === 'front' ? 'الأمام' : view === 'back' ? 'الخلف' : 'الجانب' })}</button>)}</div>
        <div className="production-history-actions"><button type="button" disabled={!history.past.length || readOnly} onClick={() => setHistory(undoHistory)}>{pick({ en: 'Undo', ar: 'تراجع' })}</button><button type="button" disabled={!history.future.length || readOnly} onClick={() => setHistory(redoHistory)}>{pick({ en: 'Redo', ar: 'إعادة' })}</button></div>
      </div>
      <div className="production-editor-grid">
        <div className="production-canvas-wrap">
          <div className="production-canvas" data-view={studio.activeView} onClick={selectCanvasPoint} role="application" aria-label={pick({ en: 'Design canvas. Select a point to pin a comment.', ar: 'لوحة التصميم. اختر نقطة لتثبيت تعليق.' })}>
            <ProductBase design={design} view={studio.activeView} />
            {studio.showBleedArea && <div className="production-bleed-area" aria-hidden="true" />}
            {studio.showSafeArea && <div className="production-safe-area" aria-hidden="true" />}
            <svg className="production-editor-overlay" viewBox="0 0 600 720" aria-label={pick({ en: 'Editable artwork layers', ar: 'طبقات الرسم القابلة للتعديل' })}>
              {canvasLayers.map((layer) => <LayerNode key={layer.id} layer={layer} selected={layer.id === selectedId} onSelect={setSelectedId} onPatch={(patch) => commit(updateDesignLayer(studio, layer.id, patch, design))} />)}
              {comments.filter((comment) => !comment.resolved).map((comment, index) => (
                <g key={comment.id} className="production-comment-pin" transform={`translate(${comment.x * 6} ${comment.y * 7.2})`} role="button" tabIndex="0" onClick={() => !readOnly && commit(resolveDesignComment(studio, comment.id, design))} onKeyDown={(event) => { if (!readOnly && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); commit(resolveDesignComment(studio, comment.id, design)); } }}>
                  <title>{comment.text}</title><circle r="14" fill="#111" stroke="#fff" strokeWidth="2" /><text x="0" y="1" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="12" fontWeight="900">{index + 1}</text>
                </g>
              ))}
            </svg>
          </div>
          <div className="production-guides"><label><input type="checkbox" checked={studio.showSafeArea} onChange={(event) => commit({ ...studio, showSafeArea: event.target.checked })} disabled={readOnly} />{pick({ en: 'Safe area', ar: 'منطقة الأمان' })}</label><label><input type="checkbox" checked={studio.showBleedArea} onChange={(event) => commit({ ...studio, showBleedArea: event.target.checked })} disabled={readOnly} />{pick({ en: 'Bleed area', ar: 'منطقة القص' })}</label></div>
        </div>
        <aside className="production-layers-panel">
          <h3>{pick({ en: 'Layers', ar: 'الطبقات' })}</h3>
          {!readOnly && <div className="production-add-layer"><button type="button" onClick={() => add('text')}>+ Text</button><button type="button" onClick={() => add('number')}>+ #</button><button type="button" disabled={!design.logoPreview} onClick={() => add('logo')}>+ Logo</button><button type="button" onClick={() => add('sponsor')}>+ Sponsor</button></div>}
          <div className="production-layer-list">{visibleLayers.map((layer) => <button type="button" key={layer.id} className={selectedId === layer.id ? 'selected' : ''} onClick={() => setSelectedId(layer.id)}><span>{layer.visible ? '●' : '○'}</span><strong>{layer.label}</strong><small>{layer.locked ? '🔒' : layer.type}</small></button>)}</div>
          {selected && <div className="production-layer-controls">
            <label><span>{pick({ en: 'Content', ar: 'المحتوى' })}</span>{selected.type === 'logo' ? <output>{pick({ en: 'Uploaded artwork', ar: 'ملف مرفوع' })}</output> : <input value={selected.content} maxLength={120} onChange={(event) => patchLayer({ content: event.target.value })} disabled={readOnly || selected.locked} />}</label>
            <div className="field-row"><label><span>X</span><input type="number" min="3" max="97" step=".1" value={selected.x} onChange={(event) => patchLayer({ x: event.target.value })} disabled={readOnly || selected.locked} /></label><label><span>Y</span><input type="number" min="3" max="97" step=".1" value={selected.y} onChange={(event) => patchLayer({ y: event.target.value })} disabled={readOnly || selected.locked} /></label></div>
            <label><span>{pick({ en: 'Size', ar: 'الحجم' })} {selected.width}%</span><input type="range" min="5" max="90" value={selected.width} onChange={(event) => patchLayer({ width: event.target.value })} disabled={readOnly || selected.locked} /></label>
            <label><span>{pick({ en: 'Rotation', ar: 'الدوران' })} {selected.rotation}°</span><input type="range" min="-180" max="180" value={selected.rotation} onChange={(event) => patchLayer({ rotation: event.target.value })} disabled={readOnly || selected.locked} /></label>
            {selected.type !== 'logo' && <label><span>{pick({ en: 'Color', ar: 'اللون' })}</span><input type="color" value={selected.color} onChange={(event) => patchLayer({ color: event.target.value })} disabled={readOnly || selected.locked} /></label>}
            <div className="production-layer-action-grid"><button type="button" onClick={() => patchLayer({ locked: !selected.locked })} disabled={readOnly}>{selected.locked ? pick({ en: 'Unlock', ar: 'فتح القفل' }) : pick({ en: 'Lock', ar: 'قفل' })}</button><button type="button" onClick={() => patchLayer({ visible: !selected.visible })} disabled={readOnly}>{selected.visible ? pick({ en: 'Hide', ar: 'إخفاء' }) : pick({ en: 'Show', ar: 'إظهار' })}</button><button type="button" onClick={() => commit(moveDesignLayer(studio, selected.id, 'up', design))} disabled={readOnly}>{pick({ en: 'Move up', ar: 'للأعلى' })}</button><button type="button" onClick={() => commit(moveDesignLayer(studio, selected.id, 'down', design))} disabled={readOnly}>{pick({ en: 'Move down', ar: 'للأسفل' })}</button><button type="button" onClick={() => { const next = duplicateDesignLayer(studio, selected.id, design); commit(next); setSelectedId(next.layers.at(-1)?.id); }} disabled={readOnly}>{pick({ en: 'Duplicate', ar: 'نسخ' })}</button><button type="button" className="danger" onClick={() => { commit(removeDesignLayer(studio, selected.id, design)); setSelectedId(null); }} disabled={readOnly}>{pick({ en: 'Delete', ar: 'حذف' })}</button></div>
          </div>}
          <div className="production-comments"><h4>{pick({ en: 'Pinned comments', ar: 'تعليقات مثبتة' })}</h4>{comments.map((comment, index) => <div className={comment.resolved ? 'resolved' : ''} key={comment.id}><span>{index + 1}</span><p>{comment.text}</p>{!comment.resolved && !readOnly && <button type="button" onClick={() => commit(resolveDesignComment(studio, comment.id, design))}>✓</button>}</div>)}{!readOnly && <><textarea rows={2} maxLength={500} value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder={pick({ en: 'Select a point on the canvas, then add a comment', ar: 'اختر نقطة على التصميم ثم أضف تعليقًا' })} /><small>{pick({ en: `Pin position: ${commentPoint.x}% × ${commentPoint.y}%`, ar: `موضع التثبيت: ${commentPoint.x}% × ${commentPoint.y}%` })}</small><button type="button" onClick={addCommentAtPoint} disabled={!commentText.trim()}>{pick({ en: 'Pin Comment', ar: 'تثبيت التعليق' })}</button></>}</div>
        </aside>
      </div>
    </section>
  );
}
