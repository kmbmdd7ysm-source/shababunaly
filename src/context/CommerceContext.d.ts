export function useCommerce(): {
  currency: string;
  setCurrency: (currency: string) => void;
  format: (amount: number | string, lang?: string) => string;
  usdToLydRate: number;
  countryCode: string;
  setCountryCode: (code: string) => void;
};
