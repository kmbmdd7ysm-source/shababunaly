import type { ReactElement } from 'react';

export type ProductionDesignEditorProps = {
  design?: unknown;
  value?: unknown;
  onChange?: (next: unknown) => void;
  readOnly?: boolean;
  onCanvasPoint?: (point: { view?: string; x?: number; y?: number }) => void;
  [key: string]: unknown;
};

export default function ProductionDesignEditor(
  props: ProductionDesignEditorProps,
): ReactElement;
