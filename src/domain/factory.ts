/**
 * Factory readiness architecture — software contracts only.
 * Real CAD / patterns / UV / Pantone / ICC data remain EXTERNAL / BLOCKED.
 */

export type FactoryApprovalState =
  | 'CONCEPT'
  | 'CUSTOMER_APPROVED'
  | 'FACTORY_REVIEW'
  | 'FACTORY_CHANGES_REQUIRED'
  | 'FACTORY_APPROVED'
  | 'PRODUCTION_READY';

export interface FactorySpecification {
  manufacturer: string | null;
  productTemplate: string | null;
  sizeGrade: string | null;
  cadReference: string | null;
  patternReference: string | null;
  uvMap: string | null;
  printZones: string[];
  bleedMm: number | null;
  safeAreaMm: number | null;
  fabric: string | null;
  material: string | null;
  pantoneTargets: string[];
  iccProfile: string | null;
  deltaETolerance: number | null;
  productionRevision: string | null;
  approvalState: FactoryApprovalState;
}

export function emptyFactorySpecification(): FactorySpecification {
  return {
    manufacturer: null,
    productTemplate: null,
    sizeGrade: null,
    cadReference: null,
    patternReference: null,
    uvMap: null,
    printZones: [],
    bleedMm: null,
    safeAreaMm: null,
    fabric: null,
    material: null,
    pantoneTargets: [],
    iccProfile: null,
    deltaETolerance: null,
    productionRevision: null,
    approvalState: 'CONCEPT',
  };
}

/** Concept designs cannot become FACTORY_APPROVED without required metadata. */
export function canApproveFactory(spec: FactorySpecification): { ok: boolean; missing: string[] } {
  const required: Array<keyof FactorySpecification> = [
    'manufacturer',
    'productTemplate',
    'sizeGrade',
    'cadReference',
    'patternReference',
    'uvMap',
    'fabric',
    'iccProfile',
    'deltaETolerance',
    'productionRevision',
  ];
  const missing = required.filter((key) => {
    const value = spec[key];
    return value == null || value === '' || (Array.isArray(value) && value.length === 0);
  });
  return { ok: missing.length === 0, missing: missing.map(String) };
}

export function assertNotFactoryApprovedWithoutMetadata(
  desired: FactoryApprovalState,
  spec: FactorySpecification,
): FactoryApprovalState {
  if (desired !== 'FACTORY_APPROVED' && desired !== 'PRODUCTION_READY') return desired;
  const gate = canApproveFactory(spec);
  if (!gate.ok) return 'FACTORY_CHANGES_REQUIRED';
  return desired;
}
