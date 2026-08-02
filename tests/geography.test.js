import { describe, expect, it } from './test-api.js';
import { countries, getAddressRequirements, isCashEligibleCountry, isSupportedCountryCode } from '../src/data/countries.js';

describe('worldwide geography', () => {
  it('supports Libya and global ISO destinations', () => {
    expect(isSupportedCountryCode('LY')).toBe(true);
    expect(isSupportedCountryCode('US')).toBe(true);
    expect(countries.length).toBeGreaterThan(200);
  });

  it('restricts cash to Libya', () => {
    expect(isCashEligibleCountry('LY')).toBe(true);
    expect(isCashEligibleCountry('US')).toBe(false);
  });

  it('does not require a postal code in Libya', () => {
    expect(getAddressRequirements('LY').postalCodeRequired).toBe(false);
  });
});
