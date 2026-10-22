import { useEffect, useState } from 'react';
import { readPref, writePref } from '../lib/storage';

export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

const KEY = 'bm-theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => readPref(KEY, THEMES, 'system'));

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    writePref(KEY, theme);
    if (theme !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  return { theme, setTheme };
}
