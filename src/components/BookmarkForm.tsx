import clsx from 'clsx';
import { CircleAlert, CircleCheck, Link2, LoaderCircle, Star } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useLibrary } from '../context/library';
import { useUI, type EditorState } from '../context/ui';
import { addBookmark, RepoError, updateBookmark } from '../db/repo';
import { useDebounced } from '../hooks/useDebounced';
import { suggestTitle, validateUrl } from '../lib/url';
import CollectionSelect from './CollectionSelect';
import Favicon from './Favicon';
import Modal from './Modal';
import TagInput from './TagInput';

export default function BookmarkForm({ editor }: { editor: EditorState }) {
  const { library } = useLibrary();
  const { closeEditor, openEditor, toast } = useUI();
  const existing = editor.id !== undefined ? library.byId.get(editor.id) : undefined;

  const [url, setUrl] = useState(existing?.url ?? editor.url ?? '');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [tags, setTags] = useState<string[]>(existing?.tags.map((t) => t.name) ?? []);
  const [collectionId, setCollectionId] = useState<number | null>(
    existing ? existing.collectionId : (editor.collectionId ?? null),
  );
  const [isFavorite, setIsFavorite] = useState(existing?.isFavorite ?? false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Validate as the user types, but only show the result once they pause.
  const debouncedUrl = useDebounced(url, 300);
  const settled = debouncedUrl === url;
  const check = useMemo(() => validateUrl(debouncedUrl), [debouncedUrl]);
  const duplicate = check.ok ? library.byNormalizedUrl.get(check.normalized) : undefined;
  const isDuplicate = !!duplicate && duplicate.id !== editor.id;

  const showError = !check.ok && settled && (url.trim() !== '' || submitted);
  const showValid = check.ok && settled && !isDuplicate;
  const titlePlaceholder = check.ok ? suggestTitle(check.url) : 'Page title';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setSaveError(null);
    const finalCheck = validateUrl(url);
    if (!finalCheck.ok || isDuplicate) return;

    setSaving(true);
    try {
      const input = { url, title, description, tags, collectionId, isFavorite };
      if (existing) {
        await updateBookmark(existing.id, input);
        toast('Bookmark updated');
      } else {
        await addBookmark(input);
        toast('Bookmark saved');
      }
      closeEditor();
    } catch (err) {
      setSaveError(err instanceof RepoError ? err.message : 'Something went wrong while saving.');
      setSaving(false);
    }
  };

  if (editor.id !== undefined && !existing) {
    return (
      <Modal title="Bookmark not found" onClose={closeEditor} size="sm">
        <p className="px-5 pt-2 pb-5 text-sm text-zinc-500">It may have been deleted.</p>
      </Modal>
    );
  }

  return (
    <Modal
      title={existing ? 'Edit bookmark' : 'Add bookmark'}
      description={existing ? undefined : 'Paste a link. We’ll check it and suggest a title.'}
      onClose={closeEditor}
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={closeEditor}>
            Cancel
          </button>
          <button type="submit" form="bookmark-form" className="btn-primary" disabled={saving}>
            {saving && <LoaderCircle className="size-4 animate-spin" />}
            {existing ? 'Save changes' : 'Save bookmark'}
          </button>
        </>
      }
    >
      <form id="bookmark-form" onSubmit={submit} className="flex flex-col gap-4 px-5 pt-4 pb-5" noValidate>
        {/* URL */}
        <div>
          <label htmlFor="bm-url" className="mb-1.5 block text-sm font-medium">
            URL
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2">
              {check.ok ? (
                <Favicon domain={check.domain} className="size-6 rounded-md" />
              ) : (
                <span className="flex size-6 items-center justify-center text-zinc-400">
                  <Link2 className="size-4" />
                </span>
              )}
            </span>
            <input
              id="bm-url"
              className={clsx(
                'input pr-9 pl-10',
                showError && 'border-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500/60',
                isDuplicate && settled && 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/15',
              )}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              autoFocus={!existing}
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={showError}
              aria-describedby="bm-url-hint"
            />
            <span className="absolute top-1/2 right-3 -translate-y-1/2">
              {showValid && <CircleCheck className="size-4 text-emerald-500" aria-label="Valid URL" />}
              {showError && <CircleAlert className="size-4 text-red-500" aria-hidden />}
            </span>
          </div>
          <div id="bm-url-hint" className="mt-1.5 min-h-5 text-xs" aria-live="polite">
            {showError && !check.ok && <p className="text-red-600 dark:text-red-400">{check.error}</p>}
            {showValid && check.ok && <p className="text-zinc-500">Will be saved as {check.url}</p>}
            {isDuplicate && settled && duplicate && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-amber-50 px-2.5 py-2 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                <CircleAlert className="size-3.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  Already saved as <strong className="font-semibold">“{duplicate.title}”</strong>
                </span>
                <button
                  type="button"
                  className="font-semibold underline-offset-2 hover:underline"
                  onClick={() => openEditor({ id: duplicate.id })}
                >
                  Open existing
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="bm-title" className="mb-1.5 block text-sm font-medium">
            Title <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <input
            id="bm-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={titlePlaceholder}
            maxLength={200}
            autoFocus={!!existing}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="bm-description" className="mb-1.5 block text-sm font-medium">
            Notes <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <textarea
            id="bm-description"
            className="input min-h-20 resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Why is this worth saving?"
            maxLength={1000}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="bm-collection" className="mb-1.5 block text-sm font-medium">
              Collection
            </label>
            <CollectionSelect id="bm-collection" value={collectionId} onChange={setCollectionId} />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium">Favorite</span>
            <button
              type="button"
              onClick={() => setIsFavorite((v) => !v)}
              aria-pressed={isFavorite}
              className={clsx(
                'btn w-full justify-start border',
                isFavorite
                  ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800',
              )}
            >
              <Star className={clsx('size-4', isFavorite && 'fill-amber-400 text-amber-400')} />
              {isFavorite ? 'In favorites' : 'Add to favorites'}
            </button>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="bm-tags" className="mb-1.5 block text-sm font-medium">
            Tags
          </label>
          <TagInput id="bm-tags" value={tags} onChange={setTags} suggestions={library.tags} />
        </div>

        {saveError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {saveError}
          </p>
        )}
      </form>
    </Modal>
  );
}
