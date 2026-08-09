import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const requireApproval = process.env.REQUIRE_ARABIC_REVIEW === 'true';
const manifest = JSON.parse(readFileSync('arabic-review-manifest.json', 'utf8'));
const translationSource = readFileSync('src/data/translations.js', 'utf8');
const translationSourceSha256 = createHash('sha256').update(translationSource).digest('hex');
const moduleUrl = `${pathToFileURL(`${process.cwd()}/src/data/translations.js`).href}?review=${Date.now()}`;
const { translations } = await import(moduleUrl);
const validReviewDate = (value) => {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) && parsed <= Date.now();
};

const flatten = (value, prefix = '', output = {}) => {
  for (const [key, child] of Object.entries(value || {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, path, output);
    else output[path] = child;
  }
  return output;
};
const english = flatten(translations.en);
const arabic = flatten(translations.ar);
const englishKeys = Object.keys(english).sort();
const arabicKeys = Object.keys(arabic).sort();
const missingArabic = englishKeys.filter((key) => !(key in arabic));
const missingEnglish = arabicKeys.filter((key) => !(key in english));
const emptyArabic = arabicKeys.filter((key) => !String(arabic[key] ?? '').trim());
const suspiciousArabic = arabicKeys.filter((key) => {
  const value = String(arabic[key] ?? '').trim();
  if (!value || /^https?:|^[\d\W_]+$/.test(value)) return false;
  return (
    !/[\u0600-\u06ff]/.test(value) &&
    !/^(USD|LYD|SKU|PDF|MFA|CTA|B2B|AVIF|WebP|Email|WhatsApp)$/i.test(value)
  );
});
const sections = Object.entries(manifest.sections || {});
const evaluatedSections = sections.map(([name, value]) => {
  const evidence = Boolean(
    value?.status === 'approved' &&
    String(value?.reviewer || '').trim() &&
    String(value?.reviewerRole || '').trim() &&
    validReviewDate(value?.reviewedAt) &&
    value?.sourceSha256 === translationSourceSha256,
  );
  return {
    name,
    status: value?.status || 'missing',
    approved: evidence,
    stale: value?.status === 'approved' && value?.sourceSha256 !== translationSourceSha256,
  };
});
const approvedSections = evaluatedSections.filter((row) => row.approved).map((row) => row.name);
const allSectionsApproved = sections.length >= 10 && approvedSections.length === sections.length;
const manifestSourceMatches = manifest.translationSourceSha256 === translationSourceSha256;
const sourceCommitPresent = /^[a-f0-9]{7,64}$/iu.test(String(manifest.sourceCommit || ''));
const structuralPass =
  missingArabic.length === 0 && missingEnglish.length === 0 && emptyArabic.length === 0;
const productionReady =
  structuralPass && allSectionsApproved && manifestSourceMatches && sourceCommitPresent;
const report = {
  status: productionReady ? 'passed' : requireApproval ? 'failed' : 'review_required',
  generatedAt: new Date().toISOString(),
  schemaVersion: manifest.schemaVersion,
  locale: manifest.locale,
  translationSourceSha256,
  manifestSourceMatches,
  sourceCommitPresent,
  counts: {
    englishKeys: englishKeys.length,
    arabicKeys: arabicKeys.length,
    approvedSections: approvedSections.length,
    totalSections: sections.length,
  },
  structuralPass,
  productionReady,
  missingArabic,
  missingEnglish,
  emptyArabic,
  suspiciousArabic,
  sections: evaluatedSections,
  pendingSections: evaluatedSections.filter((row) => !row.approved),
};
mkdirSync('reports/localization', { recursive: true });
writeFileSync('reports/localization/arabic-review.json', `${JSON.stringify(report, null, 2)}\n`);
if (!structuralPass) {
  console.error(
    `Arabic localization structure failed: missing AR ${missingArabic.length}, missing EN ${missingEnglish.length}, empty AR ${emptyArabic.length}.`,
  );
  process.exit(1);
}
if (requireApproval && !productionReady) {
  console.error(
    'Arabic production review blocked: each section needs a named reviewer, role, date and the exact current translation SHA-256; the manifest also needs the current source hash and commit.',
  );
  process.exit(1);
}
console.info(
  `Arabic localization structure passed (${arabicKeys.length} keys). Human review: ${productionReady ? 'approved' : `${approvedSections.length}/${sections.length} current-hash sections approved`}.`,
);
