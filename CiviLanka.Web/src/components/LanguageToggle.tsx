import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface LanguageToggleProps {
  className?: string;
  isScrolled?: boolean;
}

export default function LanguageToggle({ className = '', isScrolled = false }: LanguageToggleProps) {
  const { language, toggleLanguage } = useLanguage();
  const { isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={`Switch language to ${language === 'en' ? 'Sinhala' : 'English'}`}
      title={language === 'en' ? 'Switch to සිංහල' : 'Switch to English'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all border select-none cursor-pointer backdrop-blur-md active:scale-95 ${
        isScrolled
          ? isDark
            ? 'bg-slate-900/80 hover:bg-slate-800 border-slate-700 hover:border-amber-400/50 text-slate-200 shadow-sm'
            : 'bg-slate-100 hover:bg-slate-200 border-slate-300 hover:border-amber-500/60 text-slate-800 shadow-xs'
          : 'bg-white/10 hover:bg-white/20 border-white/25 hover:border-amber-300/50 text-white shadow-xs'
      } ${className}`}
    >
      <Globe className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
      <span className="font-bold font-sans">
        {language === 'en' ? 'සිංහල' : 'English'}
      </span>
    </button>
  );
}
