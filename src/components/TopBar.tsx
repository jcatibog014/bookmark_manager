import { Menu, PanelLeft, Plus, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useUI } from '../context/ui';
import { useDebounced } from '../hooks/useDebounced';
import ThemeToggle from './ThemeToggle';
import ViewToggle from './ViewToggle';

export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
export const MOD_KEY = IS_MAC ? '⌘' : 'Ctrl';

export default function TopBar() {
  const { setSidebarOpen, toggleSidebarCollapsed, openEditor, setPaletteOpen } = useUI();
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const onHome = location.pathname === '/';

  // The search box mirrors ?q= so searches are shareable and survive refresh.
  const urlQuery = onHome ? (params.get('q') ?? '') : '';
  const [text, setText] = useState(urlQuery);
  const lastSynced = useRef(urlQuery);
  const debounced = useDebounced(text, 200);

  useEffect(() => {
    // URL changed from elsewhere (e.g. a sidebar link cleared the search).
    if (urlQuery !== lastSynced.current) {
      lastSynced.current = urlQuery;
      setText(urlQuery);
    }
  }, [urlQuery]);

  useEffect(() => {
    if (debounced === lastSynced.current) return;
    lastSynced.current = debounced;
    const next = new URLSearchParams(onHome ? location.search : '');
    if (debounced.trim()) next.set('q', debounced);
    else next.delete('q');
    const search = next.toString();
    navigate({ pathname: '/', search: search ? `?${search}` : '' }, { replace: onHome });
    // Only react to typing, not to navigation.
  }, [debounced]);

  // When viewing a collection, new bookmarks go into it by default.
  const addBookmark = () => {
    const collection = Number(new URLSearchParams(location.search).get('collection'));
    openEditor({ collectionId: onHome && collection > 0 ? collection : null });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white/70 px-4 backdrop-blur-md sm:gap-3 dark:border-zinc-800 dark:bg-zinc-950/70">
      <button className="icon-btn lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
        <Menu className="size-5" />
      </button>
      <button className="icon-btn hidden lg:inline-flex" onClick={toggleSidebarCollapsed} aria-label="Toggle sidebar">
        <PanelLeft className="size-4" />
      </button>

      <div className="relative min-w-0 flex-1 sm:max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
        <input
          id="global-search"
          type="search"
          className="input pr-20 pl-9 [&::-webkit-search-cancel-button]:hidden"
          placeholder="Search bookmarks…"
          aria-label="Search bookmarks"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setText('');
              e.currentTarget.blur();
            }
          }}
          autoComplete="off"
        />
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
          {text && (
            <button className="icon-btn size-6 rounded-md" onClick={() => setText('')} aria-label="Clear search">
              <X className="size-3.5" />
            </button>
          )}
          <button
            className="hidden items-center gap-0.5 sm:flex"
            onClick={() => setPaletteOpen(true)}
            title="Quick search"
            aria-label="Open quick search"
          >
            <kbd className="kbd">{MOD_KEY}</kbd>
            <kbd className="kbd">K</kbd>
          </button>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <ViewToggle />
        <ThemeToggle />
        <button className="btn-primary" onClick={addBookmark} title="Add bookmark (N)">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add bookmark</span>
        </button>
      </div>
    </header>
  );
}
