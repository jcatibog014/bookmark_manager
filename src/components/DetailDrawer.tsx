import clsx from 'clsx';
import { Copy, ExternalLink, Folder, Globe, Pencil, Star, Trash, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useLibrary } from '../context/library';
import { useBookmarkActions } from '../hooks/useBookmarkActions';
import { TEXT_CLASS } from '../lib/colors';
import { findRelated } from '../lib/filter';
import { formatDate, plural, timeAgo } from '../lib/format';
import Favicon from './Favicon';
import { useDialog } from './Modal';
import TagChip from './TagChip';

interface DetailDrawerProps {
  bookmarkId: number;
  onClose: () => void;
  onNavigate: (id: number) => void;
  onTagClick: (name: string) => void;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

/** Side panel with full bookmark details and related bookmarks. */
export default function DetailDrawer({ bookmarkId, onClose, onNavigate, onTagClick }: DetailDrawerProps) {
  const { library } = useLibrary();
  const actions = useBookmarkActions();
  const panelRef = useDialog(onClose);
  const bookmark = library.byId.get(bookmarkId);
  const related = bookmark ? findRelated(bookmark, library.bookmarks) : [];

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-zinc-950/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Bookmark details"
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full max-w-md animate-slide-in-right flex-col border-l border-zinc-200 bg-white shadow-2xl outline-none dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <span className="text-sm font-medium text-zinc-500">Details</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close details">
            <X className="size-4" />
          </button>
        </div>

        {!bookmark ? (
          <p className="p-5 text-sm text-zinc-500">This bookmark was deleted.</p>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                <Favicon domain={bookmark.domain} className="size-12 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg leading-snug font-semibold tracking-tight break-words">{bookmark.title}</h2>
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => actions.visited(bookmark)}
                    className="mt-0.5 block truncate text-sm text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {bookmark.url}
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" onClick={() => actions.open(bookmark)}>
                  <ExternalLink className="size-4" /> Open
                </button>
                <button className="btn-secondary" onClick={() => actions.edit(bookmark)}>
                  <Pencil className="size-4" /> Edit
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => void actions.toggleFavorite(bookmark)}
                  aria-pressed={bookmark.isFavorite}
                >
                  <Star className={clsx('size-4', bookmark.isFavorite && 'fill-amber-400 text-amber-400')} />
                  {bookmark.isFavorite ? 'Favorited' : 'Favorite'}
                </button>
                <button className="icon-btn" onClick={() => void actions.copy(bookmark)} aria-label="Copy link" title="Copy link">
                  <Copy className="size-4" />
                </button>
                <button
                  className="icon-btn hover:text-red-600 dark:hover:text-red-400"
                  onClick={() => {
                    void actions.remove([bookmark.id]);
                    onClose();
                  }}
                  aria-label="Delete"
                  title="Delete"
                >
                  <Trash className="size-4" />
                </button>
              </div>

              {bookmark.description && (
                <p className="rounded-xl bg-zinc-50 p-3 text-sm whitespace-pre-wrap text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
                  {bookmark.description}
                </p>
              )}

              {bookmark.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {bookmark.tags.map((tag) => (
                    <TagChip key={tag.id} name={tag.name} color={tag.color} size="md" onClick={() => onTagClick(tag.name)} />
                  ))}
                </div>
              )}

              <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
                <Row label="Collection">
                  {bookmark.collection ? (
                    <Link
                      to={`/?collection=${bookmark.collection.id}`}
                      onClick={onClose}
                      className="inline-flex items-center gap-1.5 font-medium hover:underline"
                    >
                      <Folder className={clsx('size-3.5', TEXT_CLASS[bookmark.collection.color])} />
                      {bookmark.collection.name}
                    </Link>
                  ) : (
                    <span className="text-zinc-400">Unsorted</span>
                  )}
                </Row>
                <Row label="Website">
                  <Link
                    to={`/?domain=${encodeURIComponent(bookmark.domain)}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 font-medium hover:underline"
                  >
                    <Globe className="size-3.5 text-zinc-400" />
                    {bookmark.domain}
                  </Link>
                </Row>
                <Row label="Added">{formatDate(bookmark.createdAt)}</Row>
                {bookmark.updatedAt - bookmark.createdAt > 60_000 && <Row label="Edited">{timeAgo(bookmark.updatedAt)}</Row>}
                <Row label="Opened">
                  {bookmark.visitCount === 0
                    ? 'Never'
                    : `${plural(bookmark.visitCount, 'time')}${bookmark.lastVisitedAt ? `, last ${timeAgo(bookmark.lastVisitedAt)}` : ''}`}
                </Row>
              </dl>
            </div>

            <section className="border-t border-zinc-100 p-5 dark:border-zinc-800">
              <h3 className="mb-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Related bookmarks</h3>
              {related.length === 0 ? (
                <p className="text-sm text-zinc-500">No related bookmarks yet. Bookmarks from the same site or sharing two or more tags show up here.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {related.map(({ bookmark: r, sameDomain, sharedTags }) => (
                    <li key={r.id}>
                      <button
                        className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                        onClick={() => onNavigate(r.id)}
                      >
                        <Favicon domain={r.domain} className="size-8" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{r.title}</span>
                          <span className="block truncate text-xs text-zinc-500">
                            {[sameDomain && 'Same site', sharedTags.length > 0 && `${sharedTags.map((t) => `#${t}`).join(' ')}`]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}
