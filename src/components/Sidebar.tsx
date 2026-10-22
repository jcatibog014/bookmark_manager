import clsx from 'clsx';
import { Bookmark, Clock, Inbox, Library, Settings, Star, X, type LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useUI } from '../context/ui';

interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  count?: number;
}

function NavItem({ to, icon: Icon, label, active, count }: NavItemProps) {
  const { setSidebarOpen } = useUI();
  return (
    <Link
      to={to}
      onClick={() => setSidebarOpen(false)}
      className={clsx(
        'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
        active
          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100',
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && <span className="text-xs tabular-nums text-zinc-400">{count}</span>}
    </Link>
  );
}

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed } = useUI();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const onHome = location.pathname === '/';
  const view = onHome ? (params.get('view') ?? 'all') : null;

  const content = (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-4">
      <div className="flex items-center justify-between px-2">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
          <span className="flex size-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
            <Bookmark className="size-4" fill="currentColor" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Bookmarks</span>
        </Link>
        <button className="icon-btn lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
          <X className="size-4" />
        </button>
      </div>

      <nav className="flex flex-col gap-0.5">
        <NavItem to="/" icon={Library} label="All bookmarks" active={view === 'all'} />
        <NavItem to="/?view=favorites" icon={Star} label="Favorites" active={view === 'favorites'} />
        <NavItem to="/?view=recent" icon={Clock} label="Recently opened" active={view === 'recent'} />
        <NavItem to="/?view=unsorted" icon={Inbox} label="Unsorted" active={view === 'unsorted'} />
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <NavItem to="/settings" icon={Settings} label="Settings" active={location.pathname === '/settings'} />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={clsx(
          'hidden shrink-0 border-r border-zinc-200 bg-white/60 backdrop-blur transition-[width] duration-200 lg:block dark:border-zinc-800 dark:bg-zinc-900/40',
          sidebarCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-64',
        )}
      >
        <div className="h-full w-64">{content}</div>
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-zinc-950/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-slide-in-left bg-white shadow-xl dark:bg-zinc-900">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
