import { beforeEach, describe, expect, test, vi } from 'vitest';
import { disableAnalytics, initAnalytics, initHeatmap, revokeAnalyticsConsent, sanitizePayload, trackEvent, trackPage } from '../../src/utils/analytics';

describe('privacy-safe analytics', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    window.dataLayer = [];
    window.gtag = vi.fn();
    window.clarity = vi.fn();
  });

  test('scrubs direct identifiers and unsafe nested shapes', () => {
    expect(sanitizePayload({ email: 'a@example.com', phone: '+1 212 555 1212', label: 'Email a@example.com', count: 2, ok: true, rows: ['+1 212 555 1212'], object: { secret: 'x' } })).toEqual({ label: 'Email [email]', count: 2, ok: true, rows: ['[phone]'], object: undefined });
  });

  test('does not emit without consent and safely disables providers', () => {
    trackEvent('purchase_completed', { value: 25 });
    expect(window.gtag).not.toHaveBeenCalled();
    disableAnalytics();
    revokeAnalyticsConsent();
    expect(window.clarity).toHaveBeenCalledWith('consent', false);
  });

  test('initializers and page tracking remain no-op without configured IDs', () => {
    initAnalytics(true);
    initHeatmap(true);
    trackPage('/shop');
    expect(document.querySelectorAll('script')).toHaveLength(0);
  });
});
