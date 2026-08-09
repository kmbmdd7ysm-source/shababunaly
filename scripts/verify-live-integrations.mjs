import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { getPaymentAdapter } from '../api/payments/registry.js';

const production =
  process.env.NODE_ENV === 'production' || process.env.REQUIRE_LIVE_INTEGRATIONS === 'true';
const required = (name) => String(process.env[name] || '').trim();
const checks = [];
const add = (name, ok, detail) => checks.push({ name, status: ok ? 'passed' : 'failed', detail });
const fetchWithTimeout = async (url, options = {}, timeout = 12_000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const siteUrl = required('SITE_URL');
const supabaseUrl = required('SUPABASE_URL');
const supabaseKey = required('SUPABASE_SERVICE_ROLE_KEY');
const formEndpoint = required('FORMSPREE_ORDER_ENDPOINT');
const scannerUrl = required('MALWARE_SCAN_API_URL');
const scannerKey = required('MALWARE_SCAN_API_KEY');
const paymentProvider = required('PAYMENTS_PROVIDER');
const paymentSession = required('PAYMENTS_SESSION_URL');
const paymentRetrieve = required('PAYMENTS_RETRIEVE_URL');
const paymentRefund = required('PAYMENTS_REFUND_URL');
const signatureProvider = required('SIGNATURE_PROVIDER');
const signatureCreateUrl =
  required('SIGNATURE_CREATE_ENVELOPE_URL') || required('SIGNATURE_API_URL');
const signatureWebhookSecret = required('SIGNATURE_WEBHOOK_SECRET');
const signatureSchema = required('SIGNATURE_PROVIDER_SCHEMA_VERSION');
const signatureTestEnvelope = required('SIGNATURE_PROVIDER_TEST_ENVELOPE_ID');
const mailboxUrl = required('INTEGRATION_MAILBOX_API_URL');
const mailboxToken = required('INTEGRATION_MAILBOX_API_TOKEN');
const formAdminRecipient = required('FORMSPREE_ADMIN_RECIPIENT');
const paymentTestTransaction = required('PAYMENTS_SANDBOX_TEST_TRANSACTION_ID');

if (supabaseUrl && supabaseKey) {
  try {
    const response = await fetchWithTimeout(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/`, {
      headers: { apikey: supabaseKey, authorization: `Bearer ${supabaseKey}` },
    });
    add('supabase_service', response.ok, `HTTP ${response.status}`);
  } catch (error) {
    add('supabase_service', false, error.message);
  }
} else add('supabase_service', false, 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');

if (siteUrl) {
  try {
    const response = await fetchWithTimeout(`${siteUrl.replace(/\/$/, '')}/api/readiness`, {
      headers: { accept: 'application/json' },
    });
    const body = await response.json().catch(() => ({}));
    add(
      'production_readiness_endpoint',
      response.ok && body?.ok === true,
      `HTTP ${response.status}`,
    );
  } catch (error) {
    add('production_readiness_endpoint', false, error.message);
  }
} else add('production_readiness_endpoint', false, 'SITE_URL missing');

if (formEndpoint && process.env.ALLOW_LIVE_FORMSPREE_TEST === 'true') {
  const marker = `integration-${Date.now()}-${createHash('sha256').update(String(Math.random())).digest('hex').slice(0, 8)}`;
  const testEmail = required('INTEGRATION_TEST_EMAIL') || 'integration-test@shababuna.ly';
  try {
    const response = await fetchWithTimeout(formEndpoint, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'SHABABUNA Integration Test',
        email: testEmail,
        message: marker,
        _subject: `SHABABUNA integration verification ${marker}`,
      }),
    });
    const body = await response.json().catch(() => ({}));
    add(
      'formspree_submission',
      response.ok && body?.ok !== false,
      `HTTP ${response.status}; marker ${marker}`,
    );
    if (response.ok && mailboxUrl && mailboxToken && formAdminRecipient) {
      let messages = [];
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const inboxResponse = await fetchWithTimeout(
          `${mailboxUrl}${mailboxUrl.includes('?') ? '&' : '?'}q=${encodeURIComponent(marker)}`,
          { headers: { authorization: `Bearer ${mailboxToken}`, accept: 'application/json' } },
          10_000,
        );
        const inboxBody = await inboxResponse.json().catch(() => ({}));
        messages = Array.isArray(inboxBody)
          ? inboxBody
          : inboxBody.messages || inboxBody.items || [];
        if (messages.length >= 2) break;
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
      const recipients = messages
        .flatMap((message) => [
          message.to,
          message.recipient,
          ...(Array.isArray(message.recipients) ? message.recipients : []),
        ])
        .map((value) => String(value || '').toLowerCase());
      const adminDelivered = recipients.some((value) =>
        value.includes(formAdminRecipient.toLowerCase()),
      );
      const autoresponseDelivered = recipients.some((value) =>
        value.includes(testEmail.toLowerCase()),
      );
      add(
        'formspree_admin_delivery',
        adminDelivered,
        `${messages.length} matching mailbox message(s)`,
      );
      add(
        'formspree_autoresponse_delivery',
        autoresponseDelivered,
        `${messages.length} matching mailbox message(s)`,
      );
    } else {
      add(
        'formspree_admin_delivery',
        false,
        'mailbox verification adapter or admin recipient missing',
      );
      add('formspree_autoresponse_delivery', false, 'mailbox verification adapter missing');
    }
  } catch (error) {
    add('formspree_submission', false, error.message);
    add('formspree_admin_delivery', false, error.message);
    add('formspree_autoresponse_delivery', false, error.message);
  }
} else {
  const detail =
    process.env.ALLOW_LIVE_FORMSPREE_TEST === 'true'
      ? 'endpoint missing'
      : 'explicit ALLOW_LIVE_FORMSPREE_TEST=true required';
  add('formspree_submission', false, detail);
  add('formspree_admin_delivery', false, detail);
  add('formspree_autoresponse_delivery', false, detail);
}

if (scannerUrl && scannerKey && process.env.ALLOW_LIVE_MALWARE_TEST === 'true') {
  for (const sample of [
    { name: 'clean', bytes: 'SHABABUNA clean integration sample' },
    {
      name: 'eicar',
      bytes: 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
    },
  ]) {
    try {
      const response = await fetchWithTimeout(scannerUrl, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${scannerKey}`,
          'content-type': 'application/octet-stream',
          'x-file-name': `${sample.name}.txt`,
        },
        body: sample.bytes,
      });
      const body = await response.json().catch(() => ({}));
      const verdict = String(body.verdict || body.status || '').toLowerCase();
      const ok =
        sample.name === 'clean'
          ? response.ok && ['clean', 'safe', 'ok'].includes(verdict)
          : response.ok && ['infected', 'malicious', 'blocked'].includes(verdict);
      add(`malware_${sample.name}`, ok, `HTTP ${response.status}; verdict ${verdict || 'missing'}`);
    } catch (error) {
      add(`malware_${sample.name}`, false, error.message);
    }
  }
} else {
  add(
    'malware_clean',
    false,
    process.env.ALLOW_LIVE_MALWARE_TEST === 'true'
      ? 'scanner configuration missing'
      : 'explicit ALLOW_LIVE_MALWARE_TEST=true required',
  );
  add(
    'malware_eicar',
    false,
    process.env.ALLOW_LIVE_MALWARE_TEST === 'true'
      ? 'scanner configuration missing'
      : 'explicit ALLOW_LIVE_MALWARE_TEST=true required',
  );
}

