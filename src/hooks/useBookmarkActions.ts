import { useMemo } from 'react';
import { useUI } from '../context/ui';
import { deleteBookmarks, recordVisit, restoreBookmarks, toggleFavorite } from '../db/repo';
import { plural } from '../lib/format';
import type { BookmarkView } from '../lib/library';

/** Common bookmark actions with user feedback (toasts, undo). */
export function useBookmarkActions() {
  const { toast, openEditor } = useUI();

  return useMemo(
    () => ({
      /** Opens the link in a new tab and counts the visit. */
      open(bookmark: BookmarkView) {
        void recordVisit(bookmark.id);
        window.open(bookmark.url, '_blank', 'noopener,noreferrer');
      },
      /** For <a> clicks, where the browser opens the link itself. */
      visited(bookmark: BookmarkView) {
        void recordVisit(bookmark.id);
      },
      edit(bookmark: BookmarkView) {
        openEditor({ id: bookmark.id });
      },
      async toggleFavorite(bookmark: BookmarkView) {
        await toggleFavorite(bookmark.id);
      },
      async copy(bookmark: BookmarkView) {
        try {
          await navigator.clipboard.writeText(bookmark.url);
          toast('Link copied to clipboard');
        } catch {
          toast("Couldn't access the clipboard", { tone: 'error' });
        }
      },
      async remove(ids: number[]) {
        const snapshots = await deleteBookmarks(ids);
        if (!snapshots.length) return;
        const message =
          snapshots.length === 1
            ? `Deleted “${snapshots[0].bookmark.title}”`
            : `Deleted ${plural(snapshots.length, 'bookmark')}`;
        toast(message, {
          tone: 'info',
          action: {
            label: 'Undo',
            onClick: () => void restoreBookmarks(snapshots).then(() => toast('Restored')),
          },
        });
      },
    }),
    [toast, openEditor],
  );
}
