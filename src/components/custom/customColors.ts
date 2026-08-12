export const CUSTOM_COLOR_OPTIONS = [
  { key: 'black', value: '#0b0b0b' },
  { key: 'white', value: '#ffffff' },
  { key: 'red', value: '#d71920' },
  { key: 'royal', value: '#0b3d91' },
  { key: 'navy', value: '#101d3d' },
  { key: 'green', value: '#0b6539' },
  { key: 'gold', value: '#f4c542' },
  { key: 'orange', value: '#f07818' },
  { key: 'purple', value: '#7b2d8e' },
  { key: 'burgundy', value: '#6c1d2c' },
  { key: 'grey', value: '#b8bcc2' },
  { key: 'cyan', value: '#19a7ce' },
] as const;

const COLOR_KEY_BY_VALUE = new Map(CUSTOM_COLOR_OPTIONS.map((option) => [option.value.toLowerCase(), option.key]));

export function customColorKey(value: string): string {
  return COLOR_KEY_BY_VALUE.get(String(value || '').toLowerCase()) || 'black';
}
