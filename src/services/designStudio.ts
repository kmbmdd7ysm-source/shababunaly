import { getSupabase } from './supabase.js';

export type DesignView = 'front' | 'back' | 'side';
export type LayerType = 'text' | 'number' | 'logo' | 'sponsor' | 'badge';
export type LayerFont = 'block' | 'condensed' | 'modern';

export interface DesignInput {
  teamName?: string;
  playerName?: string;
  number?: string;
  sponsorName?: string;
  logoPreview?: string;
  logoMetadata?: Record<string, unknown>;
  primary?: string;
  secondary?: string;
  accent?: string;
  font?: string;
  pattern?: string;
  neckline?: string;
  productType?: string;
  variant?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface DesignLayer {
  id: string;
  type: LayerType;
  view: DesignView;
  label: string;
  content: string;
  x: number;
  y: number;
  width: number;
  rotation: number;
  color: string;
  font: LayerFont;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  sourceFileName: string;
  sourceMimeType: string;
  sourceBytes: number;
  sourceSha256: string;
  pixelWidth: number;
  pixelHeight: number;
  vectorSourceValidated: boolean;
  fontLicenseStatus: string;
}

export interface DesignComment {
  id: string;
  view: DesignView;
  x: number;
  y: number;
  text: string;
  resolved: boolean;
  createdAt: string;
}

export interface StudioState {
  schemaVersion: number;
  activeView: DesignView;
  showSafeArea: boolean;
  showBleedArea: boolean;
  layers: DesignLayer[];
  comments: DesignComment[];
  updatedAt: string;
}

export interface HistoryState<T = unknown> {
  past: T[];
  present: T;
  future: T[];
  limit: number;
}

const VIEWS = new Set<DesignView>(['front', 'back', 'side']);
const TYPES = new Set<LayerType>(['text', 'number', 'logo', 'sponsor', 'badge']);
const FONTS = new Set<LayerFont>(['block', 'condensed', 'modern']);

const clamp = (value: unknown, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number(value) || 0));

const uid = (prefix = 'layer'): string =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

const asView = (value: unknown, fallback: DesignView = 'front'): DesignView =>
  VIEWS.has(value as DesignView) ? (value as DesignView) : fallback;

const asType = (value: unknown): LayerType =>
  TYPES.has(value as LayerType) ? (value as LayerType) : 'text';

const asFont = (value: unknown, fallback: LayerFont = 'block'): LayerFont =>
  FONTS.has(value as LayerFont) ? (value as LayerFont) : fallback;

const asColor = (value: unknown, fallback = '#ffffff'): string =>
  /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

export const DESIGN_VIEWS = Object.freeze(['front', 'back', 'side'] as const);

