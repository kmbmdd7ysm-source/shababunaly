/**
 * @typedef {{ key: string, category: string, label: {en:string,ar:string}, minimum: number, preview: string, supportsRoster: boolean, madeInUSA: boolean }} CustomProductType
 * @typedef {{ id?: string, name?: string, playerName?: string, jerseyName?: string, printName?: string, number?: string|number, jerseySize?: string, shortsSize?: string, size?: string }} RosterInput
 * @typedef {{ id: string, name: string, jerseyName: string, number: string, jerseySize: string, shortsSize: string, errors: string[] }} RosterRow
 */
/** @type {readonly CustomProductType[]} */
export const CUSTOM_PRODUCT_TYPES = Object.freeze([
  {
    key: 'game-set',
    category: 'gamewear',
    label: { en: 'Full Game Set', ar: 'طقم لعب كامل' },
    minimum: 10,
    preview: 'uniform',
    supportsRoster: true,
    madeInUSA: false,
  },
  {
    key: 'game-jersey',
    category: 'gamewear',
    label: { en: 'Game Jersey', ar: 'سيريا لعب' },
    minimum: 10,
    preview: 'jersey',
    supportsRoster: true,
    madeInUSA: false,
  },
  {
    key: 'game-shorts',
    category: 'gamewear',
    label: { en: 'Game Shorts', ar: 'شورت لعب' },
    minimum: 10,
    preview: 'shorts',
    supportsRoster: true,
    madeInUSA: false,
  },
  {
    key: 'practice-set',
    category: 'training',
    label: { en: 'Practice Set', ar: 'طقم تمرين' },
    minimum: 10,
    preview: 'uniform',
    supportsRoster: true,
    madeInUSA: false,
  },
  {
    key: 'shooting-shirt',
    category: 'training',
    label: { en: 'Shooting Shirt', ar: 'قميص إحماء' },
    minimum: 10,
    preview: 'shirt',
    supportsRoster: true,
    madeInUSA: false,
  },
  {
    key: 'hoodie',
    category: 'team-apparel',
    label: { en: 'Team Hoodie', ar: 'هودي فريق' },
    minimum: 10,
    preview: 'hoodie',
    supportsRoster: false,
    madeInUSA: false,
  },
  {
    key: 'team-pants',
    category: 'team-apparel',
    label: { en: 'Team Pants', ar: 'بنطلون فريق' },
    minimum: 10,
    preview: 'pants',
    supportsRoster: false,
    madeInUSA: false,
  },
  {
    key: 'tracksuit',
    category: 'team-apparel',
    label: { en: 'Team Tracksuit', ar: 'بدلة رياضية' },
    minimum: 10,
    preview: 'tracksuit',
    supportsRoster: false,
    madeInUSA: false,
  },
  {
    key: 'team-bag',
    category: 'accessories',
    label: { en: 'Team Bag', ar: 'حقيبة فريق' },
    minimum: 10,
    preview: 'bag',
    supportsRoster: false,
    madeInUSA: false,
  },
  {
    key: 'sleeve',
    category: 'accessories',
    label: { en: 'Player Sleeve', ar: 'سليف لاعب' },
    minimum: 10,
    preview: 'sleeve',
    supportsRoster: false,
    madeInUSA: false,
  },
  {
    key: 'basketball',
    category: 'basketballs',
    label: { en: 'Custom Basketball', ar: 'كرة بتصميم خاص' },
    minimum: 6,
    preview: 'ball',
    supportsRoster: false,
    madeInUSA: false,
  },
  {
    key: 'hoop-padding',
    category: 'equipment',
    label: { en: 'Hoop Padding', ar: 'تغليف السلة' },
    minimum: 1,
    preview: 'padding',
    supportsRoster: false,
    madeInUSA: false,
  },
]);

export const CUSTOM_PATTERNS = Object.freeze([
  { key: 'clean', label: { en: 'Clean', ar: 'نظيف' } },
  { key: 'side-stripe', label: { en: 'Side Stripe', ar: 'خط جانبي' } },
  { key: 'split', label: { en: 'Split', ar: 'منقسم' } },
  { key: 'gradient', label: { en: 'Gradient', ar: 'تدرج' } },
  { key: 'geometric', label: { en: 'Geometric', ar: 'هندسي' } },
]);

export const CUSTOM_NECKLINES = Object.freeze([
  { key: 'v-neck', label: { en: 'V-Neck', ar: 'رقبة V' } },
  { key: 'crew', label: { en: 'Crew', ar: 'رقبة دائرية' } },
  { key: 'nba', label: { en: 'Pro Cut', ar: 'قصة احترافية' } },
]);

export const CUSTOM_FONTS = Object.freeze([
  { key: 'block', label: { en: 'Block', ar: 'بلوك' } },
  { key: 'condensed', label: { en: 'Condensed', ar: 'مضغوط' } },
  { key: 'modern', label: { en: 'Modern', ar: 'عصري' } },
]);

