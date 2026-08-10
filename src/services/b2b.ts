import { getSupabase } from './supabase';
import { normalizeRoster } from '../data/customization';

type Row = Record<string, unknown>;
type Supa = NonNullable<Awaited<ReturnType<typeof getSupabase>>>;

type EnsureOrganizationInput = {
  userId: string;
  name: string;
  type?: string;
  countryCode?: string;
};

type SaveCustomDesignInput = {
  userId: string;
  design: Row;
  name?: string;
  organizationId?: string | null;
  status?: string;
};

type SaveRosterInput = {
  userId: string;
  name?: string;
  organizationId?: string | null;
  rows?: unknown[];
  rosterId?: string | null;
};

type CreateQuoteInput = {
  userId: string;
  organizationId?: string | null;
  payload: Row;
};

type RespondDesignInput = { designId: string; decision: string; note?: string };
type RespondQuoteInput = { quoteId: string; decision: string; note?: string };
type StartQuotePaymentInput = {
  quoteNumber: string;
  customerEmail: string;
  paymentMethod: string;
};
type ProjectMessageInput = {
  organizationId?: string | null | undefined;
  quoteId?: string | null | undefined;
  orderId?: string | null | undefined;
  body: string;
  attachmentIds?: unknown[];
};
type ReorderInput = {
  organizationId?: string | null | undefined;
  sourceOrderId?: string | null | undefined;
  sourceQuoteId?: string | null | undefined;
  sourceDesignId?: string | null | undefined;
  requestType?: string;
  items?: unknown[];
  playerDetails?: Row;
  note?: string;
};
type ExternalSignatureInput = {
  accessToken?: string | undefined;
  contractId: string;
  signerName: string;
  signerEmail: string;
};
type SignContractInput = {
  accessToken?: string | undefined;
  contractId: string;
  signerName: string;
  signerEmail: string;
  signatureValue: string;
  signatureType?: string;
  consentVersion?: string;
};
type PaymentProofInput = {
  accessToken?: string | undefined;
  entityType: string;
  entityId: string;
  file: File | null;
  amount: string | number;
  currency?: string;
  paymentMethod?: string;
  reference?: string;
  note?: string;
};

const allowLocalPersistence =
  Boolean(import.meta.env.DEV) ||
  ['localhost', '127.0.0.1'].includes(globalThis.location?.hostname || '');
const STORAGE_PREFIX = 'shababuna-b2b-v2';
const MAX_LOCAL_ROWS = 80;

