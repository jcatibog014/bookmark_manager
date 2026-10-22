import clsx from 'clsx';
import { ArrowUpDown, Check, Hash, Merge, Pencil, Search, Trash, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ColorPicker from '../components/ColorPicker';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import Popover from '../components/Popover';
import { useLibrary } from '../context/library';
import { useUI } from '../context/ui';
import { deleteTag, mergeTags, normalizeTagName, renameTag, RepoError, setTagColor } from '../db/repo';
import { DOT_CLASS } from '../lib/colors';
import { plural } from '../lib/format';
import type { TagWithCount } from '../lib/library';

type SortKey = 'name' | 'count';

function TagRow({ tag, onMerge, onDelete }: { tag: TagWithCount; onMerge: () => void; onDelete: () => void }) {
  const { library } = useLibrary();
  const { toast } = useUI();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);

  const save = async () => {
    const next = normalizeTagName(name);
    if (!next || next === tag.name) return setEditing(false);
    const existing = library.tags.find((t) => t.name === next);
    try {
      await renameTag(tag.id, next);
      toast(existing ? `Merged #${tag.name} into #${next}` : `Renamed to #${next}`);
      setEditing(false);
    } catch (err) {
      toast(err instanceof RepoError ? err.message : 'Could not rename the tag.', { tone: 'error' });
    }
  };

  return (
    <li className="group flex items-center gap-3 px-4 py-2.5">
      <Popover
        className="w-52"
        trigger={({ toggle }) => (
          <button
            className={clsx('size-4 shrink-0 rounded-full ring-offset-2 transition hover:ring-2 hover:ring-zinc-300 dark:ring-offset-zinc-900', DOT_CLASS[tag.color])}
            onClick={toggle}
            aria-label={`Change color of #${tag.name}`}
            title="Change color"
          />
        )}
      >
        {(close) => (
          <ColorPicker
            value={tag.color}
            onChange={(color) => {
              void setTagColor(tag.id, color);
              close();
            }}
          />
        )}
      </Popover>

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
                setName(tag.name);
                setEditing(false);
              }
            }}
            aria-label="Tag name"
          />
          <button className="icon-btn shrink-0" onClick={() => void save()} aria-label="Save">
            <Check className="size-4" />
          </button>
          <button className="icon-btn shrink-0" onClick={() => setEditing(false)} aria-label="Cancel">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <Link
          to={`/?tags=${encodeURIComponent(tag.name)}`}
          className="min-w-0 flex-1 truncate text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400"
          title={`Show bookmarks tagged #${tag.name}`}
        >
          #{tag.name}
        </Link>
      )}

      <span className="w-24 shrink-0 text-right text-xs text-zinc-500 tabular-nums">{plural(tag.count, 'bookmark')}</span>

      {!editing && (
        <div className="flex shrink-0 items-center opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <button className="icon-btn size-8" onClick={() => setEditing(true)} aria-label={`Rename #${tag.name}`} title="Rename">
            <Pencil className="size-3.5" />
          </button>
          <button className="icon-btn size-8" onClick={onMerge} aria-label={`Merge #${tag.name}`} title="Merge into another tag">
            <Merge className="size-3.5" />
          </button>
          <button
            className="icon-btn size-8 hover:text-red-600 dark:hover:text-red-400"
            onClick={onDelete}
            aria-label={`Delete #${tag.name}`}
            title="Delete"
          >
            <Trash className="size-3.5" />
          </button>
        </div>
      )}
    </li>
  );
}

export default function Tags() {
  const { library, loading } = useLibrary();
  const { toast } = useUI();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('count');
  const [merging, setMerging] = useState<TagWithCount | null>(null);
  const [mergeTarget, setMergeTarget] = useState<number | ''>('');
  const [deleting, setDeleting] = useState<TagWithCount | null>(null);

  const tags = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, '');
    return library.tags
      .filter((t) => t.name.includes(q))
      .sort((a, b) => (sort === 'count' ? b.count - a.count : 0) || a.name.localeCompare(b.name));
  }, [library.tags, query, sort]);

  const unused = library.tags.filter((t) => t.count === 0).length;

  const doMerge = async () => {
    if (!merging || mergeTarget === '') return;
    const target = library.tags.find((t) => t.id === mergeTarget);
    await mergeTags(merging.id, mergeTarget);
    toast(`Merged #${merging.name} into #${target?.name}`);
    setMerging(null);
    setMergeTarget('');
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          <Hash className="size-5 text-zinc-400" /> Tags
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Rename, recolor or merge tags. Renaming a tag to an existing name merges the two.
        </p>
      </div>

      {!loading && library.tags.length === 0 ? (
        <EmptyState icon={Hash} title="No tags yet" description="Add tags when saving a bookmark to group related links." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
              <input className="input pl-9" placeholder="Find a tag…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <button className="btn-secondary" onClick={() => setSort(sort === 'count' ? 'name' : 'count')}>
              <ArrowUpDown className="size-4" />
              {sort === 'count' ? 'Most used' : 'A–Z'}
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 text-xs text-zinc-500 dark:border-zinc-800">
              <span>{plural(library.tags.length, 'tag')}</span>
              {unused > 0 && <span>{unused} unused</span>}
            </div>
            {tags.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">No tags match “{query}”.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {tags.map((tag) => (
                  <TagRow key={tag.id} tag={tag} onMerge={() => setMerging(tag)} onDelete={() => setDeleting(tag)} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {merging && (
        <Modal
          title={`Merge #${merging.name}`}
          description={`All ${plural(merging.count, 'bookmark')} tagged #${merging.name} will get the tag you pick, and #${merging.name} will be deleted.`}
          onClose={() => setMerging(null)}
          size="sm"
          footer={
            <>
              <button className="btn-ghost" onClick={() => setMerging(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={() => void doMerge()} disabled={mergeTarget === ''}>
                <Merge className="size-4" /> Merge
              </button>
            </>
          }
        >
          <div className="px-5 pt-4 pb-5">
            <label htmlFor="merge-target" className="mb-1.5 block text-sm font-medium">
              Merge into
            </label>
            <select
              id="merge-target"
              className="input"
              value={mergeTarget}
              onChange={(e) => setMergeTarget(e.target.value ? Number(e.target.value) : '')}
              autoFocus
            >
              <option value="">Choose a tag…</option>
              {library.tags
                .filter((t) => t.id !== merging.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.name} ({t.count})
                  </option>
                ))}
            </select>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete #${deleting.name}?`}
          description={
            deleting.count > 0
              ? `It will be removed from ${plural(deleting.count, 'bookmark')}. The bookmarks themselves are kept.`
              : 'This tag isn’t used by any bookmark.'
          }
          confirmLabel="Delete tag"
          danger
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            void deleteTag(deleting.id).then(() => toast(`Deleted #${deleting.name}`));
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
