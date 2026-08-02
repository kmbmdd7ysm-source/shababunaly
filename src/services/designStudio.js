import { getSupabase } from './supabase.js';

const VIEWS = new Set(['front', 'back', 'side']);
const TYPES = new Set(['text', 'number', 'logo', 'sponsor', 'badge']);

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
const uid = (prefix = 'layer') => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

export const DESIGN_VIEWS = Object.freeze(['front', 'back', 'side']);

export function createDefaultStudio(design = {}) {
  return {
    schemaVersion: 1,
    activeView: 'front',
    showSafeArea: true,
    showBleedArea: false,
    layers: [
      { id: uid('team'), type: 'text', view: 'front', label: 'Team name', content: String(design.teamName || 'SHABABUNA').toUpperCase(), x: 50, y: 35, width: 46, rotation: 0, color: design.secondary || '#ffffff', font: design.font || 'block', visible: true, locked: false, zIndex: 20 },
      { id: uid('front-number'), type: 'number', view: 'front', label: 'Front number', content: String(design.number || '00'), x: 50, y: 51, width: 28, rotation: 0, color: design.secondary || '#ffffff', font: design.font || 'block', visible: true, locked: false, zIndex: 19 },
      { id: uid('player'), type: 'text', view: 'back', label: 'Player name', content: String(design.playerName || 'PLAYER').toUpperCase(), x: 50, y: 27, width: 42, rotation: 0, color: design.secondary || '#ffffff', font: design.font || 'block', visible: true, locked: false, zIndex: 20 },
      { id: uid('back-number'), type: 'number', view: 'back', label: 'Back number', content: String(design.number || '00'), x: 50, y: 48, width: 38, rotation: 0, color: design.secondary || '#ffffff', font: design.font || 'block', visible: true, locked: false, zIndex: 19 },
      ...(design.sponsorName ? [{ id: uid('sponsor'), type: 'sponsor', view: 'front', label: 'Sponsor', content: String(design.sponsorName).toUpperCase(), x: 50, y: 70, width: 34, rotation: 0, color: design.accent || '#d6d6d6', font: 'modern', visible: true, locked: false, zIndex: 18 }] : []),
      ...(design.logoPreview ? [{ id: uid('logo'), type: 'logo', view: 'front', label: 'Team logo', content: design.logoPreview, ...(design.logoMetadata || {}), x: 50, y: 21, width: 20, rotation: 0, color: '#ffffff', font: 'modern', visible: true, locked: false, zIndex: 30 }] : []),
    ],
    comments: [],
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeStudio(studio, design = {}) {
  const base = studio && typeof studio === 'object' ? studio : createDefaultStudio(design);
  const layers = Array.isArray(base.layers) ? base.layers : [];
  return {
    schemaVersion: 1,
    activeView: VIEWS.has(base.activeView) ? base.activeView : 'front',
    showSafeArea: base.showSafeArea !== false,
    showBleedArea: Boolean(base.showBleedArea),
    layers: layers.slice(0, 80).map((layer, index) => ({
      id: String(layer.id || uid('layer')).slice(0, 100),
      type: TYPES.has(layer.type) ? layer.type : 'text',
      view: VIEWS.has(layer.view) ? layer.view : 'front',
      label: String(layer.label || `Layer ${index + 1}`).slice(0, 80),
      content: String(layer.content || '').slice(0, layer.type === 'logo' ? 2_000_000 : 120),
      x: clamp(layer.x, 3, 97),
      y: clamp(layer.y, 3, 97),
      width: clamp(layer.width, 5, 90),
      rotation: clamp(layer.rotation, -180, 180),
      color: /^#[0-9a-f]{6}$/i.test(String(layer.color || '')) ? layer.color : '#ffffff',
      font: ['block', 'condensed', 'modern'].includes(layer.font) ? layer.font : 'block',
      visible: layer.visible !== false,
      locked: Boolean(layer.locked),
      zIndex: clamp(layer.zIndex ?? index + 1, 1, 999),
      sourceFileName: String(layer.sourceFileName || '').slice(0, 240),
      sourceMimeType: String(layer.sourceMimeType || '').slice(0, 100),
      sourceBytes: Math.max(0, Number(layer.sourceBytes) || 0),
      sourceSha256: /^[0-9a-f]{64}$/i.test(String(layer.sourceSha256 || '')) ? String(layer.sourceSha256).toLowerCase() : '',
      pixelWidth: Math.max(0, Math.round(Number(layer.pixelWidth) || 0)),
      pixelHeight: Math.max(0, Math.round(Number(layer.pixelHeight) || 0)),
      vectorSourceValidated: Boolean(layer.vectorSourceValidated),
      fontLicenseStatus: String(layer.fontLicenseStatus || (layer.type === 'logo' ? 'not_applicable' : 'built_in_licensed')).slice(0, 60),
    })),
    comments: (Array.isArray(base.comments) ? base.comments : []).slice(0, 200).map((comment) => ({
      id: String(comment.id || uid('comment')).slice(0, 100),
      view: VIEWS.has(comment.view) ? comment.view : 'front',
      x: clamp(comment.x, 0, 100),
      y: clamp(comment.y, 0, 100),
      text: String(comment.text || '').trim().slice(0, 500),
      resolved: Boolean(comment.resolved),
      createdAt: comment.createdAt || new Date().toISOString(),
    })).filter((comment) => comment.text),
    updatedAt: new Date().toISOString(),
  };
}

export function addDesignLayer(studio, partial = {}, design = {}) {
  const current = normalizeStudio(studio, design);
  const sameView = current.layers.filter((layer) => layer.view === (partial.view || current.activeView));
  const layer = {
    id: uid(partial.type || 'layer'),
    type: TYPES.has(partial.type) ? partial.type : 'text',
    view: VIEWS.has(partial.view) ? partial.view : current.activeView,
    label: String(partial.label || 'New layer').slice(0, 80),
    content: String(partial.content || (partial.type === 'number' ? '00' : 'TEXT')).slice(0, partial.type === 'logo' ? 2_000_000 : 120),
    x: clamp(partial.x ?? 50, 3, 97), y: clamp(partial.y ?? 50, 3, 97), width: clamp(partial.width ?? 30, 5, 90), rotation: clamp(partial.rotation ?? 0, -180, 180),
    color: /^#[0-9a-f]{6}$/i.test(String(partial.color || '')) ? partial.color : (design.secondary || '#ffffff'),
    font: ['block', 'condensed', 'modern'].includes(partial.font) ? partial.font : (design.font || 'block'),
    visible: true, locked: false,
    zIndex: Math.max(1, ...sameView.map((item) => item.zIndex)) + 1,
    sourceFileName: partial.sourceFileName || '', sourceMimeType: partial.sourceMimeType || '', sourceBytes: partial.sourceBytes || 0,
    sourceSha256: partial.sourceSha256 || '', pixelWidth: partial.pixelWidth || 0, pixelHeight: partial.pixelHeight || 0,
    vectorSourceValidated: Boolean(partial.vectorSourceValidated), fontLicenseStatus: partial.fontLicenseStatus || (partial.type === 'logo' ? 'not_applicable' : 'built_in_licensed'),
  };
  return normalizeStudio({ ...current, layers: [...current.layers, layer] }, design);
}

export function updateDesignLayer(studio, layerId, patch, design = {}) {
  const current = normalizeStudio(studio, design);
  return normalizeStudio({ ...current, layers: current.layers.map((layer) => layer.id === layerId ? { ...layer, ...patch } : layer) }, design);
}

export function removeDesignLayer(studio, layerId, design = {}) {
  const current = normalizeStudio(studio, design);
  return normalizeStudio({ ...current, layers: current.layers.filter((layer) => layer.id !== layerId) }, design);
}

export function duplicateDesignLayer(studio, layerId, design = {}) {
  const current = normalizeStudio(studio, design);
  const source = current.layers.find((layer) => layer.id === layerId);
  if (!source) return current;
  return normalizeStudio({ ...current, layers: [...current.layers, { ...source, id: uid(source.type), label: `${source.label} copy`, x: clamp(source.x + 4, 3, 97), y: clamp(source.y + 4, 3, 97), zIndex: Math.max(...current.layers.map((layer) => layer.zIndex)) + 1 }] }, design);
}

export function moveDesignLayer(studio, layerId, direction, design = {}) {
  const current = normalizeStudio(studio, design);
  const layer = current.layers.find((item) => item.id === layerId);
  if (!layer) return current;
  const sameView = current.layers.filter((item) => item.view === layer.view).sort((a, b) => a.zIndex - b.zIndex);
  const index = sameView.findIndex((item) => item.id === layerId);
  const target = direction === 'up' ? sameView[index + 1] : sameView[index - 1];
  if (!target) return current;
  return normalizeStudio({ ...current, layers: current.layers.map((item) => item.id === layer.id ? { ...item, zIndex: target.zIndex } : item.id === target.id ? { ...item, zIndex: layer.zIndex } : item) }, design);
}

export function addDesignComment(studio, comment, design = {}) {
  const current = normalizeStudio(studio, design);
  const next = { id: uid('comment'), view: VIEWS.has(comment.view) ? comment.view : current.activeView, x: clamp(comment.x ?? 50, 0, 100), y: clamp(comment.y ?? 50, 0, 100), text: String(comment.text || '').trim().slice(0, 500), resolved: false, createdAt: new Date().toISOString() };
  if (!next.text) return current;
  return normalizeStudio({ ...current, comments: [...current.comments, next] }, design);
}

export function resolveDesignComment(studio, commentId, design = {}) {
  const current = normalizeStudio(studio, design);
  return normalizeStudio({ ...current, comments: current.comments.map((comment) => comment.id === commentId ? { ...comment, resolved: true } : comment) }, design);
}

export function createHistory(initial, limit = 60) {
  return { past: [], present: initial, future: [], limit };
}

export function pushHistory(history, next) {
  if (JSON.stringify(history.present) === JSON.stringify(next)) return history;
  return { ...history, past: [...history.past, history.present].slice(-history.limit), present: next, future: [] };
}

export function undoHistory(history) {
  if (!history.past.length) return history;
  return { ...history, past: history.past.slice(0, -1), present: history.past.at(-1), future: [history.present, ...history.future].slice(0, history.limit) };
}

export function redoHistory(history) {
  if (!history.future.length) return history;
  return { ...history, past: [...history.past, history.present].slice(-history.limit), present: history.future[0], future: history.future.slice(1) };
}

export function buildProductionMetadata(design = {}, studio = {}) {
  const normalized = normalizeStudio(studio, design);
  return {
    schemaVersion: 1,
    productType: design.productType,
    variant: design.variant,
    colorway: { primary: design.primary, secondary: design.secondary, accent: design.accent },
    pattern: design.pattern,
    neckline: design.neckline,
    font: design.font,
    safeAreaPercent: 8,
    bleedAreaPercent: 3,
    views: Object.fromEntries(DESIGN_VIEWS.map((view) => [view, normalized.layers.filter((layer) => layer.view === view && layer.visible).sort((a, b) => a.zIndex - b.zIndex)])),
    notes: String(design.notes || '').slice(0, 1200),
    generatedAt: new Date().toISOString(),
  };
}

export async function autosaveDesignStudio(designId, design, studio) {
  if (!designId) throw new Error('design_id_required');
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client.from('custom_designs').update({ design_data: { ...design, studio: normalizeStudio(studio, design), logoPreview: undefined }, preview_data: { primary: design.primary, secondary: design.secondary, accent: design.accent, teamName: design.teamName, number: design.number, variant: design.variant }, updated_at: new Date().toISOString() }).eq('id', designId).select('*').single();
  if (error) throw error;
  return data;
}

export async function createSecureDesignShare(designId, permissions = 'view', hours = 168) {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client.rpc('create_design_share_link', { p_design_id: designId, p_permissions: permissions, p_hours: Math.max(1, Math.min(720, Number(hours) || 168)) });
  if (error) throw error;
  const token = typeof data === 'string' ? data : data?.token;
  if (!token) throw new Error('share_token_unavailable');
  return `${window.location.origin}/design-share/${encodeURIComponent(token)}`;
}

async function designShareRequest(token, payload = null) {
  const safeToken = String(token || '').trim();
  if (safeToken.length < 32) throw new Error('invalid_share_token');
  const url = payload ? '/api/design-share' : `/api/design-share?token=${encodeURIComponent(safeToken)}`;
  const response = await fetch(url, {
    method: payload ? 'POST' : 'GET',
    headers: payload ? { 'Content-Type': 'application/json' } : { Accept: 'application/json' },
    body: payload ? JSON.stringify({ token: safeToken, ...payload }) : undefined,
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.ok) throw Object.assign(new Error(data?.error || 'design_share_unavailable'), { status: response.status });
  return data;
}

export async function loadSharedDesign(token) {
  const payload = await designShareRequest(token);
  const data = payload.design;
  if (!data?.id) throw new Error('shared_design_not_found');
  const design = { ...(data.designData || {}), productType: data.productType || data.designData?.productType };
  return { ...data, design, studio: normalizeStudio(data.designData?.studio, design) };
}

/** @param {string} token @param {{view?:string,x?:number,y?:number,text?:string,name?:string,email?:string,turnstileToken?:string}} [payload] */
export async function addSharedDesignComment(token, payload = {}) {
  const result = await designShareRequest(token, { action: 'comment', ...payload });
  return result.comment;
}

export async function respondToSharedDesign(token, decision, note = '', turnstileToken = '') {
  if (!['approve', 'request_changes'].includes(decision)) throw new Error('invalid_design_decision');
  const result = await designShareRequest(token, { action: decision, note: String(note || '').trim(), turnstileToken });
  return result.result;
}
