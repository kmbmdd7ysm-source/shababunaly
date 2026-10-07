export type LocaleText = { en?: string | undefined; ar?: string | undefined } | string;
export type PickFn = (value: LocaleText) => string;