export function createDefaultStudio(design: DesignInput = {}): StudioState {
  const secondary = asColor(design.secondary, '#ffffff');
  const font = asFont(design.font, 'block');
  const layers: DesignLayer[] = [
    {
      id: uid('team'),
      type: 'text',
      view: 'front',
      label: 'Team name',
      content: String(design.teamName || 'SHABABUNA').toUpperCase(),
      x: 50,
      y: 35,
      width: 46,
      rotation: 0,
      color: secondary,
      font,
      visible: true,
      locked: false,
      zIndex: 20,
      sourceFileName: '',
      sourceMimeType: '',
      sourceBytes: 0,
      sourceSha256: '',
      pixelWidth: 0,
      pixelHeight: 0,
      vectorSourceValidated: false,
      fontLicenseStatus: 'built_in_licensed',
    },
    {
      id: uid('front-number'),
      type: 'number',
      view: 'front',
      label: 'Front number',
      content: String(design.number || '00'),
      x: 50,
      y: 51,
      width: 28,
      rotation: 0,
      color: secondary,
      font,
      visible: true,
      locked: false,
      zIndex: 19,
      sourceFileName: '',
      sourceMimeType: '',
      sourceBytes: 0,
      sourceSha256: '',
      pixelWidth: 0,
      pixelHeight: 0,
      vectorSourceValidated: false,
      fontLicenseStatus: 'built_in_licensed',
    },
    {
      id: uid('player'),
      type: 'text',
      view: 'back',
      label: 'Player name',
      content: String(design.playerName || 'PLAYER').toUpperCase(),
      x: 50,
      y: 27,
      width: 42,
      rotation: 0,
      color: secondary,
      font,
      visible: true,
      locked: false,
      zIndex: 20,
      sourceFileName: '',
      sourceMimeType: '',
      sourceBytes: 0,
      sourceSha256: '',
      pixelWidth: 0,
      pixelHeight: 0,
      vectorSourceValidated: false,
      fontLicenseStatus: 'built_in_licensed',
    },
    {
      id: uid('back-number'),
      type: 'number',
      view: 'back',
      label: 'Back number',
      content: String(design.number || '00'),
      x: 50,
      y: 48,
      width: 38,
      rotation: 0,
      color: secondary,
      font,
      visible: true,
      locked: false,
      zIndex: 19,
      sourceFileName: '',
      sourceMimeType: '',
      sourceBytes: 0,
      sourceSha256: '',
      pixelWidth: 0,
      pixelHeight: 0,
      vectorSourceValidated: false,
      fontLicenseStatus: 'built_in_licensed',
    },
  ];

  if (design.sponsorName) {
    layers.push({
      id: uid('sponsor'),
      type: 'sponsor',
      view: 'front',
      label: 'Sponsor',
      content: String(design.sponsorName).toUpperCase(),
      x: 50,
      y: 70,
      width: 34,
      rotation: 0,
      color: asColor(design.accent, '#d6d6d6'),
      font: 'modern',
      visible: true,
      locked: false,
      zIndex: 18,
      sourceFileName: '',
      sourceMimeType: '',
      sourceBytes: 0,
      sourceSha256: '',
      pixelWidth: 0,
      pixelHeight: 0,
      vectorSourceValidated: false,
      fontLicenseStatus: 'built_in_licensed',
    });
  }

  if (design.logoPreview) {
    layers.push({
      id: uid('logo'),
      type: 'logo',
      view: 'front',
      label: 'Team logo',
      content: String(design.logoPreview),
      x: 50,
      y: 21,
      width: 20,
      rotation: 0,
      color: '#ffffff',
      font: 'modern',
      visible: true,
      locked: false,
      zIndex: 30,
      sourceFileName: String(design.logoMetadata?.sourceFileName || ''),
      sourceMimeType: String(design.logoMetadata?.sourceMimeType || ''),
      sourceBytes: Number(design.logoMetadata?.sourceBytes) || 0,
      sourceSha256: String(design.logoMetadata?.sourceSha256 || ''),
      pixelWidth: Number(design.logoMetadata?.pixelWidth) || 0,
      pixelHeight: Number(design.logoMetadata?.pixelHeight) || 0,
      vectorSourceValidated: Boolean(design.logoMetadata?.vectorSourceValidated),
      fontLicenseStatus: 'not_applicable',
    });
  }

  return {
    schemaVersion: 1,
    activeView: 'front',
    showSafeArea: true,
    showBleedArea: false,
    layers,
    comments: [],
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeStudio(studio: unknown, design: DesignInput = {}): StudioState {
  const base =
    studio && typeof studio === 'object'
      ? (studio as Partial<StudioState> & Record<string, unknown>)
      : createDefaultStudio(design);
  const rawLayers = Array.isArray(base.layers) ? base.layers : [];
  const layers: DesignLayer[] = rawLayers.slice(0, 80).map((raw, index) => {
    const layer = asRecord(raw);
    const type = asType(layer.type);
    return {
      id: String(layer.id || uid('layer')).slice(0, 100),
      type,
      view: asView(layer.view),
      label: String(layer.label || `Layer ${index + 1}`).slice(0, 80),
      content: String(layer.content || '').slice(0, type === 'logo' ? 2_000_000 : 120),
      x: clamp(layer.x, 3, 97),
      y: clamp(layer.y, 3, 97),
      width: clamp(layer.width, 5, 90),
      rotation: clamp(layer.rotation, -180, 180),
      color: asColor(layer.color),
      font: asFont(layer.font),
      visible: layer.visible !== false,
      locked: Boolean(layer.locked),
      zIndex: clamp(layer.zIndex ?? index + 1, 1, 999),
      sourceFileName: String(layer.sourceFileName || '').slice(0, 240),
      sourceMimeType: String(layer.sourceMimeType || '').slice(0, 100),
      sourceBytes: Math.max(0, Number(layer.sourceBytes) || 0),
      sourceSha256: /^[0-9a-f]{64}$/i.test(String(layer.sourceSha256 || ''))
        ? String(layer.sourceSha256).toLowerCase()
        : '',
      pixelWidth: Math.max(0, Math.round(Number(layer.pixelWidth) || 0)),
      pixelHeight: Math.max(0, Math.round(Number(layer.pixelHeight) || 0)),
      vectorSourceValidated: Boolean(layer.vectorSourceValidated),
      fontLicenseStatus: String(
        layer.fontLicenseStatus || (type === 'logo' ? 'not_applicable' : 'built_in_licensed'),
      ).slice(0, 60),
    };
  });

  const comments: DesignComment[] = (Array.isArray(base.comments) ? base.comments : [])
    .slice(0, 200)
    .map((raw) => {
      const comment = asRecord(raw);
      return {
        id: String(comment.id || uid('comment')).slice(0, 100),
        view: asView(comment.view),
        x: clamp(comment.x, 0, 100),
        y: clamp(comment.y, 0, 100),
        text: String(comment.text || '')
          .trim()
          .slice(0, 500),
        resolved: Boolean(comment.resolved),
        createdAt: String(comment.createdAt || new Date().toISOString()),
      };
    })
    .filter((comment) => Boolean(comment.text));

  return {
    schemaVersion: 1,
    activeView: asView(base.activeView),
    showSafeArea: base.showSafeArea !== false,
    showBleedArea: Boolean(base.showBleedArea),
    layers,
    comments,
    updatedAt: new Date().toISOString(),
  };
}

export function addDesignLayer(
  studio: unknown,
  partial: Record<string, unknown> = {},
  design: DesignInput = {},
): StudioState {
  const current = normalizeStudio(studio, design);
  const view = asView(partial.view, current.activeView);
  const sameView = current.layers.filter((layer) => layer.view === view);
  const type = asType(partial.type);
  const maxZ = sameView.reduce((max, item) => Math.max(max, item.zIndex), 0);
  const layer: DesignLayer = {
    id: uid(type),
    type,
    view,
    label: String(partial.label || 'New layer').slice(0, 80),
    content: String(partial.content || (type === 'number' ? '00' : 'TEXT')).slice(
      0,
      type === 'logo' ? 2_000_000 : 120,
    ),
    x: clamp(partial.x ?? 50, 3, 97),
    y: clamp(partial.y ?? 50, 3, 97),
    width: clamp(partial.width ?? 30, 5, 90),
    rotation: clamp(partial.rotation ?? 0, -180, 180),
    color: asColor(partial.color, asColor(design.secondary, '#ffffff')),
    font: asFont(partial.font, asFont(design.font, 'block')),
    visible: true,
    locked: false,
    zIndex: maxZ + 1,
    sourceFileName: String(partial.sourceFileName || ''),
    sourceMimeType: String(partial.sourceMimeType || ''),
    sourceBytes: Number(partial.sourceBytes) || 0,
    sourceSha256: String(partial.sourceSha256 || ''),
    pixelWidth: Number(partial.pixelWidth) || 0,
    pixelHeight: Number(partial.pixelHeight) || 0,
    vectorSourceValidated: Boolean(partial.vectorSourceValidated),
    fontLicenseStatus: String(
      partial.fontLicenseStatus || (type === 'logo' ? 'not_applicable' : 'built_in_licensed'),
    ),
  };
  return normalizeStudio({ ...current, layers: [...current.layers, layer] }, design);
}

export function updateDesignLayer(
  studio: unknown,
  layerId: string,
  patch: Record<string, unknown>,
  design: DesignInput = {},
): StudioState {
  const current = normalizeStudio(studio, design);
  return normalizeStudio(
    {
      ...current,
      layers: current.layers.map((layer) =>
        layer.id === layerId ? { ...layer, ...patch } : layer,
      ),
    },
    design,
  );
}

export function removeDesignLayer(
  studio: unknown,
  layerId: string,
  design: DesignInput = {},
): StudioState {
  const current = normalizeStudio(studio, design);
  return normalizeStudio(
    { ...current, layers: current.layers.filter((layer) => layer.id !== layerId) },
    design,
  );
}

export function duplicateDesignLayer(
  studio: unknown,
  layerId: string,
  design: DesignInput = {},
): StudioState {
  const current = normalizeStudio(studio, design);
  const source = current.layers.find((layer) => layer.id === layerId);
  if (!source) return current;
  const maxZ = current.layers.reduce((max, layer) => Math.max(max, layer.zIndex), 0);
  return normalizeStudio(
    {
      ...current,
      layers: [
        ...current.layers,
        {
          ...source,
          id: uid(source.type),
          label: `${source.label} copy`,
          x: clamp(source.x + 4, 3, 97),
          y: clamp(source.y + 4, 3, 97),
          zIndex: maxZ + 1,
        },
      ],
    },
    design,
  );
}

export function moveDesignLayer(
  studio: unknown,
  layerId: string,
  direction: string,
  design: DesignInput = {},
): StudioState {
  const current = normalizeStudio(studio, design);
  const layer = current.layers.find((item) => item.id === layerId);
  if (!layer) return current;
  const sameView = current.layers
    .filter((item) => item.view === layer.view)
    .sort((a, b) => a.zIndex - b.zIndex);
  const index = sameView.findIndex((item) => item.id === layerId);
  const target = direction === 'up' ? sameView[index + 1] : sameView[index - 1];
  if (!target) return current;
  return normalizeStudio(
    {
      ...current,
      layers: current.layers.map((item) =>
        item.id === layer.id
          ? { ...item, zIndex: target.zIndex }
          : item.id === target.id
            ? { ...item, zIndex: layer.zIndex }
            : item,
      ),
    },
    design,
  );
}

export function addDesignComment(
  studio: unknown,
  comment: Record<string, unknown>,
  design: DesignInput = {},
): StudioState {
  const current = normalizeStudio(studio, design);
  const next: DesignComment = {
    id: uid('comment'),
    view: asView(comment.view, current.activeView),
    x: clamp(comment.x ?? 50, 0, 100),
    y: clamp(comment.y ?? 50, 0, 100),
    text: String(comment.text || '')
      .trim()
      .slice(0, 500),
    resolved: false,
    createdAt: new Date().toISOString(),
  };
  if (!next.text) return current;
  return normalizeStudio({ ...current, comments: [...current.comments, next] }, design);
}

export function resolveDesignComment(
  studio: unknown,
  commentId: string,
  design: DesignInput = {},
): StudioState {
  const current = normalizeStudio(studio, design);
  return normalizeStudio(
    {
      ...current,
      comments: current.comments.map((comment) =>
        comment.id === commentId ? { ...comment, resolved: true } : comment,
      ),
    },
    design,
  );
}

export function createHistory<T>(initial: T, limit = 60): HistoryState<T> {
  return { past: [], present: initial, future: [], limit };
}

export function pushHistory<T>(history: HistoryState<T>, next: T): HistoryState<T> {
  if (JSON.stringify(history.present) === JSON.stringify(next)) return history;
  return {
    ...history,
    past: [...history.past, history.present].slice(-history.limit),
    present: next,
    future: [],
  };
}

export function undoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  if (!history.past.length) return history;
  const previous = history.past[history.past.length - 1];
  if (previous === undefined) return history;
  return {
    ...history,
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future].slice(0, history.limit),
  };
}

