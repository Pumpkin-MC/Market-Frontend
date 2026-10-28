export const LOCALE_CODES = {
  en: 'en_us',
  de: 'de_de',
  fr: 'fr_fr',
  es: 'es_es',
  ru: 'ru_ru',
  zh: 'zh_cn',
  zh_hk: 'zh_hk',
  zh_tw: 'zh_tw',
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
// Region-aware for Chinese variants: zh-HK -> zh_hk, zh-TW -> zh_tw, otherwise zh -> zh_cn.
export function getLocaleCode(language?: string | null): LocaleCode | undefined {
  if (!language) return undefined;
  const lower = language.toLowerCase();
  // Exact locale match first (e.g. "zh_hk", "zh-HK", "zh_tw", "zh-TW").
  const exact = lower.replace('-', '_');
  if (Object.hasOwn(LOCALE_CODES, exact)) {
    return LOCALE_CODES[exact as keyof typeof LOCALE_CODES];
  }
  const base = lower.split(/[-_]/)[0];
  if (base === 'zh') {
    // Distinguish regional Chinese variants before falling back to simplified.
    if (lower.includes('hk') || lower.includes('hant-hk') || lower.includes('hant_hk')) {
      return LOCALE_CODES.zh_hk;
    }
    if (lower.includes('tw') || lower.includes('hant-tw') || lower.includes('hant_tw')) {
      return LOCALE_CODES.zh_tw;
    }
    return LOCALE_CODES.zh;
  }
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

// Whether two language codes share the same base language (e.g. "zh_cn",
// "zh_hk", "zh_tw" and "zh" all share base "zh"). The API stores only base
// codes, so this is used to avoid resetting regional variants to zh_cn.
export function sameBaseLanguage(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return getLanguageCode(a) === getLanguageCode(b);
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
