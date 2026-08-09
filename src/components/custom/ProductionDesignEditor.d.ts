import type { ReactElement } from 'react';
export default function ProductionDesignEditor(props: {
  design?: unknown;
  value?: unknown;
  onChange?: (studio: unknown) => void;
  readOnly?: boolean;
  onCanvasPoint?: ((point: { view?: string; x?: number; y?: number }) => void) | null;
  [key: string]: unknown;
}): ReactElement;
