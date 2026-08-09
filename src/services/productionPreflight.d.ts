export function runProductionPreflight(
  design: unknown,
  studio: unknown,
): Record<string, unknown>;
export function getFactoryTemplateSpec(productType: string): Record<string, unknown>;
export function buildColorSpecificationsCsv(design: unknown): string;
export function assertNotFactoryApprovedWithoutMetadata(spec: unknown): void;
