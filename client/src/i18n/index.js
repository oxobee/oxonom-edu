import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import tr from './tr';
import en from './en';

const savedLang = localStorage.getItem('i18nextLng') || 'tr';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en }
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

// Guarantee initial default is Turkish if not previously selected
if (!localStorage.getItem('i18nextLng')) {
  i18n.changeLanguage('tr');
}

export default i18n;
