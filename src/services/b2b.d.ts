/** Ambient types for b2b.js until full migration. */
export function getTeamLocker(slug: string | undefined): Promise<{
  store: Record<string, unknown> | null;
  products: Array<Record<string, unknown>>;
}>;
export function ensureOrganization(input: Record<string, unknown>): Promise<unknown>;
export function listSavedDesigns(userId: string): Promise<unknown[]>;
export function saveCustomDesign(input: Record<string, unknown>): Promise<unknown>;
export function listQuoteRequests(userId: string): Promise<unknown[]>;
export function createQuoteRequest(input: Record<string, unknown>): Promise<unknown>;
export function loadEnterpriseWorkspace(userId: string): Promise<Record<string, unknown>>;