const nowIso = () => new Date().toISOString();
const newId = (prefix: string): string =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`;
const storageKey = (kind: string, userId?: string | null): string =>
  `${STORAGE_PREFIX}:${kind}:${userId || 'guest'}`;

function readLocal(kind: string, userId?: string | null): Row[] {
  if (!allowLocalPersistence) return [];
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(storageKey(kind, userId)) || '[]');
    return Array.isArray(parsed) ? (parsed as Row[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(kind: string, userId: string | null | undefined, rows: Row[]): Row[] {
  if (!allowLocalPersistence) return rows;
  try {
    globalThis.localStorage?.setItem(
      storageKey(kind, userId),
      JSON.stringify(rows.slice(0, MAX_LOCAL_ROWS)),
    );
  } catch {
    // The cloud path remains authoritative when local storage is unavailable.
  }
  return rows;
}

function upsertLocal(kind: string, userId: string | null | undefined, row: Row): Row {
  const rows = readLocal(kind, userId);
  const next = [row, ...rows.filter((item) => item.id !== row.id)].sort((a: Row, b: Row) =>
    String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)),
  );
  writeLocal(kind, userId, next);
  return row;
}

async function membershipIds(client: Supa | null, userId?: string | null): Promise<string[]> {
  if (!client || !userId) return [];
  const { data, error } = await client
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(20);
  if (error) return [];
  return [
    ...new Set((data || []).map((row: Row) => String(row.organization_id || '')).filter(Boolean)),
  ];
}

async function cloudList(
  table: string,
  userId: string,
  order = 'updated_at',
): Promise<Row[] | null> {
  const client = await getSupabase();
  if (!userId || userId === 'guest') {
    if (allowLocalPersistence) return null;
    throw Object.assign(new Error('authentication_required'), { code: 'AUTH_REQUIRED' });
  }
  if (!client) {
    if (allowLocalPersistence) return null;
    throw Object.assign(new Error('cloud_not_configured'), { code: 'CLOUD_REQUIRED' });
  }
  const organizations = await membershipIds(client, userId);
  let query = client.from(table).select('*');
  if (organizations.length) {
    const organizationFilter = organizations
      .map((id: string) => `organization_id.eq.${id}`)
      .join(',');
    query = query.or(`user_id.eq.${userId},${organizationFilter}`) as typeof query;
  } else {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query.order(order, { ascending: false }).limit(100);
  if (error) throw error;
  return (data || []) as Row[];
}

async function cloudUpsert(table: string, row: Row): Promise<Row | null> {
  const client = await getSupabase();
  if (!client) {
    if (allowLocalPersistence) return null;
    throw Object.assign(new Error('cloud_not_configured'), { code: 'CLOUD_REQUIRED' });
  }
  const { data, error } = await client
    .from(table)
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  return data as Row;
}

export async function ensureOrganization({
  userId,
  name,
  type = 'club',
  countryCode = 'LY',
}: EnsureOrganizationInput): Promise<Row | null> {
  if (!userId || userId === 'guest' || !String(name || '').trim()) return null;
  try {
    const client = await getSupabase();
    if (!client) {
      if (allowLocalPersistence) return null;
      throw Object.assign(new Error('cloud_not_configured'), { code: 'CLOUD_REQUIRED' });
    }
    const { data, error } = await client.rpc('create_or_get_my_organization', {
      p_name: String(name).trim().slice(0, 160),
      p_organization_type: String(type || 'club'),
      p_country_code: String(countryCode || 'LY')
        .toUpperCase()
        .slice(0, 2),
    });
    if (error) throw error;
    return data || null;
  } catch {
    return null;
  }
}

export async function listSavedDesigns(userId: string): Promise<Row[]> {
  try {
    const cloud = await cloudList('custom_designs', userId);
    if (cloud) {
      writeLocal('designs', userId, cloud);
      return cloud;
    }
  } catch (error) {
    if (!allowLocalPersistence) throw error;
  }
  return readLocal('designs', userId);
}

export async function saveCustomDesign({
  userId,
  design,
  name,
  organizationId = null,
  status = 'draft',
}: SaveCustomDesignInput): Promise<Row> {
  const previousId = (design.id as string | undefined) || null;
  const row = {
    id: previousId || newId('design'),
    user_id: userId || null,
    organization_id: organizationId,
    name: String(name || design.teamName || 'Untitled design')
      .trim()
      .slice(0, 120),
    product_type: design.productType,
    status,
    version: Math.max(1, Number(design.version || 0) + (previousId ? 1 : 0)),
    design_data: {
      ...design,
      id: undefined,
      version: undefined,
      logoPreview: String(design.logoPreview || '').startsWith('data:')
        ? null
        : design.logoPreview || null,
    },
    preview_data: {
      primary: design.primary,
      secondary: design.secondary,
      accent: design.accent,
      teamName: design.teamName,
      number: design.number,
      variant: design.variant,
    },
    created_at: design.created_at || nowIso(),
    updated_at: nowIso(),
  };
  try {
    const saved = await cloudUpsert('custom_designs', row);
    if (saved) return upsertLocal('designs', userId, saved);
  } catch (error) {
    if (!allowLocalPersistence) throw error;
  }
  return upsertLocal('designs', userId, row);
}

export async function duplicateCustomDesign({
  userId,
  design,
}: {
  userId: string;
  design: Row;
}): Promise<Row> {
  return saveCustomDesign({
    userId,
    design: { ...design, id: undefined, version: 1, created_at: undefined } as Row,
    name: `${String(design.name || design.teamName || 'Design')} Copy`,
  });
}

export async function listRosters(userId: string): Promise<Row[]> {
  try {
    const cloud = await cloudList('team_rosters', userId);
    if (cloud) {
      writeLocal('rosters', userId, cloud);
      return cloud;
    }
  } catch (error) {
    if (!allowLocalPersistence) throw error;
  }
  return readLocal('rosters', userId);
}

export async function saveRoster({
  userId,
  name,
  organizationId = null,
  rows = [],
  rosterId = null,
}: SaveRosterInput): Promise<Row> {
  const normalized = normalizeRoster(rows as import('../data/customization').RosterInput[]);
  const row = {
    id: rosterId || newId('roster'),
    user_id: userId || null,
    organization_id: organizationId,
    name: String(name || 'Team roster')
      .trim()
      .slice(0, 120),
    players: normalized,
    player_count: normalized.length,
    validation_errors: normalized.reduce(
      (sum: number, player: { errors: unknown[] }) => sum + player.errors.length,
      0,
    ),
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  try {
    const saved = await cloudUpsert('team_rosters', row);
    if (saved) return upsertLocal('rosters', userId, saved);
  } catch (error) {
    if (!allowLocalPersistence) throw error;
  }
  return upsertLocal('rosters', userId, row);
}

export async function listQuoteRequests(userId: string): Promise<Row[]> {
  try {
    const cloud = await cloudList('quote_requests', userId);
    if (cloud) {
      writeLocal('quotes', userId, cloud);
      return cloud;
    }
  } catch (error) {
    if (!allowLocalPersistence) throw error;
  }
  return readLocal('quotes', userId);
}

export async function createQuoteRequest({
  userId,
  organizationId = null,
  payload,
}: CreateQuoteInput): Promise<Row> {
  const row = {
    id: newId('quote'),
    user_id: userId || null,
    organization_id: organizationId,
    quote_number: `QT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-6)}`,
    status: 'under_review',
    currency: 'USD',
    subtotal: null,
    shipping_total: null,
    total: null,
    deposit_percent: 50,
    request_data: payload,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  try {
    const saved = await cloudUpsert('quote_requests', row);
    if (saved) return upsertLocal('quotes', userId, saved);
  } catch (error) {
    if (!allowLocalPersistence) throw error;
  }
  return upsertLocal('quotes', userId, row);
}

export async function listProductionUpdates(userId: string): Promise<Row[]> {
  try {
    const client = await getSupabase();
    if (client && userId && userId !== 'guest') {
      const quotes = await cloudList('quote_requests', userId, 'created_at');
      const quoteIds = (quotes || []).map((row: Row) => String(row.id || '')).filter(Boolean);
      if (!quoteIds.length) return [];
      const { data, error } = await client
        .from('production_updates')
        .select('*')
        .in('quote_id', quoteIds)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      writeLocal('production', userId, data || []);
      return data || [];
    }
  } catch (error) {
    if (!allowLocalPersistence) throw error;
  }
  return readLocal('production', userId);
}

export function saveLocalProductionUpdate(userId: string, update: Row): Row {
  if (!allowLocalPersistence)
    throw Object.assign(new Error('cloud_required'), { code: 'CLOUD_REQUIRED' });
  return upsertLocal('production', userId, {
    id: update.id || newId('production'),
    created_at: update.created_at || nowIso(),
    ...update,
  });
}

export function clearB2bLocalState(userId: string): void {
  if (!allowLocalPersistence) return;
  for (const kind of ['designs', 'rosters', 'quotes', 'production']) {
    try {
      globalThis.localStorage?.removeItem(storageKey(kind, userId));
    } catch {
      /* ignore */
    }
  }
}

export async function listDesignVersions(designId: string): Promise<Row[]> {
  try {
    const client = await getSupabase();
    if (!client || !designId) return [];
    const { data, error } = await client
      .from('custom_design_versions')
      .select('*')
      .eq('design_id', designId)
      .order('version', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  } catch (error) {
    if (!allowLocalPersistence) throw error;
    return [];
  }
}

export async function respondToDesign({
  designId,
  decision,
  note = '',
}: RespondDesignInput): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client.rpc('customer_respond_to_design', {
    p_design_id: designId,
    p_decision: decision,
    p_note: String(note || '').slice(0, 1000),
  });
  if (error) throw error;
  return data;
}

export async function respondToQuote({
  quoteId,
  decision,
  note = '',
}: RespondQuoteInput): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client.rpc('customer_respond_to_quote', {
    p_quote_id: quoteId,
    p_decision: decision,
    p_note: String(note || '').slice(0, 1000),
  });
  if (error) throw error;
  return data;
}

export async function startQuotePayment({
  quoteNumber,
  customerEmail,
  paymentMethod,
}: StartQuotePaymentInput): Promise<Row> {
  const response = await fetch('/api/create-quote-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({ quoteNumber, customerEmail, paymentMethod }),
  });
  const text = await response.text().catch(() => '');
  let result: Row = {};
  try {
    result = text ? (JSON.parse(text) as Row) : {};
  } catch {
    /* ignore */
  }
  if (!response.ok || !result.url)
    throw new Error(String(result.error || 'quote_payment_session_failed'));
  window.location.assign(String(result.url));
  return result;
}

async function requireCloudUser(userId: string): Promise<Supa> {
  if (!userId || userId === 'guest')
    throw Object.assign(new Error('authentication_required'), { code: 'AUTH_REQUIRED' });
  const client = await getSupabase();
  if (!client) throw Object.assign(new Error('cloud_not_configured'), { code: 'CLOUD_REQUIRED' });
  return client;
}

async function listForOrganizations(
  client: Supa,
  table: string,
  organizationIds: string[],
  order = 'created_at',
): Promise<Row[]> {
  if (!organizationIds.length) return [];
  const { data, error } = await client
    .from(table)
    .select('*')
    .in('organization_id', organizationIds)
    .order(order, { ascending: false })
    .limit(200);
  if (error) throw error;
  return data || [];
}

export async function loadEnterpriseWorkspace(userId: string): Promise<Row> {
  const client = await requireCloudUser(userId);
  const organizations = await membershipIds(client, userId);
  const [ordersRaw, quotesRaw, invoices, contracts, reorders, paymentProofs, lockers, messages] =
    await Promise.all([
      cloudList('orders', userId, 'created_at').catch(() => [] as Row[]),
      cloudList('quote_requests', userId, 'created_at').catch(() => [] as Row[]),
      listForOrganizations(client, 'invoices', organizations).catch(() => [] as Row[]),
      listForOrganizations(client, 'organization_contracts', organizations).catch(
        () => [] as Row[],
      ),
      listForOrganizations(client, 'reorder_requests', organizations).catch(() => [] as Row[]),
      listForOrganizations(client, 'payment_proofs', organizations).catch(() => [] as Row[]),
      listForOrganizations(client, 'team_locker_stores', organizations).catch(() => [] as Row[]),
      listForOrganizations(client, 'project_messages', organizations).catch(() => [] as Row[]),
    ]);
  const orders = (ordersRaw || []) as Row[];
  const quotes = (quotesRaw || []) as Row[];
  const orderIds = orders.map((row: Row) => String(row.id || '')).filter(Boolean);
  const quoteIds = quotes.map((row: Row) => String(row.id || '')).filter(Boolean);
  let shipments: Row[] = [];
  if (orderIds.length || quoteIds.length) {
    const query = client.from('shipments').select('*,carrier:carriers(name,tracking_url_template)');
    const filters: string[] = [];
    if (orderIds.length) filters.push(`order_id.in.(${orderIds.join(',')})`);
    if (quoteIds.length)
      filters.push(
        `quote_id.in.(${quoteIds.map((id: string) => `"${String(id).replaceAll('"', '')}"`).join(',')})`,
      );
    const result = await query
      .or(filters.join(','))
      .order('created_at', { ascending: false })
      .limit(200);
    if (!result.error) shipments = (result.data || []) as Row[];
  }
  return {
    organizations,
    invoices,
    contracts,
    reorders,
    paymentProofs,
    lockers,
    messages,
    shipments,
  };
}

export async function createProjectMessage({
  organizationId,
  quoteId = null,
  orderId = null,
  body,
  attachmentIds = [],
}: ProjectMessageInput): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const message = String(body || '').trim();
  if (!message || message.length > 5000) throw new Error('invalid_message');
  const { data, error } = await client.rpc('customer_create_project_message', {
    p_organization_id: organizationId || null,
    p_quote_id: quoteId || null,
    p_order_id: orderId || null,
    p_body: message,
    p_attachment_ids: Array.isArray(attachmentIds) ? attachmentIds.slice(0, 8) : [],
  });
  if (error) throw error;
  return data;
}

export async function createReorderRequest({
  organizationId,
  sourceOrderId = null,
  sourceQuoteId = null,
  sourceDesignId = null,
  requestType = 'full_reorder',
  items = [],
  playerDetails = {},
  note = '',
}: ReorderInput): Promise<unknown> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const { data, error } = await client.rpc('customer_create_reorder_request', {
    p_payload: {
      organization_id: organizationId,
      source_order_id: sourceOrderId,
      source_quote_id: sourceQuoteId,
      source_design_id: sourceDesignId,
      request_type: requestType,
      items: Array.isArray(items) ? items : [],
      player_details: playerDetails && typeof playerDetails === 'object' ? playerDetails : {},
      customer_note: String(note || '').slice(0, 3000),
    },
  });
  if (error) throw error;
  return data;
}

export async function startExternalContractSignature({
  accessToken,
  contractId,
  signerName,
  signerEmail,
}: ExternalSignatureInput): Promise<Row> {
  if (!accessToken) throw new Error('authentication_required');
  const response = await fetch('/api/signature-envelope', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ contractId, signerName, signerEmail }),
  });
  const data = (await response.json().catch(() => ({}))) as Row;
  if (!response.ok || !data.ok || !/^https:\/\//i.test(String(data.signingUrl || '')))
    throw new Error(String(data.error || 'signature_provider_unavailable'));
  window.location.assign(String(data.signingUrl));
  return data;
}

export async function signOrganizationContract({
  accessToken,
  contractId,
  signerName,
  signerEmail,
  signatureValue,
  signatureType = 'typed',
  consentVersion = '1.0',
}: SignContractInput): Promise<unknown> {
  if (!accessToken) throw new Error('authentication_required');
  const response = await fetch('/api/contract-sign', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      contractId,
      signerName,
      signerEmail,
      signatureValue,
      signatureType,
      consentVersion,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(String(data.error || 'contract_sign_unavailable'));
  return data.contract;
}

function encodePaymentProof(file: File | null): Promise<Row> {
  return new Promise((resolve, reject) => {
    if (!(file instanceof File) || !file.size || file.size > 2 * 1024 * 1024)
      return reject(new Error('invalid_file_size'));
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
    if (!allowed.has(file.type)) return reject(new Error('unsupported_file_type'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('file_read_failed'));
    reader.onload = () =>
      resolve({
        name: file.name,
        mime: file.type,
        role: 'additional_file',
        base64: String(reader.result || '').split(',')[1] || '',
      });
    reader.readAsDataURL(file);
  });
}

export async function submitPaymentProof({
  accessToken,
  entityType,
  entityId,
  file,
  amount,
  currency = 'USD',
  paymentMethod = 'bank_transfer',
  reference = '',
  note = '',
}: PaymentProofInput): Promise<unknown> {
  if (!accessToken) throw new Error('authentication_required');
  const encoded = await encodePaymentProof(file);
  const response = await fetch('/api/payment-proof', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      entityType,
      entityId,
      files: [encoded],
      amount,
      currency,
      paymentMethod,
      reference,
      note,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(String(data.error || 'payment_proof_unavailable'));
  return data.proof;
}

export async function getTeamLocker(
  slug: string | undefined,
): Promise<{ store: Row | null; products: Row[] }> {
  const client = await getSupabase();
  if (!client) throw new Error('cloud_not_configured');
  const cleanSlug = String(slug || '')
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9-]{2,100}$/.test(cleanSlug)) throw new Error('invalid_team_locker');
  const { data: store, error: storeError } = await client
    .from('team_locker_stores')
    .select('*')
    .eq('slug', cleanSlug)
    .maybeSingle();
  if (storeError) throw storeError;
  if (!store || store.status !== 'active') throw new Error('team_locker_unavailable');
  const { data: products, error: productsError } = await client
    .from('team_locker_products')
    .select('*')
    .eq('locker_store_id', store.id)
    .eq('status', 'active')
    .order('sort_order', { ascending: true });
  if (productsError) throw productsError;
  return { store: (store || null) as Row | null, products: (products || []) as Row[] };
}
