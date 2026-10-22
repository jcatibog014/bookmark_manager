import clsx from 'clsx';
import {
  Download,
  FileDown,
  FileUp,
  Keyboard,
  LayoutGrid,
  List,
  LoaderCircle,
  Monitor,
  Moon,
  Rows3,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  Trash,
  type LucideIcon,
} from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';
import { useLibrary } from '../context/library';
import { useUI, type ViewMode } from '../context/ui';
import { applyColors, clearAllData, importItems, type ImportReport } from '../db/repo';
import { SAMPLE_BOOKMARKS } from '../db/sample';
import type { Theme } from '../hooks/useTheme';
import { plural, toISODate } from '../lib/format';
import { buildHtmlExport, buildJsonExport, downloadFile, parseImportFile } from '../lib/importExport';

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; icon: LucideIcon }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
      {options.map(({ value: v, label: l, icon: Icon }) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={clsx(
            'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition',
            value === v
              ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200',
          )}
        >
          <Icon className="size-4" />
          {l}
        </button>
      ))}
    </div>
  );
}

export default function Settings() {
  const { library } = useLibrary();
  const { theme, setTheme, viewMode, setViewMode, toast, setHelpOpen } = useUI();
  const fileInput = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<(ImportReport & { fileName: string }) | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const stamp = toISODate(Date.now());
  const empty = library.bookmarks.length === 0;

  const onFile = async (file: File) => {
    setImporting(true);
    setReport(null);
    setImportError(null);
    try {
      const parsed = parseImportFile(file.name, await file.text());
      const result = await importItems(parsed.items);
      await applyColors(parsed.tagColors, parsed.collectionColors);
      setReport({ ...result, fileName: file.name });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not import this file.');
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          <SettingsIcon className="size-5 text-zinc-400" /> Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Your bookmarks are stored privately in this browser. Export a backup to move them elsewhere.
        </p>
      </div>

      <Card title="Appearance">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium">Theme</span>
            <Segmented<Theme>
              label="Theme"
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Monitor },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium">Bookmark layout</span>
            <Segmented<ViewMode>
              label="Bookmark layout"
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'grid', label: 'Grid', icon: LayoutGrid },
                { value: 'list', label: 'List', icon: List },
                { value: 'compact', label: 'Compact', icon: Rows3 },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium">Keyboard shortcuts</span>
            <button className="btn-secondary" onClick={() => setHelpOpen(true)}>
              <Keyboard className="size-4" /> View shortcuts
            </button>
          </div>
        </div>
      </Card>

      <Card
        title="Import"
        description="Bring in a backup from this app (.json) or bookmarks exported from Chrome, Edge, Firefox or Safari (.html). Every link is validated and duplicates are skipped."
      >
        <input
          ref={fileInput}
          type="file"
          accept=".json,.html,.htm,application/json,text/html"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
          }}
          aria-label="Choose a file to import"
        />
        <button className="btn-secondary" onClick={() => fileInput.current?.click()} disabled={importing}>
          {importing ? <LoaderCircle className="size-4 animate-spin" /> : <FileUp className="size-4" />}
          {importing ? 'Importing…' : 'Choose file…'}
        </button>

        {report && (
          <div className="mt-4 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60" role="status">
            <p className="text-sm font-medium">Imported {report.fileName}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {(
                [
                  ['Added', report.added, 'text-emerald-600 dark:text-emerald-400'],
                  ['Duplicates', report.duplicates, 'text-amber-600 dark:text-amber-400'],
                  ['Invalid', report.invalid, 'text-red-600 dark:text-red-400'],
                ] as const
              ).map(([label, value, color]) => (
                <div key={label} className="rounded-lg bg-white py-2 dark:bg-zinc-900">
                  <div className={clsx('text-xl font-semibold tabular-nums', color)}>{value}</div>
                  <div className="text-xs text-zinc-500">{label}</div>
                </div>
              ))}
            </div>
            {(report.duplicates > 0 || report.invalid > 0) && (
              <p className="mt-3 text-xs text-zinc-500">
                Duplicates are links you already had. Invalid entries weren’t http(s) links (for example bookmarklets).
              </p>
            )}
          </div>
        )}
        {importError && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300" role="alert">
            {importError}
          </p>
        )}
      </Card>

      <Card title="Export" description="Download all your bookmarks.">
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-secondary"
            disabled={empty}
            onClick={() => {
              downloadFile(`bookmarks-${stamp}.json`, JSON.stringify(buildJsonExport(library), null, 2), 'application/json');
              toast('Backup downloaded');
            }}
          >
            <Download className="size-4" /> Backup (.json)
          </button>
          <button
            className="btn-secondary"
            disabled={empty}
            onClick={() => {
              downloadFile(`bookmarks-${stamp}.html`, buildHtmlExport(library), 'text/html');
              toast('Bookmarks file downloaded');
            }}
          >
            <FileDown className="size-4" /> Browser format (.html)
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          The JSON backup keeps everything (tags, colors, favorites, visit counts). The HTML file can be imported into any
          browser; collections become folders.
        </p>
      </Card>

      <Card title="Data">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {plural(library.bookmarks.length, 'bookmark')} · {plural(library.tags.length, 'tag')} ·{' '}
            {plural(library.collections.length, 'collection')}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary"
              onClick={async () => {
                const result = await importItems(SAMPLE_BOOKMARKS);
                toast(result.added ? `Added ${plural(result.added, 'sample bookmark')}` : 'Sample bookmarks are already loaded', {
                  tone: result.added ? 'success' : 'info',
                });
              }}
            >
              <Sparkles className="size-4" /> Load sample bookmarks
            </button>
            <button
              className="btn-secondary text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              onClick={() => setConfirmClear(true)}
              disabled={empty && library.tags.length === 0 && library.collections.length === 0}
            >
              <Trash className="size-4" /> Delete all data
            </button>
          </div>
        </div>
      </Card>

      {confirmClear && (
        <ConfirmDialog
          title="Delete everything?"
          description={`This permanently removes ${plural(library.bookmarks.length, 'bookmark')}, ${plural(library.tags.length, 'tag')} and ${plural(library.collections.length, 'collection')}. Consider exporting a backup first.`}
          confirmLabel="Delete everything"
          danger
          onClose={() => setConfirmClear(false)}
          onConfirm={() => {
            void clearAllData().then(() => toast('All data deleted', { tone: 'info' }));
            setConfirmClear(false);
          }}
        />
      )}
    </div>
  );
}
