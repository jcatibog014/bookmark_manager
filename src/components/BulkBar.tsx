import clsx from 'clsx';
import { Folder, FolderInput, Inbox, SquareCheck, Star, Tag, Trash, X } from 'lucide-react';
import { useState } from 'react';
import { useLibrary } from '../context/library';
import { useUI } from '../context/ui';
import { addTagsToBookmarks, moveToCollection, setFavorite } from '../db/repo';
import { useBookmarkActions } from '../hooks/useBookmarkActions';
import { TEXT_CLASS } from '../lib/colors';
import { plural } from '../lib/format';
import Modal from './Modal';
import Popover from './Popover';
import TagInput from './TagInput';

interface BulkBarProps {
  selected: number[];
  visibleIds: number[];
  onSelectAll: () => void;
  onClear: () => void;
}

/** Floating toolbar for acting on several selected bookmarks at once. */
export default function BulkBar({ selected, visibleIds, onSelectAll, onClear }: BulkBarProps) {
  const { library } = useLibrary();
  const { toast } = useUI();
  const actions = useBookmarkActions();
  const [tagging, setTagging] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const count = plural(selected.length, 'bookmark');
  const allFavorite = selected.every((id) => library.byId.get(id)?.isFavorite);

  const applyTags = async () => {
    if (!tags.length) return;
    await addTagsToBookmarks(selected, tags);
    toast(`Tagged ${count}`);
    setTags([]);
    setTagging(false);
  };

  const move = async (collectionId: number | null, name: string) => {
    await moveToCollection(selected, collectionId);
    toast(`Moved ${count} to ${name}`);
  };

  const btn = 'btn-ghost px-2 text-zinc-200 sm:px-2.5 hover:bg-white/10 hover:text-white dark:text-zinc-200 dark:hover:bg-white/10';

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
        <div
          role="toolbar"
          aria-label="Bulk actions"
          className="pointer-events-auto flex max-w-full animate-slide-up items-center gap-0.5 rounded-2xl sm:gap-1 bg-zinc-900 p-1.5 text-sm text-white shadow-2xl ring-1 ring-white/10 dark:bg-zinc-800"
        >
          <span className="px-2.5 font-medium whitespace-nowrap">{selected.length} selected</span>
          {selected.length < visibleIds.length && (
            <button className={btn} onClick={onSelectAll} title="Select all visible">
              <SquareCheck className="size-4" />
              <span className="hidden md:inline">All</span>
            </button>
          )}
          <span className="mx-1 h-5 w-px bg-white/15" />
          <button className={btn} onClick={() => void setFavorite(selected, !allFavorite)} title={allFavorite ? 'Unfavorite' : 'Favorite'}>
            <Star className={clsx('size-4', allFavorite && 'fill-amber-400 text-amber-400')} />
            <span className="hidden md:inline">{allFavorite ? 'Unfavorite' : 'Favorite'}</span>
          </button>
          <button className={btn} onClick={() => setTagging(true)} title="Add tags">
            <Tag className="size-4" />
            <span className="hidden md:inline">Tag</span>
          </button>
          <Popover
            side="top"
            className="w-60 p-1.5 text-zinc-900 dark:text-zinc-100"
            trigger={({ toggle }) => (
              <button className={btn} onClick={toggle} title="Move to collection">
                <FolderInput className="size-4" />
                <span className="hidden md:inline">Move</span>
              </button>
            )}
          >
            {(close) => (
              <div className="flex max-h-64 flex-col overflow-y-auto">
                <button
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => {
                    close();
                    void move(null, 'Unsorted');
                  }}
                >
                  <Inbox className="size-4 text-zinc-400" /> Unsorted
                </button>
                {library.collections.map((c) => (
                  <button
                    key={c.id}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => {
                      close();
                      void move(c.id, c.name);
                    }}
                  >
                    <Folder className={clsx('size-4', TEXT_CLASS[c.color])} />
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </Popover>
          <button
            className={clsx(btn, 'hover:text-red-300')}
            onClick={() => {
              void actions.remove(selected);
              onClear();
            }}
            title="Delete"
          >
            <Trash className="size-4" />
            <span className="hidden md:inline">Delete</span>
          </button>
          <span className="mx-1 h-5 w-px bg-white/15" />
          <button className={btn} onClick={onClear} aria-label="Clear selection" title="Clear selection (Esc)">
            <X className="size-4" />
          </button>
        </div>
      </div>

      {tagging && (
        <Modal
          title={`Add tags to ${count}`}
          description="Existing tags are kept."
          onClose={() => setTagging(false)}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setTagging(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={() => void applyTags()} disabled={!tags.length}>
                Add tags
              </button>
            </>
          }
        >
          <div className="px-5 pt-4 pb-5">
            <TagInput value={tags} onChange={setTags} suggestions={library.tags} autoFocus />
          </div>
        </Modal>
      )}
    </>
  );
}