export function redoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  if (!history.future.length) return history;
  const next = history.future[0];
  if (next === undefined) return history;
  return {
    ...history,
    past: [...history.past, history.present].slice(-history.limit),
    present: next,
    future: history.future.slice(1),
  };
}

export function buildProductionMetadata(
  design: DesignInput = {},
  studio: unknown = {},
): Record<string, unknown> {
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
    views: Object.fromEntries(
      DESIGN_VIEWS.map((view) => [
        view,
        normalized.layers
          .filter((layer) => layer.view === view && layer.visible)
          .sort((a, b) => a.zIndex - b.zIndex),
      ]),
    ),
    notes: String(design.notes || '').slice(0, 1200),
    generatedAt: new Date().toISOString(),
  };
}

export async function autosaveDesignStudio(
  designId: string,
  design: DesignInput,
  studio: unknown,
): Promise<Record<string, unknown>> {
  if (!designId) throw new Error('design_id_required');
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client
    .from('custom_designs')
    .update({
      design_data: { ...design, studio: normalizeStudio(studio, design), logoPreview: undefined },
      preview_data: {
        primary: design.primary,
        secondary: design.secondary,
        accent: design.accent,
        teamName: design.teamName,
        number: design.number,
        variant: design.variant,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', designId)
    .select('*')
    .single();
  if (error) throw error;
  return (data || {}) as Record<string, unknown>;
}

export async function createSecureDesignShare(
  designId: string,
  permissions = 'view',
  hours = 168,
): Promise<string> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client.rpc('create_design_share_link', {
    p_design_id: designId,
    p_permissions: permissions,
    p_hours: Math.max(1, Math.min(720, Number(hours) || 168)),
  });
  if (error) throw error;
  const token =
    typeof data === 'string'
      ? data
      : data && typeof data === 'object' && 'token' in data
        ? String((data as { token?: unknown }).token || '')
        : '';
  if (!token) throw new Error('share_token_unavailable');
  return `${window.location.origin}/design-share/${encodeURIComponent(token)}`;
}

async function designShareRequest(
  token: string,
  payload: Record<string, unknown> | null = null,
): Promise<Record<string, unknown>> {
  const safeToken = String(token || '').trim();
  if (safeToken.length < 32) throw new Error('invalid_share_token');
  const url = payload
    ? '/api/design-share'
    : `/api/design-share?token=${encodeURIComponent(safeToken)}`;
  const init: RequestInit = {
    method: payload ? 'POST' : 'GET',
    headers: payload ? { 'Content-Type': 'application/json' } : { Accept: 'application/json' },
    cache: 'no-store',
  };
  if (payload) init.body = JSON.stringify({ token: safeToken, ...payload });
  const response = await fetch(url, init);
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || !data?.ok)
    throw Object.assign(new Error(String(data?.error || 'design_share_unavailable')), {
      status: response.status,
    });
  return data;
}

export async function loadSharedDesign(token: string): Promise<Record<string, unknown>> {
  const payload = await designShareRequest(token);
  const data = asRecord(payload.design);
  if (!data?.id) throw new Error('shared_design_not_found');
  const designData = asRecord(data.designData);
  const design: DesignInput = {
    ...designData,
    productType: String(data.productType || designData.productType || ''),
  };
  return {
    ...data,
    design,
    studio: normalizeStudio(designData.studio, design),
  };
}

export async function addSharedDesignComment(
  token: string,
  payload: Record<string, unknown> = {},
): Promise<unknown> {
  const result = await designShareRequest(token, { action: 'comment', ...payload });
  return result.comment;
}

export async function respondToSharedDesign(
  token: string,
  decision: string,
  note = '',
  turnstileToken = '',
): Promise<unknown> {
  if (!['approve', 'request_changes'].includes(decision))
    throw new Error('invalid_design_decision');
  const result = await designShareRequest(token, {
    action: decision,
    note: String(note || '').trim(),
    turnstileToken,
  });
  return result.result;
}
