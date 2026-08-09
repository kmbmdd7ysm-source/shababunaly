import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { CUSTOM_PRODUCT_TYPES } from '../src/data/customization.ts';

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const validHash = (value) => /^[a-f0-9]{64}$/iu.test(String(value || ''));
const validDate = (value) => Number.isFinite(Date.parse(String(value || '')));
const activeDate = (value) => !value || (validDate(value) && Date.parse(value) > Date.now());
const evidenceFile = (path, expectedHash) =>
  Boolean(
    path &&
    existsSync(path) &&
    validHash(expectedHash) &&
    sha256(path) === String(expectedHash).toLowerCase(),
  );
const requiredProductTypes = CUSTOM_PRODUCT_TYPES.map((row) => row.key);

const profileFiles = readdirSync('factory-profiles').filter((name) => name.endsWith('.json'));
const profiles = profileFiles.map((name) => ({
  file: name,
  ...JSON.parse(readFileSync(`factory-profiles/${name}`, 'utf8')),
}));
const evaluate = (profile) => {
  const errors = [];
  if (Number(profile.schemaVersion) < 2) errors.push('schema_v2_required');
  if (profile.profileKind !== 'manufacturer_approved')
    errors.push('manufacturer_approved_profile_required');
  if (
    !profile.manufacturer ||
    /generic|example|placeholder|test factory/iu.test(profile.manufacturer)
  )
    errors.push('real_manufacturer_required');
  if (!profile.manufacturerLegalId) errors.push('manufacturer_legal_id_required');
  if (!profile.manufacturerContact?.email || !profile.manufacturerContact?.country)
    errors.push('manufacturer_contact_required');
  if (!(profile.approved === true && profile.approvalStatus === 'approved'))
    errors.push('approval_required');
  if (!validDate(profile.approvedAt) || !profile.approvedBy)
    errors.push('dated_named_approval_required');
  if (!activeDate(profile.expiresAt)) errors.push('approval_expired');
  if (
    !profile.certificateReference ||
    !evidenceFile(profile.certificateArtifactPath, profile.certificateSha256)
  )
    errors.push('certificate_artifact_hash_required');
  if (
    !profile.iccProfileReference ||
    !evidenceFile(profile.iccProfileArtifactPath, profile.iccProfileSha256)
  )
    errors.push('icc_profile_artifact_hash_required');
  if (
    !profile.pantoneLibrary ||
    !profile.pantoneLibraryVersion ||
    !validHash(profile.pantoneLibrarySha256)
  )
    errors.push('pantone_dataset_evidence_required');
  if (!(Number(profile.deltaETolerance) > 0 && Number(profile.deltaETolerance) <= 2))
    errors.push('delta_e_tolerance_must_be_0_to_2');
  if (!['CIEDE2000', 'DeltaE76'].includes(profile.deltaEFormula))
    errors.push('delta_e_formula_required');
  if (
    !profile.measurementInstrument ||
    !profile.measurementIlluminant ||
    !profile.measurementObserver
  )
    errors.push('color_measurement_protocol_required');
  if (profile.fontEmbeddingRequired !== true || profile.fontLicensePolicy !== 'required')
    errors.push('font_preflight_policy_required');
  if (
    !Array.isArray(profile.allowedVectorFormats) ||
    !['ai', 'eps', 'svg'].every((format) => profile.allowedVectorFormats.includes(format))
  )
    errors.push('ai_eps_svg_required');
  if (
    profile.cutLayerRequired !== true ||
    profile.stitchLayerRequired !== true ||
    profile.sublimationPanelMappingRequired !== true
  )
    errors.push('production_layer_policy_required');
  const types = Array.isArray(profile.productTypes) ? profile.productTypes : [];
  for (const type of types) {
    const grades = profile.gradedPatterns?.[type];
    if (
      !grades ||
      !Array.isArray(grades.sizes) ||
      grades.sizes.length < 2 ||
      !validHash(grades.sha256)
    )
      errors.push(`graded_pattern_missing:${type}`);
    const material = profile.materialProfiles?.[type];
    if (
      !material ||
      !(Number(material.stretchPercent) >= 0) ||
      !(Number(material.shrinkagePercent) >= 0) ||
      !material.fabricCode
    )
      errors.push(`material_profile_missing:${type}`);
    const artifact = (profile.templateArtifacts || []).find((row) => row.productType === type);
    if (!artifact || !evidenceFile(artifact.path, artifact.sha256))
      errors.push(`template_artifact_missing:${type}`);
    const run = (profile.manufacturerTestRuns || []).find(
      (row) =>
        row.productType === type &&
        row.status === 'passed' &&
        validDate(row.testedAt) &&
        validHash(row.reportSha256),
    );
    if (!run) errors.push(`manufacturer_test_run_missing:${type}`);
  }
  if (!types.length) errors.push('product_types_required');
  return { approved: errors.length === 0, errors };
};

const evaluatedProfiles = profiles.map((profile) => ({
  ...profile,
  validation: evaluate(profile),
}));
const approved = evaluatedProfiles.filter((profile) => profile.validation.approved);
const mappedTypes = new Set(approved.flatMap((profile) => profile.productTypes || []));
const missingProductTypes = requiredProductTypes.filter((key) => !mappedTypes.has(key));
const report = {
  schemaVersion: 2,
  status:
    approved.length && missingProductTypes.length === 0 ? 'passed' : 'pending_factory_validation',
  generatedAt: new Date().toISOString(),
  productionReady: approved.length > 0 && missingProductTypes.length === 0,
  profiles: evaluatedProfiles,
  approvedProfiles: approved.map((profile) => profile.id),
  missingProductTypes,
  requirements: {
    manufacturerIdentity: true,
    hashedApprovalCertificate: true,
    hashedIccProfile: true,
    pantoneDatasetEvidence: true,
    deltaEAtMost2: true,
    gradedPatternsPerProduct: true,
    materialStretchAndShrinkage: true,
    aiEpsSvgWorkflow: true,
    cutStitchAndPanelLayers: true,
    manufacturerTestRunPerProduct: true,
  },
};
mkdirSync('reports/factory', { recursive: true });
writeFileSync('reports/factory/factory-readiness.tson', `${JSON.stringify(report, null, 2)}\n`);
console.info(
  `Factory readiness: ${approved.length} fully evidenced manufacturer profile(s); ${missingProductTypes.length} product type(s) remain blocked.`,
);
if (process.env.REQUIRE_FACTORY_APPROVAL === 'true' && !report.productionReady) process.exit(1);
