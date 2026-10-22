import clsx from 'clsx';
import { Check, Folder, FolderPlus, Palette, Pencil, Trash, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import ColorPicker from '../components/ColorPicker';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import Popover from '../components/Popover';
import { useLibrary } from '../context/library';
import { useUI } from '../context/ui';
import {
  createCollection,
  deleteCollection,
  renameCollection,
  RepoError,
  setCollectionColor,
  type DeleteCollectionMode,
} from '../db/repo';
import { CHIP_CLASS, DOT_CLASS, type ColorName } from '../lib/colors';
import { plural } from '../lib/format';
import type { CollectionWithCount } from '../lib/library';

function CollectionCard({ collection, onDelete }: { collection: CollectionWithCount; onDelete: () => void }) {
  const { toast } = useUI();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(collection.name);

  const save = async () => {
    try {
      await renameCollection(collection.id, name);
      setEditing(false);
    } catch (err) {
      toast(err instanceof RepoError ? err.message : 'Could not rename the collection.', { tone: 'error' });
    }
  };

  return (
    <li className="group flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <span className={clsx('flex size-10 shrink-0 items-center justify-center rounded-xl', CHIP_CLASS[collection.color])}>
          <Folder className="size-5" />
        </span>
        {editing ? (
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <input
              className="input py-1"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void save();
                if (e.key === 'Escape') {
                  setName(collection.name);
                  setEditing(false);
                }
              }}
              aria-label="Collection name"
            />
            <button className="icon-btn shrink-0" onClick={() => void save()} aria-label="Save">
              <Check className="size-4" />
            </button>
            <button className="icon-btn shrink-0" onClick={() => setEditing(false)} aria-label="Cancel">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <Link
              to={`/?collection=${collection.id}`}
              className="block truncate font-medium hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              {collection.name}
            </Link>
            <p className="text-xs text-zinc-500">{plural(collection.count, 'bookmark')}</p>
          </div>
        )}
      </div>

      {!editing && (
        <div className="flex items-center justify-between">
          <Link to={`/?collection=${collection.id}`} className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Open
          </Link>
          <div className="flex items-center opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            <button className="icon-btn size-8" onClick={() => setEditing(true)} aria-label={`Rename ${collection.name}`} title="Rename">
              <Pencil className="size-3.5" />
            </button>
            <Popover
              align="right"
              className="w-52"
              trigger={({ toggle }) => (
                <button className="icon-btn size-8" onClick={toggle} aria-label={`Change color of ${collection.name}`} title="Color">
                  <Palette className="size-3.5" />
                </button>
              )}
            >
              {(close) => (
                <ColorPicker
                  value={collection.color}
                  onChange={(color) => {
                    void setCollectionColor(collection.id, color);
                    close();
                  }}
                />
              )}
            </Popover>
            <button
              className="icon-btn size-8 hover:text-red-600 dark:hover:text-red-400"
              onClick={onDelete}
              aria-label={`Delete ${collection.name}`}
              title="Delete"
            >
              <Trash className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function Collections() {
  const { library, loading } = useLibrary();
  const { toast } = useUI();
  const [name, setName] = useState('');
  const [color, setColor] = useState<ColorName>('indigo');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CollectionWithCount | null>(null);
  const [mode, setMode] = useState<DeleteCollectionMode>('unsort');

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await createCollection(name, color);
      toast(`Collection “${name.trim()}” created`);
      setName('');
    } catch (err) {
      setError(err instanceof RepoError ? err.message : 'Could not create the collection.');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const affected = await deleteCollection(deleting.id, mode);
    toast(
      mode === 'cascade'
        ? `Deleted “${deleting.name}” and ${plural(affected, 'bookmark')}`
        : `Deleted “${deleting.name}”; ${plural(affected, 'bookmark')} moved to Unsorted`,
    );
    setDeleting(null);
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          <Folder className="size-5 text-zinc-400" /> Collections
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Each bookmark lives in one collection, or in Unsorted. Use tags for cross-cutting topics.
        </p>
      </div>

      <form
        onSubmit={create}
        className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-start dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex-1">
          <input
            className="input"
            placeholder="New collection name, e.g. Recipes"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            aria-label="New collection name"
            aria-invalid={!!error}
          />
          {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
        <Popover
          className="w-52"
          trigger={({ toggle }) => (
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={toggle}>
              <span className={clsx('size-3 rounded-full', DOT_CLASS[color])} />
              Color
            </button>
          )}
        >
          {(close) => (
            <ColorPicker
              value={color}
              onChange={(c) => {
                setColor(c);
                close();
              }}
            />
          )}
        </Popover>
        <button type="submit" className="btn-primary" disabled={!name.trim()}>
          <FolderPlus className="size-4" /> Create
        </button>
      </form>

      {!loading && library.collections.length === 0 ? (
        <EmptyState icon={Folder} title="No collections yet" description="Create one above, or right from the bookmark form." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {library.collections.map((c) => (
            <CollectionCard
              key={c.id}
              collection={c}
              onDelete={() => {
                setMode('unsort');
                setDeleting(c);
              }}
            />
          ))}
        </ul>
      )}

      {deleting && (
        <Modal
          title={`Delete “${deleting.name}”?`}
          description={deleting.count ? `It contains ${plural(deleting.count, 'bookmark')}.` : 'This collection is empty.'}
          onClose={() => setDeleting(null)}
          size="sm"
          footer={
            <>
              <button className="btn-ghost" onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={() => void confirmDelete()}>
                Delete collection
              </button>
            </>
          }
        >
          {deleting.count > 0 ? (
            <fieldset className="flex flex-col gap-2 px-5 pt-4 pb-5">
              <legend className="sr-only">What should happen to its bookmarks?</legend>
              {(
                [
                  ['unsort', 'Keep the bookmarks', 'They move to Unsorted.'],
                  ['cascade', 'Delete the bookmarks too', 'This can’t be undone.'],
                ] as const
              ).map(([value, label, hint]) => (
                <label
                  key={value}
                  className={clsx(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition',
                    mode === value
                      ? value === 'cascade'
                        ? 'border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10'
                        : 'border-indigo-300 bg-indigo-50 dark:border-indigo-500/40 dark:bg-indigo-500/10'
                      : 'border-zinc-200 dark:border-zinc-800',
                  )}
                >
                  <input
                    type="radio"
                    name="delete-mode"
                    className="mt-0.5 accent-indigo-600"
                    checked={mode === value}
                    onChange={() => setMode(value)}
                  />
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-zinc-500">{hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : (
            <div className="h-4" />
          )}
        </Modal>
      )}
    </div>
  );
}
