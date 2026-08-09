import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const production =
  process.env.REQUIRE_PROVIDER_APPROVAL === 'true' || process.env.NODE_ENV === 'production';
const https = (value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};
const named = (value) =>
  Boolean(String(value || '').trim() && !/generic|adapter|http|test|mock/i.test(String(value)));
const payment = JSON.parse(readFileSync('payment-provider-manifest.json', 'utf8'));
const signature = JSON.parse(readFileSync('signature-provider-manifest.json', 'utf8'));
const paymentChecks = [];
for (const [method, item] of Object.entries(payment.providers || {})) {
  const enabled = named(item.provider);
  const checks = {
    namedProvider: enabled,
    apiVersion: Boolean(String(item.apiVersion || '').trim()),
    documentation: https(item.documentationUrl),
    sandbox: https(item.sandboxUrl),
    webhookSchema: Boolean(String(item.webhookSchemaVersion || '').trim()),
    threeDS:
      item.threeDS?.supported === true &&
      Boolean(item.threeDS?.testedAt) &&
      Boolean(item.threeDS?.evidenceReference),
    retrieve:
      item.retrieve?.supported === true &&
      Boolean(item.retrieve?.testedAt) &&
      Boolean(item.retrieve?.evidenceReference),
    refund:
      item.refund?.supported === true &&
      Boolean(item.refund?.testedAt) &&
      Boolean(item.refund?.evidenceReference),
    fraud: Boolean(String(item.fraudProvider || '').trim()),
    reconciliation: Boolean(String(item.reconciliationEvidenceReference || '').trim()),
    applePay:
      !item.applePay?.enabled ||
      (item.applePay.domainVerified === true && Boolean(item.applePay.evidenceReference)),
    googlePay:
      !item.googlePay?.enabled ||
      (item.googlePay.merchantVerified === true && Boolean(item.googlePay.evidenceReference)),
  };
  paymentChecks.push({
    method,
    enabled,
    checks,
    ready: enabled && Object.values(checks).every(Boolean),
  });
}
const signatureChecks = {
  namedProvider: named(signature.provider),
  apiVersion: Boolean(String(signature.apiVersion || '').trim()),
  documentation: https(signature.documentationUrl),
  sandbox: https(signature.sandboxUrl),
  webhookSchema: Boolean(String(signature.webhookSchemaVersion || '').trim()),
  identityVerification: Boolean(String(signature.identityVerificationMethod || '').trim()),
  trustedTimestamp: signature.trustedTimestamp === true,
  auditCertificate: signature.auditCertificate === true,
  tamperEvidentSignedDocument: signature.tamperEvidentSignedDocument === true,
  complianceEvidence: Boolean(String(signature.regionalComplianceEvidenceReference || '').trim()),
  completedSandboxEnvelope: Boolean(String(signature.sandboxCompletedEnvelopeId || '').trim()),
  approval: Boolean(
    String(signature.testedAt || '').trim() && String(signature.approvedBy || '').trim(),
  ),
};
const signatureReady = Object.values(signatureChecks).every(Boolean);
const paymentReady =
  paymentChecks.some((item) => item.ready) &&
  paymentChecks.filter((item) => item.enabled).every((item) => item.ready);
const codeChecks = {
  externalEnvelopeApi: existsSync('api/signature-envelope.js'),
  signatureWebhook: existsSync('api/signature-webhook.js'),
  externalSignatureMigration: existsSync(
    'supabase/migrations/20260802002000_external_signature_provider.sql',
  ),
  paymentWebhook: existsSync('api/payment-webhook.js'),
  paymentRefund: existsSync('api/refund.ts'),
  paymentRetrieve: existsSync('api/retry-order-payment.ts'),
};
const codeReady = Object.values(codeChecks).every(Boolean);
const productionReady = codeReady && paymentReady && signatureReady;
const report = {
  status: productionReady ? 'passed' : production ? 'failed' : 'provider_selection_required',
  generatedAt: new Date().toISOString(),
  productionReady,
  codeReady,
  codeChecks,
  paymentReady,
  paymentChecks,
  signatureReady,
  signatureChecks,
};
mkdirSync('reports/providers', { recursive: true });
writeFileSync('reports/providers/provider-readiness.json', `${JSON.stringify(report, null, 2)}\n`);
if (production && !productionReady) {
  console.error(
    'Provider readiness blocked: select documented payment and signature providers and attach sandbox, webhook, refund, identity, certificate and reconciliation evidence.',
  );
  process.exit(1);
}
console.info(
  `Provider readiness: code ${codeReady ? 'ready' : 'incomplete'}, payment ${paymentReady ? 'approved' : 'selection required'}, signature ${signatureReady ? 'approved' : 'selection required'}.`,
);
