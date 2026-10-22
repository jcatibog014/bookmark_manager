import clsx from 'clsx';
import { Check, Copy, Folder, Pencil, Star, Trash } from 'lucide-react';
import type { KeyboardEvent, MouseEvent } from 'react';
import type { ViewMode } from '../context/ui';
import { useBookmarkActions } from '../hooks/useBookmarkActions';
import { TEXT_CLASS } from '../lib/colors';
import { timeAgo } from '../lib/format';
import type { BookmarkView } from '../lib/library';
import { matchRanges, type SearchResult } from '../lib/search';
import Favicon from './Favicon';
import Highlight from './Highlight';
import TagChip from './TagChip';

interface BookmarkCardProps {
  bookmark: BookmarkView;
  mode: ViewMode;
  match?: SearchResult;
  activeTags: string[];
  onTagClick: (name: string) => void;
  selected?: boolean;
  /** True while any bookmark is selected: checkboxes stay visible. */
  selecting?: boolean;
  onSelect?: (id: number, shiftKey: boolean) => void;
  onDetails?: (bookmark: BookmarkView) => void;
}

export default function BookmarkCard({
  bookmark,
  mode,
  match,
  activeTags,
  onTagClick,
  selected = false,
  selecting = false,
  onSelect,
  onDetails,
}: BookmarkCardProps) {
  const actions = useBookmarkActions();
  const maxTags = mode === 'compact' ? 2 : 4;
  const extraTags = bookmark.tags.length - maxTags;

  // Keyboard shortcuts on a focused card.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.target !== event.currentTarget || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    const run = (fn: () => void) => {
      event.preventDefault();
      fn();
    };
    if (key === 'enter') run(() => actions.open(bookmark));
    else if (key === 'f') run(() => void actions.toggleFavorite(bookmark));
    else if (key === 'e') run(() => actions.edit(bookmark));
    else if (key === 'delete' || key === 'backspace') run(() => void actions.remove([bookmark.id]));
    else if (key === 'c') run(() => void actions.copy(bookmark));
    else if (key === 'i' && onDetails) run(() => onDetails(bookmark));
    else if (key === ' ' && onSelect) run(() => onSelect(bookmark.id, event.shiftKey));
  };

  // Clicking empty card space opens the details panel (or toggles selection while selecting).
  const onCardClick = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('a, button')) return;
    if (selecting && onSelect) onSelect(bookmark.id, event.shiftKey);
    else onDetails?.(bookmark);
  };

  const iconSize = mode === 'grid' ? 'size-10' : mode === 'list' ? 'size-9' : 'size-6 rounded-md';

  const icon = (
    <div className="relative shrink-0">
      <Favicon
        domain={bookmark.domain}
        className={clsx(
          iconSize,
          onSelect && (selecting ? 'invisible' : 'group-hover:invisible group-focus-within:invisible'),
        )}
      />
      {onSelect && (
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={`Select ${bookmark.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(bookmark.id, e.shiftKey);
          }}
          className={clsx(
            'absolute inset-0 items-center justify-center rounded-lg border-2 transition',
            selecting ? 'flex' : 'hidden group-focus-within:flex group-hover:flex',
            selected
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-zinc-300 bg-white hover:border-indigo-400 dark:border-zinc-600 dark:bg-zinc-900',
          )}
        >
          {selected && <Check className="size-4" strokeWidth={3} />}
        </button>
      )}
    </div>
  );

  const title = (
    <a
      href={bookmark.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => actions.visited(bookmark)}
      className={clsx(
        'font-medium text-zinc-900 decoration-indigo-500/40 underline-offset-2 hover:text-indigo-600 hover:underline dark:text-zinc-100 dark:hover:text-indigo-400',
        mode === 'grid' ? 'line-clamp-2 text-[15px] leading-snug' : 'truncate',
      )}
      title={bookmark.url}
    >
      <Highlight text={bookmark.title} ranges={matchRanges(match, 'title')} />
    </a>
  );

  const domain = (
    <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
      <Highlight text={bookmark.domain} ranges={matchRanges(match, 'domain')} />
    </span>
  );

  const star = (
    <button
      type="button"
      onClick={() => void actions.toggleFavorite(bookmark)}
      className={clsx(
        'icon-btn size-8 shrink-0',
        bookmark.isFavorite ? 'text-amber-400 hover:text-amber-500 dark:text-amber-400' : 'opacity-60 hover:opacity-100',
      )}
      aria-pressed={bookmark.isFavorite}
      aria-label={bookmark.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      title={bookmark.isFavorite ? 'Remove from favorites (F)' : 'Add to favorites (F)'}
    >
      <Star className={clsx('size-4', bookmark.isFavorite && 'fill-current')} />
    </button>
  );

  const tools = (
    <div
      className={clsx(
        'flex items-center gap-0.5 transition-opacity',
        'opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100',
      )}
    >
      <button type="button" className="icon-btn size-8" onClick={() => actions.edit(bookmark)} aria-label="Edit" title="Edit (E)">
        <Pencil className="size-3.5" />
      </button>
      <button type="button" className="icon-btn size-8" onClick={() => void actions.copy(bookmark)} aria-label="Copy link" title="Copy link (C)">
        <Copy className="size-3.5" />
      </button>
      <button
        type="button"
        className="icon-btn size-8 hover:text-red-600 dark:hover:text-red-400"
        onClick={() => void actions.remove([bookmark.id])}
        aria-label="Delete"
        title="Delete (Del)"
      >
        <Trash className="size-3.5" />
      </button>
    </div>
  );

  const tags = bookmark.tags.length > 0 && (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {bookmark.tags.slice(0, maxTags).map((tag) => (
        <TagChip
          key={tag.id}
          name={tag.name}
          color={tag.color}
          active={activeTags.includes(tag.name)}
          onClick={() => onTagClick(tag.name)}
        />
      ))}
      {extraTags > 0 && <span className="text-xs text-zinc-400">+{extraTags}</span>}
    </div>
  );

  const collection = bookmark.collection && (
    <span className="inline-flex min-w-0 items-center gap-1">
      <Folder className={clsx('size-3 shrink-0', TEXT_CLASS[bookmark.collection.color])} />
      <span className="truncate">{bookmark.collection.name}</span>
    </span>
  );

  const shared = {
    tabIndex: 0,
    onKeyDown,
    onClick: onCardClick,
    'aria-label': bookmark.title,
    'data-bookmark-id': bookmark.id,
  };

  const surface = clsx(
    'group relative cursor-default outline-none transition focus-visible:ring-4 focus-visible:ring-indigo-500/25',
    selected
      ? 'border-indigo-400 bg-indigo-50/60 dark:border-indigo-500/60 dark:bg-indigo-500/10'
      : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700',
  );

  if (mode === 'grid') {
    return (
      <article {...shared} className={clsx(surface, 'flex flex-col rounded-2xl border p-4 shadow-xs hover:shadow-md')}>
        <div className="flex items-start gap-3">
          {icon}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
            {title}
            {domain}
          </div>
          {star}
        </div>
        {bookmark.description && (
          <p className="mt-3 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Highlight text={bookmark.description} ranges={matchRanges(match, 'description')} />
          </p>
        )}
        {tags && <div className="mt-3">{tags}</div>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-zinc-400">
          <div className="flex min-w-0 items-center gap-2">
            {collection}
            {collection && <span aria-hidden>·</span>}
            <span className="shrink-0" title={new Date(bookmark.createdAt).toLocaleString()}>
              {timeAgo(bookmark.createdAt)}
            </span>
          </div>
          <div className="-mr-2 -mb-2">{tools}</div>
        </div>
      </article>
    );
  }

  if (mode === 'list') {
    return (
      <article {...shared} className={clsx(surface, 'flex items-center gap-3 rounded-2xl border px-4 py-3')}>
        {icon}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-baseline gap-2">
            {title}
            <span className="hidden shrink-0 sm:inline">{domain}</span>
          </div>
          {bookmark.description && (
            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
              <Highlight text={bookmark.description} ranges={matchRanges(match, 'description')} />
            </p>
          )}
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
            {tags}
            {collection}
            <span>{timeAgo(bookmark.createdAt)}</span>
          </div>
        </div>
        <div className="hidden sm:block">{tools}</div>
        {star}
      </article>
    );
  }

  return (
    <article
      {...shared}
      className={clsx(surface, 'flex items-center gap-3 border-b px-3 py-1.5 first:rounded-t-2xl last:rounded-b-2xl last:border-b-0')}
    >
      {icon}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {title}
        <span className="hidden shrink-0 md:inline">{domain}</span>
      </div>
      <div className="hidden lg:block">{tags}</div>
      <div className="hidden sm:block">{tools}</div>
      {star}
    </article>
  );
}
