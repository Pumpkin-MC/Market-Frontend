export const LOCALE_CODES = {
  en: 'en_us',
  de: 'de_de',
  fr: 'fr_fr',
  es: 'es_es',
  ru: 'ru_ru',
  zh: 'zh_cn',
  pt: 'pt_br',
  pl: 'pl_pl',
  tr: 'tr_tr',
  ja: 'ja_jp',
  ko: 'ko_kr',
  it: 'it_it',
  nl: 'nl_nl',
} as const;

export type LocaleCode = typeof LOCALE_CODES[keyof typeof LOCALE_CODES];
export const DEFAULT_LOCALE = LOCALE_CODES.en;

// Accept old preferences and browser tags such as en, en-US and zh-Hans-CN.
export function getLocaleCode(language?: string | null): LocaleCode | undefined {
  const base = language?.toLowerCase().split(/[-_]/)[0];
  return base && Object.hasOwn(LOCALE_CODES, base)
    ? LOCALE_CODES[base as keyof typeof LOCALE_CODES]
    : undefined;
}

export function normalizeLocale(language?: string | null): LocaleCode {
  return getLocaleCode(language) ?? DEFAULT_LOCALE;
}

// The API still uses language-only codes for account preferences.
export function getLanguageCode(language?: string | null): string {
  return normalizeLocale(language).split('_')[0];
}

export function toLanguageTag(language?: string | null): string {
  const [base, region] = normalizeLocale(language).split('_');
  return `${base}-${region.toUpperCase()}`;
}

// Plugin authors' content can use regional tags or legacy language-only keys.
export function getLocalizedText(translations: Record<string, string>, language?: string): string {
  const locale = normalizeLocale(language);
  return translations[locale] ||
    translations[toLanguageTag(locale)] ||
    translations[getLanguageCode(locale)] ||
    translations.en_us ||
    translations['en-US'] ||
    translations.en ||
    translations['en-GB'] ||
    Object.values(translations)[0] || '';
}
