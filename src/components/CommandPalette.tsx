import clsx from 'clsx';
import {
  BookmarkPlus,
  Clock,
  CornerDownLeft,
  Folder,
  Hash,
  Keyboard,
  Moon,
  Plus,
  Search,
  Settings,
  Star,
  Sun,
  Tags,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '../context/library';
import { useUI } from '../context/ui';
import { useBookmarkActions } from '../hooks/useBookmarkActions';
import { DOT_CLASS, TEXT_CLASS } from '../lib/colors';
import type { BookmarkView } from '../lib/library';
import { createSearchIndex, matchRanges, type SearchResult } from '../lib/search';
import { validateUrl } from '../lib/url';
import Favicon from './Favicon';
import Highlight from './Highlight';
import Modal from './Modal';

interface Item {
  id: string;
  section: string;
  icon: ReactNode;
  label: ReactNode;
  detail?: ReactNode;
  /** `mod` is true when Ctrl/⌘ was held. */
  run: (mod: boolean) => void;
}

const iconBox = 'flex size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400';

export default function CommandPalette() {
  const { setPaletteOpen, openEditor, theme, setTheme, setHelpOpen } = useUI();
  const { library } = useLibrary();
  const navigate = useNavigate();
  const actions = useBookmarkActions();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const index = useMemo(() => createSearchIndex(library.bookmarks), [library.bookmarks]);
  const close = () => setPaletteOpen(false);
  const go = (to: string) => {
    navigate(to);
    close();
  };

  const items = useMemo<Item[]>(() => {
    const q = query.trim();
    const lower = q.toLowerCase();

    const bookmarkItem = (b: BookmarkView, section: string, match?: SearchResult): Item => ({
      id: `b${b.id}`,
      section,
      icon: <Favicon domain={b.domain} className="size-7 rounded-lg" />,
      label: <Highlight text={b.title} ranges={matchRanges(match, 'title')} />,
      detail: (
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">
            <Highlight text={b.domain} ranges={matchRanges(match, 'domain')} />
          </span>
          {b.tags.slice(0, 3).map((t) => (
            <span key={t.id} className="hidden shrink-0 items-center gap-1 sm:inline-flex">
              <span className={clsx('size-1.5 rounded-full', DOT_CLASS[t.color])} />
              {t.name}
            </span>
          ))}
          {b.isFavorite && <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" />}
        </span>
      ),
      run: (mod) => {
        close();
        if (mod) actions.edit(b);
        else actions.open(b);
      },
    });

    const commands: Item[] = [
      { id: 'add', section: 'Actions', icon: <span className={iconBox}><Plus className="size-4" /></span>, label: 'Add bookmark', detail: 'N', run: () => { close(); openEditor(); } },
      { id: 'fav', section: 'Actions', icon: <span className={iconBox}><Star className="size-4" /></span>, label: 'Go to Favorites', run: () => go('/?view=favorites') },
      { id: 'recent', section: 'Actions', icon: <span className={iconBox}><Clock className="size-4" /></span>, label: 'Go to Recently opened', run: () => go('/?view=recent') },
      { id: 'tags', section: 'Actions', icon: <span className={iconBox}><Tags className="size-4" /></span>, label: 'Manage tags', run: () => go('/tags') },
      { id: 'collections', section: 'Actions', icon: <span className={iconBox}><Folder className="size-4" /></span>, label: 'Manage collections', run: () => go('/collections') },
      { id: 'settings', section: 'Actions', icon: <span className={iconBox}><Settings className="size-4" /></span>, label: 'Settings, import & export', run: () => go('/settings') },
      {
        id: 'theme',
        section: 'Actions',
        icon: <span className={iconBox}>{theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}</span>,
        label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        run: () => { setTheme(theme === 'dark' ? 'light' : 'dark'); close(); },
      },
      { id: 'help', section: 'Actions', icon: <span className={iconBox}><Keyboard className="size-4" /></span>, label: 'Keyboard shortcuts', detail: '?', run: () => { close(); setHelpOpen(true); } },
    ];

    if (!q) {
      const recent = [...library.bookmarks]
        .sort((a, b) => (b.lastVisitedAt ?? b.createdAt) - (a.lastVisitedAt ?? a.createdAt))
        .slice(0, 5)
        .map((b) => bookmarkItem(b, 'Recent'));
      return [...recent, ...commands];
    }

    const result: Item[] = [];

    // Typed or pasted a link? Offer to save it (or jump to the saved copy).
    const check = /[./]/.test(q) ? validateUrl(q) : null;
    if (check?.ok) {
      const saved = library.byNormalizedUrl.get(check.normalized);
      if (saved) result.push(bookmarkItem(saved, 'Already saved'));
      else
        result.push({
          id: 'save-url',
          section: 'Save link',
          icon: <span className={clsx(iconBox, 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400')}><BookmarkPlus className="size-4" /></span>,
          label: `Save ${check.domain}`,
          detail: check.url,
          run: () => { close(); openEditor({ url: check.url }); },
        });
    }

    result.push(...index.search(q, { limit: 8 }).map((r) => bookmarkItem(r.item, 'Bookmarks', r)));

    for (const tag of library.tags.filter((t) => t.name.includes(lower.replace(/^#/, ''))).slice(0, 4)) {
      result.push({
        id: `t${tag.id}`,
        section: 'Tags',
        icon: <span className={iconBox}><Hash className={clsx('size-4', TEXT_CLASS[tag.color])} /></span>,
        label: tag.name,
        detail: `${tag.count} bookmarks`,
        run: () => go(`/?tags=${encodeURIComponent(tag.name)}`),
      });
    }
    for (const c of library.collections.filter((c) => c.name.toLowerCase().includes(lower)).slice(0, 4)) {
      result.push({
        id: `c${c.id}`,
        section: 'Collections',
        icon: <span className={iconBox}><Folder className={clsx('size-4', TEXT_CLASS[c.color])} /></span>,
        label: c.name,
        detail: `${c.count} bookmarks`,
        run: () => go(`/?collection=${c.id}`),
      });
    }
    result.push(...commands.filter((c) => typeof c.label === 'string' && c.label.toLowerCase().includes(lower)));
    result.push({
      id: 'search-all',
      section: 'Search',
      icon: <span className={iconBox}><Search className="size-4" /></span>,
      label: `Show all results for “${q}”`,
      run: () => go(`/?q=${encodeURIComponent(q)}`),
    });
    return result;
  }, [query, library, index, theme]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (i + 1) % Math.max(items.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (i - 1 + items.length) % Math.max(items.length, 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      items[active]?.run(event.ctrlKey || event.metaKey);
    }
  };

  let lastSection = '';

  return (
    <Modal onClose={close} size="lg" position="top" hideClose>
      <div className="flex items-center gap-3 border-b border-zinc-100 px-4 dark:border-zinc-800">
        <Search className="size-5 shrink-0 text-zinc-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search bookmarks, tags, collections… or paste a link"
          className="h-14 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-zinc-400"
          aria-label="Command palette"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={items[active] ? `palette-${items[active].id}` : undefined}
        />
        <kbd className="kbd">Esc</kbd>
      </div>

      <div ref={listRef} id="palette-list" role="listbox" className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
        {items.length === 0 && <p className="px-3 py-8 text-center text-sm text-zinc-500">No matches.</p>}
        {items.map((item, i) => {
          const header = item.section !== lastSection;
          lastSection = item.section;
          return (
            <div key={item.id}>
              {header && (
                <div className="px-3 pt-3 pb-1.5 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase first:pt-1">
                  {item.section}
                </div>
              )}
              <button
                id={`palette-${item.id}`}
                type="button"
                role="option"
                aria-selected={i === active}
                data-index={i}
                onMouseMove={() => setActive(i)}
                onClick={(e) => item.run(e.ctrlKey || e.metaKey)}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm',
                  i === active ? 'bg-indigo-50 dark:bg-indigo-500/10' : '',
                )}
              >
                {item.icon}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{item.label}</span>
                  {item.detail && typeof item.detail !== 'string' && (
                    <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">{item.detail}</span>
                  )}
                </span>
                {typeof item.detail === 'string' &&
                  (item.detail.length <= 2 ? (
                    <kbd className="kbd">{item.detail}</kbd>
                  ) : (
                    <span className="max-w-[40%] truncate text-xs text-zinc-400">{item.detail}</span>
                  ))}
                {i === active && <CornerDownLeft className="size-3.5 shrink-0 text-zinc-400" />}
              </button>
            </div>
          );
        })}
      </div>

      <div className="hidden items-center gap-4 border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-500 sm:flex dark:border-zinc-800">
        <span className="flex items-center gap-1.5">
          <kbd className="kbd">↑</kbd>
          <kbd className="kbd">↓</kbd> navigate
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="kbd">↵</kbd> open
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="kbd">Ctrl</kbd>
          <kbd className="kbd">↵</kbd> edit
        </span>
      </div>
    </Modal>
  );
}
