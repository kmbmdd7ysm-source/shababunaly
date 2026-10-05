import crypto from 'node:crypto';
import { applyApiHeaders, guardPublicPost } from './_request-security.js';
import { deleteBlobJson, readBlobJson, writeBlobJson } from './_blob-store.js';
import {
  accountIdPath,
  accountPath,
  clearSessionCookie,
  hashPassword,
  publicCustomer,
  sessionFromRequest,
  setSessionCookie,
  userAddressesPath,
  userOrderIndexPath,
  userStatePath,
  verifyPassword,
} from './_customer-session.js';
import { sendInternalFormNotification } from './_internal-form-notification.js';

type ApiReq = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};
type ApiRes = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => { json: (body: unknown) => unknown };
};

type Account = Record<string, unknown> & {
  id: string;
  email: string;
  passwordHash: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (value: unknown, max = 5000): string =>
  String(value ?? '').replace(/[<>\0]/g, '').trim().slice(0, max);
const emailKey = (value: unknown): string => clean(value, 254).toLowerCase();

function safeMetadata(input: unknown): Record<string, unknown> {
  const source =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const accountType = clean(source.account_type || source.accountType, 40) === 'organization'
    ? 'organization'
    : 'customer';
  const allowedOrganizationTypes = new Set([
    'club',
    'academy',
    'federation',
    'school_university',
    'wholesale',
    'distributor',
  ]);
  const organizationType = clean(source.organization_type || source.organizationType, 60);
  return {
    first_name: clean(source.first_name || source.firstName, 80),
    last_name: clean(source.last_name || source.lastName, 80),
    display_name: clean(
      source.display_name || source.displayName || source.fullName || source.full_name || source.name,
      120,
    ),
    fullName: clean(source.fullName || source.full_name || source.display_name || source.name, 120),
    phone: clean(source.phone, 40),
    account_type: accountType,
    organization_name:
      accountType === 'organization'
        ? clean(source.organization_name || source.organizationName, 160)
        : '',
    organization_type:
      accountType === 'organization' && allowedOrganizationTypes.has(organizationType)
        ? organizationType
        : '',
  };
}

async function loadAccountByEmail(email: string): Promise<Account | null> {
  const { value } = await readBlobJson<Account>(accountPath(email));
  return value || null;
}

async function loadAccountById(id: string): Promise<Account | null> {
  const { value } = await readBlobJson<Account>(accountIdPath(id));
  return value || null;
}

async function saveAccount(account: Account, options: { create?: boolean } = {}): Promise<void> {
  const next = { ...account, updatedAt: new Date().toISOString() };
  await writeBlobJson(accountIdPath(account.id), next, {
    allowOverwrite: !options.create,
  });
  try {
    await writeBlobJson(accountPath(account.email), next, {
      allowOverwrite: !options.create,
    });
  } catch (error) {
    if (options.create) {
      await deleteBlobJson(accountIdPath(account.id)).catch(() => undefined);
    }
    throw error;
  }
}

function sessionPayload(account: Account) {
  const user = publicCustomer(account);
  return {
    user,
    session: {
      user,
      access_token: 'cookie-session',
      token_type: 'bearer',
      expires_in: 60 * 60 * 24 * 30,
    },
  };
}

function invalidCredentials(res: ApiRes) {
  return res.status(401).json({ ok: false, error: 'invalid_credentials' });
}

export default async function handler(req: ApiReq, res: ApiRes) {
  applyApiHeaders(res);
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'GET') {
    try {
      const session = sessionFromRequest(req);
      if (!session) return res.status(200).json({ ok: true, user: null, session: null });
      const account = await loadAccountById(session.id);
      if (!account || emailKey(account.email) !== session.email) {
        clearSessionCookie(res);
        return res.status(200).json({ ok: true, user: null, session: null });
      }
      return res.status(200).json({ ok: true, ...sessionPayload(account) });
    } catch {
      return res.status(503).json({ ok: false, error: 'account_service_unavailable' });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (
    !(await guardPublicPost(req, res, {
      maxBytes: 64_000,
      limit: 18,
      windowMs: 10 * 60_000,
      bucket: 'customer-auth',
      honeypot: false,
      allowEphemeralFallback: true,
    }))
  ) return;

  try {
    const body =
      req.body && typeof req.body === 'object'
        ? (req.body as Record<string, unknown>)
        : {};
    const action = clean(body.action, 40).toLowerCase();

    if (action === 'signup') {
      const email = emailKey(body.email);
      const password = String(body.password || '');
      if (!EMAIL.test(email) || password.length < 8 || password.length > 200) {
        return res.status(400).json({ ok: false, error: 'invalid_signup' });
      }
      if (await loadAccountByEmail(email)) {
        return res.status(409).json({ ok: false, error: 'email_exists' });
      }
      const now = new Date().toISOString();
      const account: Account = {
        id: crypto.randomUUID(),
        email,
        passwordHash: hashPassword(password),
        metadata: safeMetadata(body.metadata),
        createdAt: now,
        updatedAt: now,
        emailConfirmedAt: now,
      };
      try {
        await saveAccount(account, { create: true });
      } catch (error) {
        const status =
          error && typeof error === 'object' && 'status' in error
            ? Number((error as { status?: unknown }).status)
            : 0;
        if ([409, 412].includes(status)) {
          return res.status(409).json({ ok: false, error: 'email_exists' });
        }
        throw error;
      }
      setSessionCookie(res, account);
      return res.status(201).json({ ok: true, data: sessionPayload(account) });
    }

    if (action === 'signin') {
      const email = emailKey(body.email);
      const password = String(body.password || '');
      if (!EMAIL.test(email) || !password) return invalidCredentials(res);
      const account = await loadAccountByEmail(email);
      if (!account || !verifyPassword(password, account.passwordHash)) {
        return invalidCredentials(res);
      }
      setSessionCookie(res, account);
      return res.status(200).json({ ok: true, data: sessionPayload(account) });
    }

    if (action === 'reset') {
      const email = emailKey(body.email);
      if (!EMAIL.test(email)) return res.status(200).json({ ok: true, requested: true });
      const account = await loadAccountByEmail(email);
      if (account) {
        await sendInternalFormNotification(
          {
            form_type: 'account_reset',
            customer_email: email,
            customer_name: clean(
              account.metadata?.display_name || account.metadata?.fullName || 'Shababuna customer',
              160,
            ),
            account_id: account.id,
            requested_at: new Date().toISOString(),
          },
          'Shababuna account reset request',
        ).catch(() => undefined);
      }
      return res.status(200).json({ ok: true, requested: true, manual: true });
    }

    if (action === 'signout') {
      clearSessionCookie(res);
      return res.status(200).json({ ok: true });
    }

    const session = sessionFromRequest(req);
    if (!session) return res.status(401).json({ ok: false, error: 'authentication_required' });
    const account = await loadAccountById(session.id);
    if (!account || emailKey(account.email) !== session.email) {
      clearSessionCookie(res);
      return res.status(401).json({ ok: false, error: 'authentication_required' });
    }

    if (action === 'metadata') {
      account.metadata = {
        ...(account.metadata || {}),
        ...safeMetadata({ ...(account.metadata || {}), ...(body.metadata as Record<string, unknown> || {}) }),
      };
      await saveAccount(account);
      return res.status(200).json({ ok: true, data: { user: publicCustomer(account) } });
    }

    if (action === 'password') {
      const password = String(body.password || '');
      account.passwordHash = hashPassword(password);
      await saveAccount(account);
      return res.status(200).json({ ok: true, data: { user: publicCustomer(account) } });
    }

    if (action === 'email') {
      const nextEmail = emailKey(body.email);
      if (!EMAIL.test(nextEmail)) return res.status(400).json({ ok: false, error: 'invalid_email' });
      if (nextEmail !== emailKey(account.email) && (await loadAccountByEmail(nextEmail))) {
        return res.status(409).json({ ok: false, error: 'email_exists' });
      }
      const oldEmail = account.email;
      account.email = nextEmail;
      account.emailConfirmedAt = new Date().toISOString();
      await writeBlobJson(accountPath(nextEmail), account, {
        allowOverwrite: nextEmail === emailKey(oldEmail),
      });
      await writeBlobJson(accountIdPath(account.id), account, { allowOverwrite: true });
      if (nextEmail !== emailKey(oldEmail)) {
        await deleteBlobJson(accountPath(oldEmail)).catch(() => undefined);
      }
      setSessionCookie(res, account);
      return res.status(200).json({ ok: true, data: { user: publicCustomer(account) } });
    }

    if (action === 'delete') {
      await Promise.allSettled([
        deleteBlobJson(accountPath(account.email)),
        deleteBlobJson(accountIdPath(account.id)),
        deleteBlobJson(userStatePath(account.id)),
        deleteBlobJson(userAddressesPath(account.id)),
        deleteBlobJson(userOrderIndexPath(account.id)),
      ]);
      clearSessionCookie(res);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: 'invalid_action' });
  } catch (error: unknown) {
    const message = clean(
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: unknown }).message
        : error,
      240,
    );
    const client = /weak_password|invalid_/i.test(message);
    return res.status(client ? 400 : 503).json({
      ok: false,
      error: client ? message : 'account_service_unavailable',
    });
  }
}
