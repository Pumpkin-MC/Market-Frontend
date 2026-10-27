import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { DEFAULT_LOCALE, getLocaleCode } from './locale';

// Import translation files directly to avoid extra HTTP requests
// and ensure we don't have issues with Vite's dev server for static assets
import enTranslation from '../locales/en_us.json';
import deTranslation from '../locales/de_de.json';
import frTranslation from '../locales/fr_fr.json';
import esTranslation from '../locales/es_es.json';
import ruTranslation from '../locales/ru_ru.json';
import zhTranslation from '../locales/zh_cn.json';
import ptTranslation from '../locales/pt_br.json';
import plTranslation from '../locales/pl_pl.json';
import trTranslation from '../locales/tr_tr.json';
import jaTranslation from '../locales/ja_jp.json';
import koTranslation from '../locales/ko_kr.json';
import itTranslation from '../locales/it_it.json';
import nlTranslation from '../locales/nl_nl.json';

const resources = {
  en_us: { translation: enTranslation },
  de_de: { translation: deTranslation },
  fr_fr: { translation: frTranslation },
  es_es: { translation: esTranslation },
  ru_ru: { translation: ruTranslation },
  zh_cn: { translation: zhTranslation },
  pt_br: { translation: ptTranslation },
  pl_pl: { translation: plTranslation },
  tr_tr: { translation: trTranslation },
  ja_jp: { translation: jaTranslation },
  ko_kr: { translation: koTranslation },
  it_it: { translation: itTranslation },
  nl_nl: { translation: nlTranslation },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: Object.keys(resources),
    load: 'currentOnly',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
      convertDetectedLanguage: language => getLocaleCode(language) ?? language,
    },
  });

export default i18n;