export const CUSTOM_SIZES = Object.freeze([
  'YXS',
  'YS',
  'YM',
  'YL',
  'YXL',
  'XS',
  'S',
  'M',
  'L',
  'XL',
  '2XL',
  '3XL',
  '4XL',
]);

export const DEFAULT_CUSTOM_DESIGN = Object.freeze({
  productType: 'game-set',
  quantity: 10,
  primary: '#050505',
  secondary: '#ffffff',
  accent: '#d6d6d6',
  pattern: 'side-stripe',
  neckline: 'nba',
  font: 'block',
  teamName: 'SHABABUNA',
  playerName: 'PLAYER',
  number: '00',
  sponsorName: '',
  variant: 'home',
  notes: '',
});

/** @param {string} key @returns {CustomProductType} */
export function getCustomProductType(key) {
  return (
    CUSTOM_PRODUCT_TYPES.find((item) => item.key === key) ||
    /** @type {CustomProductType} */ (CUSTOM_PRODUCT_TYPES[0])
  );
}

/** @param {RosterInput[]} [rows] @returns {RosterRow[]} */
export function normalizeRoster(rows = []) {
  const seenNumbers = new Set();
  return rows
    .map((row, index) => {
      const name = String(row.name || row.playerName || '')
        .trim()
        .slice(0, 40);
      const jerseyName = String(row.jerseyName || row.printName || name)
        .trim()
        .toUpperCase()
        .slice(0, 18);
      const number = String(row.number ?? '')
        .replace(/\D/g, '')
        .slice(0, 2);
      const jerseySize = String(row.jerseySize || row.size || '')
        .trim()
        .toUpperCase();
      const shortsSize = String(row.shortsSize || row.size || '')
        .trim()
        .toUpperCase();
      /** @type {string[]} */
      const errors = [];
      if (!name) errors.push('name');
      if (!number) errors.push('number');
      if (!jerseySize) errors.push('jerseySize');
      if (number && seenNumbers.has(number)) errors.push('duplicateNumber');
      if (number) seenNumbers.add(number);
      return {
        id: row.id || `player-${index + 1}`,
        name,
        jerseyName,
        number,
        jerseySize,
        shortsSize,
        errors,
      };
    })
    .filter((row) => row.name || row.number || row.jerseySize || row.shortsSize);
}

/** @param {string} [text] @returns {RosterRow[]} */
export function parseRosterCsv(text = '') {
  const lines = String(text)
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(Boolean);
  if (!lines.length) return [];
  const firstLine = /** @type {string} */ (lines[0]);
  const delimiter = firstLine.includes(';') ? ';' : ',';
  const headers = firstLine
    .split(delimiter)
    .map((value) => value.trim().replace(/^"|"$/g, '').toLowerCase());
  /** @param {...string} keys */
  const indexOf = (...keys) => headers.findIndex((header) => keys.includes(header));
  const nameIndex = indexOf('name', 'player name', 'player', 'الاسم');
  const printIndex = indexOf('jersey name', 'print name', 'name on jersey', 'اسم السيريا');
  const numberIndex = indexOf('number', 'jersey number', '#', 'الرقم');
  const jerseySizeIndex = indexOf('jersey size', 'size', 'shirt size', 'مقاس السيريا');
  const shortsSizeIndex = indexOf('shorts size', 'short size', 'مقاس الشورت');
  const dataLines = headers.some((header) =>
    /name|player|number|size|الاسم|الرقم|مقاس/.test(header),
  )
    ? lines.slice(1)
    : lines;
  return normalizeRoster(
    dataLines.map((line, index) => {
      const values = line.split(delimiter).map((value) => value.trim().replace(/^"|"$/g, ''));
      return {
        id: `csv-${index + 1}`,
        name: values[nameIndex >= 0 ? nameIndex : 0] || '',
        jerseyName: values[printIndex >= 0 ? printIndex : nameIndex >= 0 ? nameIndex : 0] || '',
        number: values[numberIndex >= 0 ? numberIndex : 1] || '',
        jerseySize: values[jerseySizeIndex >= 0 ? jerseySizeIndex : 2] || '',
        shortsSize:
          values[
            shortsSizeIndex >= 0 ? shortsSizeIndex : jerseySizeIndex >= 0 ? jerseySizeIndex : 2
          ] || '',
      };
    }),
  );
}

/** @param {RosterInput[]} [rows] */
export function rosterToCsv(rows = []) {
  // normalizeRoster guarantees string fields, so no nullable branch is needed
  // in the final serializer.
  /** @param {unknown} value */
  const escaped = (value) => `"${String(value).replace(/"/g, '""')}"`;
  return [
    ['Player Name', 'Jersey Name', 'Number', 'Jersey Size', 'Shorts Size'].map(escaped).join(','),
    ...normalizeRoster(rows).map((row) =>
      [row.name, row.jerseyName, row.number, row.jerseySize, row.shortsSize].map(escaped).join(','),
    ),
  ].join('\n');
}
