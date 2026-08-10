const required = [
  'E2E_ENVIRONMENT_ID',
  'E2E_SUPABASE_URL',
  'E2E_SUPABASE_ANON_KEY',
  'E2E_SUPABASE_SERVICE_ROLE_KEY',
  'E2E_SITE_URL',
  'MAILPIT_API_URL',
];
const missing = required.filter((name) => !String(process.env[name] || '').trim());
const productionHosts = String(process.env.PRODUCTION_HOSTS || 'shababuna.ly,www.shababuna.ly')
  .split(',')
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);
const unsafe = [];
const environmentId = String(process.env.E2E_ENVIRONMENT_ID || '').trim();
if (environmentId && !/(?:^|[-_])(e2e|test|sandbox|staging)(?:$|[-_])/i.test(`-${environmentId}-`))
  unsafe.push(
    'E2E_ENVIRONMENT_ID must explicitly identify an e2e/test/sandbox/staging environment',
  );
const urlNames = [
  'E2E_SUPABASE_URL',
  'E2E_SITE_URL',
  'MAILPIT_API_URL',
  'E2E_PAYMENT_API_URL',
  'E2E_MALWARE_API_URL',
  'E2E_SIGNATURE_API_URL',
];
for (const name of urlNames) {
  const value = process.env[name];
  if (!value) continue;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (productionHosts.includes(host) || /(^|[.-])prod(?:uction)?([.-]|$)/i.test(host))
      unsafe.push(`${name} points to a production-like host: ${host}`);
    if (name !== 'E2E_SITE_URL' && !['http:', 'https:'].includes(url.protocol))
      unsafe.push(`${name} must use HTTP(S)`);
  } catch {
    unsafe.push(`${name} is not a valid URL`);
  }
}
for (const [e2eName, productionNames] of Object.entries({
  E2E_SUPABASE_URL: ['PRODUCTION_SUPABASE_URL'],
  E2E_PAYMENT_API_URL: ['PAYMENTS_SESSION_URL', 'PRODUCTION_PAYMENT_API_URL'],
  E2E_MALWARE_API_URL: ['MALWARE_SCAN_API_URL', 'PRODUCTION_MALWARE_API_URL'],
  E2E_SIGNATURE_API_URL: [
    'SIGNATURE_API_URL',
    'SIGNATURE_CREATE_ENVELOPE_URL',
    'PRODUCTION_SIGNATURE_API_URL',
  ],
})) {
  const e2e = String(process.env[e2eName] || '').replace(/\/$/, '');
  if (!e2e) continue;
  for (const productionName of productionNames) {
    const production = String(process.env[productionName] || '').replace(/\/$/, '');
    if (production && production === e2e)
      unsafe.push(`${e2eName} must not equal ${productionName}`);
  }
}
if (missing.length || unsafe.length) {
  console.error(
    `Isolated E2E environment is not safe:\n- ${[...missing.map((v) => `${v} missing`), ...unsafe].join('\n- ')}`,
  );
  process.exit(1);
}
console.log(
  `E2E environment '${environmentId}' is isolated from declared production hosts and provider endpoints.`,
);
