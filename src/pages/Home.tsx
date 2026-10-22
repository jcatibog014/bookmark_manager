import clsx from 'clsx';
import { BookmarkPlus, Clock, Folder, Inbox, Library, SearchX, Sparkles, SquareCheck, Star } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import BookmarkCard from '../components/BookmarkCard';
import BulkBar from '../components/BulkBar';
import DetailDrawer from '../components/DetailDrawer';
import EmptyState from '../components/EmptyState';
import FilterBar from '../components/FilterBar';
import { useLibrary } from '../context/library';
import { useUI } from '../context/ui';
import { importItems } from '../db/repo';
import { SAMPLE_BOOKMARKS } from '../db/sample';
import { TEXT_CLASS } from '../lib/colors';
import { applyFilters, countActiveFilters, parseFilters, serializeFilters, sortBookmarks, type Filters } from '../lib/filter';
import { plural } from '../lib/format';
import { createSearchIndex } from '../lib/search';

function Skeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading bookmarks">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex gap-3">
            <div className="size-10 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-2.5 w-1/3 rounded bg-zinc-100 dark:bg-zinc-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { library, loading } = useLibrary();
  const { viewMode, openEditor, toast } = useUI();
  const [params, setParams] = useSearchParams();
  const [loadingSample, setLoadingSample] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const lastSelected = useRef<number | null>(null);

  const filters = useMemo(() => parseFilters(params), [params]);
  const update = useCallback(
    (patch: Partial<Filters>) => setParams(serializeFilters({ ...filters, ...patch }), { replace: true }),
    [filters, setParams],
  );

  const query = filters.q.trim();
  const scoped = useMemo(() => applyFilters(library.bookmarks, filters), [library.bookmarks, filters]);
  const results = useMemo(
    () =>
      query
        ? createSearchIndex(scoped)
            .search(query)
            .map((r) => ({ bookmark: r.item, match: r }))
        : sortBookmarks(scoped, filters.sort).map((bookmark) => ({ bookmark, match: undefined })),
    [scoped, query, filters.sort],
  );

  // ----- selection (click a checkbox; shift+click selects a range)
  const visibleIds = useMemo(() => results.map((r) => r.bookmark.id), [results]);
  const selecting = selectMode || selected.size > 0;

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setSelectMode(false);
    lastSelected.current = null;
  }, []);

  const onSelect = (id: number, shiftKey: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const anchor = lastSelected.current;
      if (shiftKey && anchor !== null && visibleIds.includes(anchor)) {
        const [a, b] = [visibleIds.indexOf(anchor), visibleIds.indexOf(id)].sort((x, y) => x - y);
        visibleIds.slice(a, b + 1).forEach((v) => next.add(v));
      } else if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    lastSelected.current = id;
  };

  // Drop selections that disappeared (deleted elsewhere, or filtered out).
  useEffect(() => {
    setSelected((prev) => {
      const visible = new Set(visibleIds);
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleIds]);

  // Escape clears the selection when no dialog is open.
  useEffect(() => {
    if (!selecting) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('[aria-modal="true"]')) clearSelection();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selecting, clearSelection]);

  const toggleTag = (name: string) =>
    update({ tags: filters.tags.includes(name) ? filters.tags.filter((t) => t !== name) : [...filters.tags, name], untagged: false });

  const loadSample = async () => {
    setLoadingSample(true);
    const report = await importItems(SAMPLE_BOOKMARKS);
    setLoadingSample(false);
    toast(`Added ${plural(report.added, 'sample bookmark')}`);
  };

  // ----- header
  const collection = filters.collectionId !== null ? library.collections.find((c) => c.id === filters.collectionId) : null;
  let icon: ReactNode = <Library className="size-5" />;
  let title = 'All bookmarks';
  if (filters.collectionId !== null) {
    icon = <Folder className={clsx('size-5', collection && TEXT_CLASS[collection.color])} />;
    title = collection?.name ?? 'Collection';
  } else if (filters.view === 'favorites') {
    icon = <Star className="size-5 fill-amber-400 text-amber-400" />;
    title = 'Favorites';
  } else if (filters.view === 'recent') {
    icon = <Clock className="size-5" />;
    title = 'Recently opened';
  } else if (filters.view === 'unsorted') {
    icon = <Inbox className="size-5" />;
    title = 'Unsorted';
  } else if (filters.tags.length === 1) {
    title = `#${filters.tags[0]}`;
  }

  const summary = query
    ? `${plural(results.length, 'result')} for “${query}”`
    : plural(results.length, 'bookmark');

  // ----- body
  let body: ReactNode;
  if (loading) {
    body = <Skeleton />;
  } else if (library.bookmarks.length === 0) {
    body = (
      <EmptyState
        icon={BookmarkPlus}
        title="Start your collection"
        description="Save links with titles, tags and notes, then find them again in seconds with search and filters."
      >
        <button className="btn-primary" onClick={() => openEditor()}>
          <BookmarkPlus className="size-4" />
          Add your first bookmark
        </button>
        <button className="btn-secondary" onClick={() => void loadSample()} disabled={loadingSample}>
          <Sparkles className="size-4" />
          Load sample bookmarks
        </button>
      </EmptyState>
    );
  } else if (filters.collectionId !== null && !collection) {
    body = <EmptyState icon={Folder} title="Collection not found" description="It may have been deleted." />;
  } else if (results.length === 0) {
    const refinements = countActiveFilters(filters) > 0 || query;
    body = (
      <EmptyState
        icon={SearchX}
        title={refinements ? 'No bookmarks match' : 'Nothing here yet'}
        description={
          refinements
            ? 'Try different keywords or remove some filters.'
            : filters.view === 'favorites'
              ? 'Star a bookmark to pin it here.'
              : filters.view === 'recent'
                ? 'Bookmarks you open will show up here.'
                : 'Add a bookmark to get started.'
        }
      >
        {refinements ? (
          <button
            className="btn-secondary"
            onClick={() => update({ q: '', tags: [], domain: null, date: 'any', from: null, to: null, untagged: false })}
          >
            Clear search & filters
          </button>
        ) : (
          <button className="btn-primary" onClick={() => openEditor({ collectionId: filters.collectionId })}>
            <BookmarkPlus className="size-4" />
            Add bookmark
          </button>
        )}
      </EmptyState>
    );
  } else {
    const cards = results.map(({ bookmark, match }) => (
      <BookmarkCard
        key={bookmark.id}
        bookmark={bookmark}
        mode={viewMode}
        match={match}
        activeTags={filters.tags}
        onTagClick={toggleTag}
        selected={selected.has(bookmark.id)}
        selecting={selecting}
        onSelect={onSelect}
        onDetails={(b) => setDetailsId(b.id)}
      />
    ));
    body =
      viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards}</div>
      ) : viewMode === 'list' ? (
        <div className="flex flex-col gap-2">{cards}</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">{cards}</div>
      );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
              <span className="text-zinc-400">{icon}</span>
              <span className="truncate">{title}</span>
            </h1>
            {!loading && library.bookmarks.length > 0 && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{summary}</p>
            )}
          </div>
          {results.length > 0 && (
            <button
              className={clsx('btn-secondary', selecting && 'border-indigo-300 text-indigo-700 dark:border-indigo-500/50 dark:text-indigo-300')}
              onClick={() => (selecting ? clearSelection() : setSelectMode(true))}
              aria-pressed={selecting}
            >
              <SquareCheck className="size-4" />
              {selecting ? 'Done' : 'Select'}
            </button>
          )}
        </div>
        {!loading && library.bookmarks.length > 0 && (
          <FilterBar filters={filters} onChange={update} library={library} searching={!!query} />
        )}
      </div>
      {body}
      {selected.size > 0 && <div className="h-16" aria-hidden />}

      {selected.size > 0 && (
        <BulkBar
          selected={[...selected]}
          visibleIds={visibleIds}
          onSelectAll={() => setSelected(new Set(visibleIds))}
          onClear={clearSelection}
        />
      )}
      {detailsId !== null && (
        <DetailDrawer
          bookmarkId={detailsId}
          onClose={() => setDetailsId(null)}
          onNavigate={setDetailsId}
          onTagClick={(name) => {
            setDetailsId(null);
            update({ tags: [name], untagged: false });
          }}
        />
      )}
    </div>
  );
}
