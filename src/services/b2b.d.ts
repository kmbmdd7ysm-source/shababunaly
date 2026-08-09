/** Ambient types for b2b.js until full migration. */
export function getTeamLocker(slug: string | undefined): Promise<{
  store: Record<string, unknown> | null;
  products: Array<Record<string, unknown>>;
}>;
export function ensureOrganization(input: Record<string, unknown>): Promise<Record<string, unknown>>;
export function listSavedDesigns(userId: string): Promise<Array<Record<string, unknown>>>;
export function saveCustomDesign(input: Record<string, unknown>): Promise<Record<string, unknown>>;
export function saveRoster(input: Record<string, unknown>): Promise<Record<string, unknown>>;
export function listQuoteRequests(userId: string): Promise<unknown[]>;
export function createQuoteRequest(input: Record<string, unknown>): Promise<unknown>;
export function loadEnterpriseWorkspace(userId: string): Promise<Record<string, unknown>>;
export function listRosters(userId: string): Promise<unknown[]>;
export function listProductionUpdates(userId: string): Promise<unknown[]>;
export function respondToDesign(input: Record<string, unknown>): Promise<unknown>;
export function respondToQuote(input: Record<string, unknown>): Promise<unknown>;
export function startQuotePayment(input: Record<string, unknown>): Promise<unknown>;
export function createProjectMessage(input: Record<string, unknown>): Promise<unknown>;
export function createReorderRequest(input: Record<string, unknown>): Promise<unknown>;
export function startExternalContractSignature(input: Record<string, unknown>): Promise<unknown>;
export function clearB2bLocalState(userId: string): void;
export function duplicateCustomDesign(input: Record<string, unknown>): Promise<unknown>;
export function listDesignVersions(designId: string): Promise<unknown[]>;
export function saveLocalProductionUpdate(userId: string, update: unknown): void;
