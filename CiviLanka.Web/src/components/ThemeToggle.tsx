import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      className={`relative inline-flex items-center w-[54px] h-[28px] rounded-full p-[3px] transition-colors duration-300 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
        isDark
          ? 'bg-slate-800/90 border border-slate-700 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]'
          : 'bg-[#e7ded6] border border-[#d8cfc5] shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]'
      } ${className}`}
    >
      {/* Sliding Knob */}
      <span
        className={`flex items-center justify-center w-[22px] h-[22px] rounded-full shadow-md transform transition-all duration-300 ease-in-out ${
          isDark
            ? 'translate-x-[25px] bg-slate-950 border border-slate-700/80 text-amber-400'
            : 'translate-x-0 bg-white text-stone-700'
        }`}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-amber-400 -rotate-12 fill-amber-400/20 transition-transform duration-300" strokeWidth={2.2} />
        ) : (
          <Sun className="w-3.5 h-3.5 text-[#5c4033] transition-transform duration-300" strokeWidth={2.2} />
        )}
      </span>
    </button>
  );
}
