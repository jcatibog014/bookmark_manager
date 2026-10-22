import clsx from 'clsx';
import { LayoutGrid, List, Rows3, type LucideIcon } from 'lucide-react';
import { useUI, type ViewMode } from '../context/ui';

const OPTIONS: { mode: ViewMode; icon: LucideIcon; label: string }[] = [
  { mode: 'grid', icon: LayoutGrid, label: 'Grid view' },
  { mode: 'list', icon: List, label: 'List view' },
  { mode: 'compact', icon: Rows3, label: 'Compact view' },
];

export default function ViewToggle() {
  const { viewMode, setViewMode } = useUI();
  return (
    <div className="hidden items-center rounded-xl border border-zinc-200 bg-white p-0.5 sm:flex dark:border-zinc-800 dark:bg-zinc-900">
      {OPTIONS.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          title={label}
          aria-label={label}
          aria-pressed={viewMode === mode}
          className={clsx(
            'flex size-8 items-center justify-center rounded-[10px] transition',
            viewMode === mode
              ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
              : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200',
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
