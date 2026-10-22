import clsx from 'clsx';
import {
  Bookmark,
  Check,
  Clock,
  Folder,
  Inbox,
  Keyboard,
  Library,
  Plus,
  Settings,
  Star,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLibrary } from '../context/library';
import { useUI } from '../context/ui';
import { createCollection, RepoError } from '../db/repo';
import { DOT_CLASS, TEXT_CLASS } from '../lib/colors';
import { parseFilters } from '../lib/filter';

const TAG_LIMIT = 12;

interface NavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  count?: number;
}

function NavItem({ to, icon, label, active, count }: NavItemProps) {
  const { setSidebarOpen } = useUI();
  return (
    <Link
      to={to}
      onClick={() => setSidebarOpen(false)}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'group flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100',
      )}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className={clsx('text-xs tabular-nums', active ? 'text-indigo-500' : 'text-zinc-400')}>{count}</span>
      )}
    </Link>
  );
}

function SectionHeader({ title, to, action }: { title: string; to: string; action?: ReactNode }) {
  const { setSidebarOpen } = useUI();
  return (
    <div className="flex items-center justify-between px-3 pb-1">
      <Link
        to={to}
        onClick={() => setSidebarOpen(false)}
        className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase hover:text-zinc-700 dark:hover:text-zinc-200"
        title={`Manage ${title.toLowerCase()}`}
      >
        {title}
      </Link>
      {action}
    </div>
  );
}

/** Inline row for creating a collection from the sidebar. */
function NewCollectionRow({ onDone }: { onDone: () => void }) {
  const { toast } = useUI();
  const [name, setName] = useState('');

  const save = async () => {
    if (!name.trim()) return onDone();
    try {
      await createCollection(name);
      toast(`Collection “${name.trim()}” created`);
      onDone();
    } catch (err) {
      toast(err instanceof RepoError ? err.message : 'Could not create the collection.', { tone: 'error' });
    }
  };

  return (
    <div className="flex items-center gap-1 rounded-xl border border-indigo-300 bg-white py-0.5 pr-0.5 pl-2 dark:border-indigo-500/50 dark:bg-zinc-900">
      <Folder className="size-4 shrink-0 text-zinc-400" />
      <input
        autoFocus
        className="min-w-0 flex-1 bg-transparent px-1 py-1 text-sm outline-none"
        placeholder="Collection name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void save();
          if (e.key === 'Escape') onDone();
        }}
        aria-label="New collection name"
      />
      <button className="icon-btn size-7" onClick={() => void save()} aria-label="Create collection">
        <Check className="size-4" />
      </button>
      <button className="icon-btn size-7" onClick={onDone} aria-label="Cancel">
        <X className="size-4" />
      </button>
    </div>
  );
}

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, setHelpOpen } = useUI();
  const { library } = useLibrary();
  const [creating, setCreating] = useState(false);
  const location = useLocation();
  const onHome = location.pathname === '/';
  const filters = parseFilters(new URLSearchParams(location.search));
  const scoped = onHome && filters.collectionId === null && filters.tags.length === 0;

  const favorites = library.bookmarks.filter((b) => b.isFavorite).length;
  const recent = library.bookmarks.filter((b) => b.lastVisitedAt !== null).length;
  const unsorted = library.bookmarks.filter((b) => b.collectionId === null).length;
  const topTags = [...library.tags].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, TAG_LIMIT);

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

      <nav className="flex flex-col gap-0.5" aria-label="Views">
        <NavItem to="/" icon={<Library className="size-4 shrink-0" />} label="All bookmarks" active={scoped && filters.view === 'all'} count={library.bookmarks.length} />
        <NavItem to="/?view=favorites" icon={<Star className="size-4 shrink-0" />} label="Favorites" active={scoped && filters.view === 'favorites'} count={favorites} />
        <NavItem to="/?view=recent" icon={<Clock className="size-4 shrink-0" />} label="Recently opened" active={scoped && filters.view === 'recent'} count={recent} />
        <NavItem to="/?view=unsorted" icon={<Inbox className="size-4 shrink-0" />} label="Unsorted" active={scoped && filters.view === 'unsorted'} count={unsorted} />
      </nav>

      <nav className="flex flex-col gap-0.5" aria-label="Collections">
        <SectionHeader
          title="Collections"
          to="/collections"
          action={
            <button className="icon-btn size-6 rounded-md" onClick={() => setCreating(true)} aria-label="New collection" title="New collection">
              <Plus className="size-3.5" />
            </button>
          }
        />
        {creating && <NewCollectionRow onDone={() => setCreating(false)} />}
        {library.collections.length === 0 && !creating && <p className="px-3 py-1 text-xs text-zinc-400">Group links into collections.</p>}
        {library.collections.map((c) => (
          <NavItem
            key={c.id}
            to={`/?collection=${c.id}`}
            icon={<Folder className={clsx('size-4 shrink-0', TEXT_CLASS[c.color])} />}
            label={c.name}
            active={onHome && filters.collectionId === c.id}
            count={c.count}
          />
        ))}
      </nav>

      <nav className="flex flex-col gap-0.5" aria-label="Tags">
        <SectionHeader
          title="Tags"
          to="/tags"
          action={
            library.tags.length > TAG_LIMIT && (
              <Link to="/tags" onClick={() => setSidebarOpen(false)} className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                All {library.tags.length}
              </Link>
            )
          }
        />
        {topTags.length === 0 && <p className="px-3 py-1 text-xs text-zinc-400">Tags you add will show up here.</p>}
        {topTags.map((tag) => (
          <NavItem
            key={tag.id}
            to={`/?tags=${encodeURIComponent(tag.name)}`}
            icon={<span className={clsx('mx-1 size-2 shrink-0 rounded-full', DOT_CLASS[tag.color])} />}
            label={tag.name}
            active={onHome && filters.tags.length === 1 && filters.tags[0] === tag.name}
            count={tag.count}
          />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <NavItem to="/settings" icon={<Settings className="size-4 shrink-0" />} label="Settings" active={location.pathname === '/settings'} />
        <button
          onClick={() => {
            setSidebarOpen(false);
            setHelpOpen(true);
          }}
          className="flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100"
        >
          <Keyboard className="size-4 shrink-0" />
          <span className="flex-1 text-left">Shortcuts</span>
          <kbd className="kbd">?</kbd>
        </button>
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
