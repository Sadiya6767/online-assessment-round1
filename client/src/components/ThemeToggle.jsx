import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('nexis_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('nexis_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('nexis_theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={() => setIsDark(!isDark)}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className="p-2 rounded-xl border transition-all flex items-center justify-center gap-1.5 text-xs font-medium bg-white hover:bg-gray-100 text-gray-700 border-gray-200 dark:bg-[#1C2E26] dark:text-emerald-300 dark:border-[#294337] dark:hover:bg-[#243B31] shadow-xs"
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Light</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-gray-600" />
          <span className="hidden sm:inline">Dark</span>
        </>
      )}
    </button>
  );
}
