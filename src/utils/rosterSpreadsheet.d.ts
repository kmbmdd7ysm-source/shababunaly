export const ROSTER_FILE_ACCEPT: string;
export function parseRosterFile(file: File): Promise<{
  players?: unknown[];
  error?: string;
  [key: string]: unknown;
}>;
