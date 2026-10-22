import { Monitor, Moon, Sun } from 'lucide-react';
import { useUI } from '../context/ui';
import type { Theme } from '../hooks/useTheme';

const NEXT: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' };
const ICON = { light: Sun, dark: Moon, system: Monitor };

export default function ThemeToggle() {
  const { theme, setTheme } = useUI();
  const Icon = ICON[theme];
  return (
    <button
      className="icon-btn"
      onClick={() => setTheme(NEXT[theme])}
      title={`Theme: ${theme} (click to switch)`}
      aria-label={`Theme: ${theme}. Switch to ${NEXT[theme]}`}
    >
      <Icon className="size-4" />
    </button>
  );
}
