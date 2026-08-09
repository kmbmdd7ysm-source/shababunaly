export function downloadBlob(blob: Blob, filename: string): void;
export function downloadDesignDocuments(input?: Record<string, unknown>): {
  proof?: Blob;
  tech?: Blob;
  [key: string]: unknown;
};

export function createTextPdf(input?: Record<string, unknown>): Blob;
