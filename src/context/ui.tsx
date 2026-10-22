import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useTheme, type Theme } from '../hooks/useTheme';
import { readPref, writePref } from '../lib/storage';

export const VIEW_MODES = ['grid', 'list', 'compact'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

interface UIContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  /** Mobile drawer visibility. */
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  /** Desktop sidebar collapsed state. */
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [viewMode, setViewModeState] = useState<ViewMode>(() => readPref('bm-view', VIEW_MODES, 'grid'));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => readPref('bm-sidebar', ['open', 'collapsed'], 'open') === 'collapsed',
  );

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    writePref('bm-view', mode);
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      writePref('bm-sidebar', prev ? 'open' : 'collapsed');
      return !prev;
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      viewMode,
      setViewMode,
      sidebarOpen,
      setSidebarOpen,
      sidebarCollapsed,
      toggleSidebarCollapsed,
    }),
    [theme, setTheme, viewMode, setViewMode, sidebarOpen, sidebarCollapsed, toggleSidebarCollapsed],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside <UIProvider>');
  return ctx;
}
