/** Ambient types for operations.js until full migration. */
export function getStaffRole(user: unknown): string | null;
export function isStaffUser(user: unknown): boolean;
export function loadOperationsDashboard(): Promise<Record<string, unknown>>;
export function invalidateOperationsCache(section?: string | null): void;
export function loadOperationsSection(
  section: string,
  options?: { force?: boolean },
): Promise<Record<string, unknown>>;
export function loadAdminUsers(accessToken?: string): Promise<unknown[]>;
export function updateAdminUserRole(
  accessToken: string,
  userId: string,
  role: string,
): Promise<unknown>;
export function setExchangeRate(rate: number | string): Promise<unknown>;
export function updateSpecialRequest(input: Record<string, unknown>): Promise<unknown>;
export function setShippingQuote(input: Record<string, unknown>): Promise<unknown>;
export function updateOrderWorkflow(input: Record<string, unknown>): Promise<unknown>;
export function recordManualPayment(input: Record<string, unknown>): Promise<unknown>;
export function updateQuoteWorkflow(input: Record<string, unknown>): Promise<unknown>;
export function publishDesignProof(input: Record<string, unknown>): Promise<unknown>;
export function recordQuotePayment(input: Record<string, unknown>): Promise<unknown>;
export function updateReturnRequest(input: Record<string, unknown>): Promise<unknown>;
export function recordRefund(input: Record<string, unknown>): Promise<unknown>;
export function updateCatalogVariant(input: Record<string, unknown>): Promise<unknown>;
export function updateCatalogProduct(input: Record<string, unknown>): Promise<unknown>;
export function setCountryShippingRate(input: Record<string, unknown>): Promise<unknown>;
export function updateSiteContent(input: Record<string, unknown>): Promise<unknown>;
export function uploadDesignProofFiles(input: Record<string, unknown>): Promise<unknown>;
export function upsertOperationalEntity(table: string, row: Record<string, unknown>): Promise<unknown>;
export function deleteOperationalEntity(table: string, id: string): Promise<unknown>;
export function recordStockMovement(input: Record<string, unknown>): Promise<unknown>;
export function reviewPaymentProof(input: Record<string, unknown>): Promise<unknown>;
export function parseInventoryCsv(text: string): unknown[];
export function createInventoryCsv(rows: unknown[]): string;
export function previewInventoryImport(input: Record<string, unknown>): Promise<unknown>;
export function applyInventoryImport(input: Record<string, unknown>): Promise<unknown>;
export function rollbackInventoryImport(batchId: string): Promise<unknown>;
export function retryCommerceNotification(notificationId: string): Promise<unknown>;
export function resolveSecurityEvent(eventId: string, resolved?: boolean): Promise<unknown>;
export function updateMediaAsset(input: Record<string, unknown>): Promise<unknown>;
export function upsertShipment(input: Record<string, unknown>): Promise<unknown>;
export function uploadOperationalMedia(input: Record<string, unknown>): Promise<unknown>;
export function createCatalogProductDraft(input: Record<string, unknown>): Promise<unknown>;
export function addCatalogVariantDraft(input: Record<string, unknown>): Promise<unknown>;
export function archiveCatalogProduct(productId: string): Promise<unknown>;
