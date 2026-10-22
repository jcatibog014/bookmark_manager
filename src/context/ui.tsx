import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTheme, type Theme } from '../hooks/useTheme';
import { readPref, writePref } from '../lib/storage';

export const VIEW_MODES = ['grid', 'list', 'compact'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export interface EditorState {
  /** Bookmark being edited; undefined when adding a new one. */
  id?: number;
  url?: string;
  collectionId?: number | null;
  /** Changes on every open so the form remounts with fresh state. */
  key: number;
}

export interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
  action?: { label: string; onClick: () => void };
}

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

  editor: EditorState | null;
  openEditor: (options?: Omit<EditorState, 'key'>) => void;
  closeEditor: () => void;

  toasts: Toast[];
  toast: (message: string, options?: Partial<Omit<Toast, 'id' | 'message'>>) => void;
  dismissToast: (id: number) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

const TOAST_MS = 5000;

export function UIProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [viewMode, setViewModeState] = useState<ViewMode>(() => readPref('bm-view', VIEW_MODES, 'grid'));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => readPref('bm-sidebar', ['open', 'collapsed'], 'open') === 'collapsed',
  );
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

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

  const openEditor = useCallback((options: Omit<EditorState, 'key'> = {}) => {
    setEditor({ ...options, key: nextId.current++ });
  }, []);
  const closeEditor = useCallback(() => setEditor(null), []);

  const dismissToast = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<UIContextValue['toast']>(
    (message, options = {}) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, message, tone: options.tone ?? 'success', action: options.action }]);
      setTimeout(() => dismissToast(id), TOAST_MS);
    },
    [dismissToast],
  );

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
      editor,
      openEditor,
      closeEditor,
      toasts,
      toast,
      dismissToast,
    }),
    [
      theme,
      setTheme,
      viewMode,
      setViewMode,
      sidebarOpen,
      sidebarCollapsed,
      toggleSidebarCollapsed,
      editor,
      openEditor,
      closeEditor,
      toasts,
      toast,
      dismissToast,
    ],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside <UIProvider>');
  return ctx;
}
