import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const LanguageToggle = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'tr';

  const toggleLanguage = () => {
    const newLang = currentLang === 'tr' ? 'en' : 'tr';
    i18n.changeLanguage(newLang);
    localStorage.setItem('i18nextLng', newLang);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleLanguage}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-xs font-semibold text-white shadow-sm backdrop-blur-md transition-colors cursor-pointer ${className}`}
      title={currentLang === 'tr' ? 'Switch to English' : "Türkçe'ye geç"}
      aria-label="Toggle language"
    >
      <span className="text-sm leading-none">
        {currentLang === 'tr' ? '🇹🇷' : '🇬🇧'}
      </span>
      <span className="tracking-wider uppercase font-bold text-slate-200">
        {currentLang === 'tr' ? 'TR' : 'EN'}
      </span>
    </motion.button>
  );
};

export default LanguageToggle;