add(
  'payment_provider_named',
  Boolean(paymentProvider && !/generic|http|adapter|test|mock/i.test(paymentProvider)),
  paymentProvider || 'PAYMENTS_PROVIDER missing',
);
add(
  'payment_provider_contract',
  Boolean(paymentSession && paymentRetrieve && paymentRefund),
  'session, retrieve and refund endpoints must all be configured',
);
if (process.env.ALLOW_LIVE_PAYMENT_TEST === 'true' && paymentTestTransaction) {
  try {
    const adapter = getPaymentAdapter('online_card');
    const marker = `integration-${Date.now()}`;
    const created = await adapter.createSession({
      trustedOrder: {
        entityType: 'order',
        entityId: marker,
        orderNumber: marker.toUpperCase(),
        amount: Number(process.env.PAYMENTS_SANDBOX_SESSION_AMOUNT || 0.5),
        currency: required('PAYMENTS_SANDBOX_TEST_CURRENCY') || 'USD',
        customerEmail: required('INTEGRATION_TEST_EMAIL') || 'integration-test@shababuna.ly',
        metadata: { integrationTest: true },
      },
      idempotencyKey: `integration-session-${marker}`,
      successUrl: `${siteUrl.replace(/\/$/, '')}/payment/success?integration=${marker}`,
      cancelUrl: `${siteUrl.replace(/\/$/, '')}/checkout?integration=${marker}`,
    });
    add(
      'payment_create_session_live',
      Boolean(created?.providerSessionId && /^https:\/\//i.test(created?.url || '')),
      `session ${created?.providerSessionId || 'missing'}`,
    );
    const retrieved = await adapter.retrievePayment({
      transactionId: paymentTestTransaction,
      providerSessionId: '',
      orderNumber: '',
      quoteNumber: '',
    });
    add(
      'payment_retrieve_live',
      Boolean(retrieved?.id && retrieved?.status),
      `status ${retrieved?.status || 'missing'}`,
    );
    const refundAmount = Number(process.env.PAYMENTS_SANDBOX_TEST_REFUND_AMOUNT || 0.01);
    const refund = await adapter.refund({
      transactionId: paymentTestTransaction,
      amount: refundAmount,
      currency: required('PAYMENTS_SANDBOX_TEST_CURRENCY') || 'USD',
      idempotencyKey: `integration-refund-${Date.now()}`,
      reason: 'SHABABUNA production verification',
      metadata: { integrationTest: true },
    });
    add(
      'payment_refund_live',
      Boolean(refund?.id && refund?.status),
      `status ${refund?.status || 'missing'}`,
    );
  } catch (error) {
    add('payment_create_session_live', false, error.message);
    add('payment_retrieve_live', false, error.message);
    add('payment_refund_live', false, error.message);
  }
} else {
  add(
    'payment_create_session_live',
    false,
    'ALLOW_LIVE_PAYMENT_TEST=true and PAYMENTS_SANDBOX_TEST_TRANSACTION_ID required',
  );
  add(
    'payment_retrieve_live',
    false,
    'ALLOW_LIVE_PAYMENT_TEST=true and PAYMENTS_SANDBOX_TEST_TRANSACTION_ID required',
  );
  add('payment_refund_live', false, 'sandbox refund test not explicitly enabled');
}

add(
  'signature_provider_configuration',
  Boolean(
    signatureProvider &&
    !/generic|adapter|http|test|mock/i.test(signatureProvider) &&
    /^https:\/\//i.test(signatureCreateUrl) &&
    signatureWebhookSecret &&
    signatureSchema,
  ),
  signatureProvider || 'signature provider configuration missing',
);
if (supabaseUrl && supabaseKey && signatureTestEnvelope) {
  try {
    const response = await fetchWithTimeout(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/contract_signature_envelopes?provider_envelope_id=eq.${encodeURIComponent(signatureTestEnvelope)}&select=provider_status,signed_document_sha256,audit_certificate_sha256,identity_verification,completed_at&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          authorization: `Bearer ${supabaseKey}`,
          accept: 'application/json',
        },
      },
    );
    const rows = await response.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : null;
    const evidence =
      row?.provider_status === 'signed' &&
      /^[0-9a-f]{64}$/.test(String(row?.signed_document_sha256 || '')) &&
      /^[0-9a-f]{64}$/.test(String(row?.audit_certificate_sha256 || '')) &&
      row?.identity_verification &&
      Object.keys(row.identity_verification).length > 0 &&
      row?.completed_at;
    add(
      'signature_completed_envelope_evidence',
      Boolean(response.ok && evidence),
      `HTTP ${response.status}; status ${row?.provider_status || 'missing'}`,
    );
  } catch (error) {
    add('signature_completed_envelope_evidence', false, error.message);
  }
} else
  add(
    'signature_completed_envelope_evidence',
    false,
    'SIGNATURE_PROVIDER_TEST_ENVELOPE_ID and Supabase credentials required',
  );

const failed = checks.filter((check) => check.status !== 'passed');
const report = {
  commitSha: process.env.GITHUB_SHA || null,
  runId: process.env.GITHUB_RUN_ID || null,
  status: failed.length === 0 ? 'passed' : production ? 'failed' : 'not_run',
  generatedAt: new Date().toISOString(),
  productionRequired: production,
  checks,
};
mkdirSync('reports/integrations', { recursive: true });
writeFileSync(
  'reports/integrations/live-integrations.json',
  `${JSON.stringify(report, null, 2)}\n`,
);
if (production && failed.length) {
  console.error(
    `Live integration verification failed:\n${failed.map((check) => `- ${check.name}: ${check.detail}`).join('\n')}`,
  );
  process.exit(1);
}
console.info(
  `Live integration verification recorded: ${checks.length - failed.length}/${checks.length} passed${production ? '' : ' (non-production mode)'}.`,
);
