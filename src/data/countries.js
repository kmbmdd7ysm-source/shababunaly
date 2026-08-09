import { commerceConfig } from '../config/commerce.ts';

/** @typedef {{ code: string, postalCodeRequired: boolean, regionRequired: boolean, cashEligible: boolean, shippingAvailable: boolean }} Country */

// ISO 3166-1 alpha-2 codes. Names are localized with Intl.DisplayNames.
const COUNTRY_CODES =
  `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(
    ' ',
  );

const NO_POSTAL = new Set([
  'AE',
  'AG',
  'AO',
  'BZ',
  'BJ',
  'BW',
  'BF',
  'BI',
  'CM',
  'CF',
  'KM',
  'CG',
  'CD',
  'CK',
  'CI',
  'DJ',
  'DM',
  'GQ',
  'ER',
  'FJ',
  'GA',
  'GM',
  'GH',
  'GD',
  'GY',
  'HK',
  'IE',
  'JM',
  'KE',
  'KI',
  'LY',
  'MO',
  'MW',
  'ML',
  'MR',
  'MU',
  'MS',
  'NR',
  'NU',
  'KP',
  'PA',
  'QA',
  'RW',
  'KN',
  'LC',
  'ST',
  'SC',
  'SL',
  'SB',
  'SO',
  'SR',
  'SY',
  'TZ',
  'TL',
  'TG',
  'TK',
  'TO',
  'TT',
  'TV',
  'UG',
  'VU',
  'YE',
  'ZW',
]);
const REGION_REQUIRED = new Set(['US', 'CA', 'AU', 'BR', 'CN', 'IN', 'MX', 'AR', 'JP']);

/** @type {readonly Country[]} */
export const countries = Object.freeze(
  COUNTRY_CODES.map((code) =>
    Object.freeze({
      code,
      postalCodeRequired: !NO_POSTAL.has(code),
      regionRequired: REGION_REQUIRED.has(code),
      cashEligible: code === 'LY',
      shippingAvailable: true,
    }),
  ),
);

export const countryByCode = new Map(countries.map((country) => [country.code, country]));

/** @param {unknown} value */
export function isSupportedCountryCode(value) {
  return typeof value === 'string' && countryByCode.has(value.toUpperCase());
}

/**
 * @param {unknown} value
 * @param {string} [fallback]
 */
export function normalizeCountryCode(value, fallback = commerceConfig.defaultCountryCode) {
  const code = String(value || '')
    .trim()
    .toUpperCase();
  return isSupportedCountryCode(code) ? code : fallback;
}

/** @param {unknown} code @param {string} [lang] @returns {string} */
export function getCountryName(code, lang = 'en') {
  const safeCode = normalizeCountryCode(code);
  try {
    return (
      new Intl.DisplayNames([lang === 'ar' ? 'ar' : 'en'], { type: 'region' }).of(safeCode) ||
      safeCode
    );
  } catch {
    return safeCode;
  }
}

/** @param {string} [lang] */
export function getLocalizedCountries(lang = 'en') {
  return countries
    .map((country) => ({ ...country, name: getCountryName(country.code, lang) }))
    .sort((a, b) => a.name.localeCompare(b.name, lang === 'ar' ? 'ar' : 'en'));
}

/** @param {unknown} code */
export function getAddressRequirements(code) {
  if (!isSupportedCountryCode(code)) return null;
  return countryByCode.get(String(code).toUpperCase());
}

/** @param {unknown} code */
export function isCashEligibleCountry(code) {
  return isSupportedCountryCode(code) && String(code).toUpperCase() === 'LY';
}

/** @param {unknown} value */
export function normalizeCountrySearch(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLocaleLowerCase()
    .trim();
}
