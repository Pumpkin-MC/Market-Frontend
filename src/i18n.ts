import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files directly to avoid extra HTTP requests
// and ensure we don't have issues with Vite's dev server for static assets
import enTranslation from './locales/en.json';
import deTranslation from './locales/de.json';
import frTranslation from './locales/fr.json';
import esTranslation from './locales/es.json';
import ruTranslation from './locales/ru.json';
import zhTranslation from './locales/zh.json';
import ptTranslation from './locales/pt.json';
import plTranslation from './locales/pl.json';
import trTranslation from './locales/tr.json';
import jaTranslation from './locales/ja.json';
import koTranslation from './locales/ko.json';
import itTranslation from './locales/it.json';
import nlTranslation from './locales/nl.json';

const resources = {
  en: { translation: enTranslation },
  de: { translation: deTranslation },
  fr: { translation: frTranslation },
  es: { translation: esTranslation },
  ru: { translation: ruTranslation },
  zh: { translation: zhTranslation },
  pt: { translation: ptTranslation },
  pl: { translation: plTranslation },
  tr: { translation: trTranslation },
  ja: { translation: jaTranslation },
  ko: { translation: koTranslation },
  it: { translation: itTranslation },
  nl: { translation: nlTranslation },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'de', 'fr', 'es', 'ru', 'zh', 'pt', 'pl', 'tr', 'ja', 'ko', 'it', 'nl'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['navigator', 'htmlTag'],
      caches: [], // Always auto-detect based on the user's browser/system region
    },
  });

export default i18n;
