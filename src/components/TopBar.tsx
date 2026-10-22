import { Menu, PanelLeft, Plus, Search } from 'lucide-react';
import { useUI } from '../context/ui';
import ThemeToggle from './ThemeToggle';
import ViewToggle from './ViewToggle';

export default function TopBar() {
  const { setSidebarOpen, toggleSidebarCollapsed } = useUI();

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
        <input className="input pl-9" placeholder="Search bookmarks…" aria-label="Search bookmarks" />
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <ViewToggle />
        <ThemeToggle />
        <button className="btn-primary">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add bookmark</span>
        </button>
      </div>
    </header>
  );
}
