import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'vi';

  const toggleLanguage = () => {
    const nextLang = currentLang.startsWith('vi') ? 'en' : 'vi';
    i18n.changeLanguage(nextLang);
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-sky-200/80 bg-sky-50/80 hover:bg-sky-100/90 text-sky-800 text-xs font-bold transition-all shadow-xs cursor-pointer ${className}`}
      title={currentLang.startsWith('vi') ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
    >
      <Globe className="h-3.5 w-3.5 text-sky-600" />
      <span className="uppercase tracking-wider">{currentLang.startsWith('vi') ? 'VI' : 'EN'}</span>
      <span className="text-[10px] text-sky-500 font-normal">| {currentLang.startsWith('vi') ? 'EN' : 'VI'}</span>
    </button>
  );
};
