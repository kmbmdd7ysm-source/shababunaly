export function sanitizePayload(params?: Record<string, unknown>): Record<string, unknown>;
export function initAnalytics(ok: boolean): void;
export function initHeatmap(ok: boolean): void;
export function disableAnalytics(): void;
export function revokeAnalyticsConsent(): void;
export function trackEvent(name: string, params?: Record<string, unknown>): void;
export const safeTrack: typeof trackEvent;
export function trackPage(path: string): void;
export function trackCommerceEvent(
  eventName: string,
  params?: Record<string, unknown>,
): Promise<void>;
