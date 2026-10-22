import clsx from 'clsx';
import { ArrowUpDown, Calendar, Funnel, Globe, Hash, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { CHIP_CLASS, DOT_CLASS } from '../lib/colors';
import {
  countActiveFilters,
  DATE_LABELS,
  DATE_RANGES,
  SORT_LABELS,
  SORTS,
  type DateRange,
  type Filters,
  type SortKey,
  type TagMode,
} from '../lib/filter';
import { formatDate } from '../lib/format';
import type { Library } from '../lib/library';
import Popover from './Popover';
import TagChip from './TagChip';

interface FilterBarProps {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  library: Library;
  /** Search results are ranked by relevance, so sorting is disabled while searching. */
  searching: boolean;
}

const SELECT_ARROW = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a' stroke-width='2'%3e%3cpath d='m6 9 6 6 6-6'/%3e%3c/svg%3e\")",
};
const selectClass = 'input appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-8';

function TagModeToggle({ value, onChange }: { value: TagMode; onChange: (mode: TagMode) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 text-xs font-medium dark:bg-zinc-800" role="radiogroup" aria-label="Tag matching">
      {(['or', 'and'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={value === mode}
          onClick={() => onChange(mode)}
          className={clsx(
            'rounded-md px-2 py-1 transition',
            value === mode
              ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200',
          )}
          title={mode === 'or' ? 'Show bookmarks with any of the tags' : 'Show bookmarks with all of the tags'}
        >
          {mode === 'or' ? 'Match any' : 'Match all'}
        </button>
      ))}
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function ActiveChip({ icon, label, onRemove }: { icon: ReactNode; label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white py-0.5 pr-1 pl-2.5 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
      {icon}
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        aria-label={`Remove filter ${label}`}
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

export default function FilterBar({ filters, onChange, library, searching }: FilterBarProps) {
  const [tagQuery, setTagQuery] = useState('');
  const active = countActiveFilters(filters);
  const tagByName = new Map(library.tags.map((t) => [t.name, t]));
  const visibleTags = library.tags.filter((t) => t.name.includes(tagQuery.trim().toLowerCase()));

  const toggleTag = (name: string) =>
    onChange({ tags: filters.tags.includes(name) ? filters.tags.filter((t) => t !== name) : [...filters.tags, name] });

  const dateLabel =
    filters.date === 'custom'
      ? [filters.from && `from ${formatDate(new Date(filters.from + 'T00:00').getTime())}`, filters.to && `to ${formatDate(new Date(filters.to + 'T00:00').getTime())}`]
          .filter(Boolean)
          .join(' ') || 'Custom range'
      : DATE_LABELS[filters.date];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Popover
          className="w-80 max-w-[calc(100vw-2rem)]"
          trigger={({ open, toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              className={clsx('btn-secondary', active > 0 && 'border-indigo-300 dark:border-indigo-500/50')}
            >
              <Funnel className="size-4" />
              Filters
              {active > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-semibold text-white">
                  {active}
                </span>
              )}
            </button>
          )}
        >
          <div className="flex flex-col gap-5">
            <Section
              title="Tags"
              action={filters.tags.length > 1 && <TagModeToggle value={filters.tagMode} onChange={(tagMode) => onChange({ tagMode })} />}
            >
              {library.tags.length === 0 ? (
                <p className="text-sm text-zinc-500">No tags yet.</p>
              ) : (
                <>
                  {library.tags.length > 10 && (
                    <input
                      className="input py-1.5"
                      placeholder="Find a tag…"
                      value={tagQuery}
                      onChange={(e) => setTagQuery(e.target.value)}
                    />
                  )}
                  <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                    {visibleTags.map((tag) => {
                      const on = filters.tags.includes(tag.name);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.name)}
                          aria-pressed={on}
                          className={clsx(
                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
                            on
                              ? clsx(CHIP_CLASS[tag.color], 'border-transparent ring-2 ring-current/30')
                              : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800',
                          )}
                        >
                          <span className={clsx('size-1.5 rounded-full', DOT_CLASS[tag.color])} />#{tag.name}
                          <span className="opacity-50 tabular-nums">{tag.count}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              <label className="mt-1 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded accent-indigo-600"
                  checked={filters.untagged}
                  onChange={(e) => onChange({ untagged: e.target.checked, tags: e.target.checked ? [] : filters.tags })}
                />
                Only untagged bookmarks
              </label>
            </Section>

            <Section title="Website">
              <select
                className={selectClass}
                style={SELECT_ARROW}
                value={filters.domain ?? ''}
                onChange={(e) => onChange({ domain: e.target.value || null })}
                aria-label="Filter by website"
              >
                <option value="">Any website</option>
                {library.domains.map(({ domain, count }) => (
                  <option key={domain} value={domain}>
                    {domain} ({count})
                  </option>
                ))}
              </select>
            </Section>

            <Section title="Date added">
              <select
                className={selectClass}
                style={SELECT_ARROW}
                value={filters.date}
                onChange={(e) => onChange({ date: e.target.value as DateRange })}
                aria-label="Filter by date added"
              >
                {DATE_RANGES.map((range) => (
                  <option key={range} value={range}>
                    {DATE_LABELS[range]}
                  </option>
                ))}
              </select>
              {filters.date === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-zinc-500">
                    From
                    <input
                      type="date"
                      className="input mt-1 py-1.5"
                      value={filters.from ?? ''}
                      max={filters.to ?? undefined}
                      onChange={(e) => onChange({ from: e.target.value || null })}
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    To
                    <input
                      type="date"
                      className="input mt-1 py-1.5"
                      value={filters.to ?? ''}
                      min={filters.from ?? undefined}
                      onChange={(e) => onChange({ to: e.target.value || null })}
                    />
                  </label>
                </div>
              )}
            </Section>
          </div>
        </Popover>

        <div className="relative">
          <ArrowUpDown className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <select
            className={clsx(selectClass, 'w-auto py-2 pl-9')}
            style={SELECT_ARROW}
            value={searching ? '' : filters.sort}
            disabled={searching}
            onChange={(e) => onChange({ sort: e.target.value as SortKey })}
            aria-label="Sort bookmarks"
          >
            {searching && <option value="">Best match</option>}
            {SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {active > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.tags.map((name) => {
            const tag = tagByName.get(name);
            return (
              <TagChip key={name} name={name} color={tag?.color ?? 'slate'} size="md" onRemove={() => toggleTag(name)} />
            );
          })}
          {filters.tags.length > 1 && (
            <TagModeToggle value={filters.tagMode} onChange={(tagMode) => onChange({ tagMode })} />
          )}
          {filters.untagged && (
            <ActiveChip icon={<Hash className="size-3" />} label="Untagged" onRemove={() => onChange({ untagged: false })} />
          )}
          {filters.domain && (
            <ActiveChip icon={<Globe className="size-3" />} label={filters.domain} onRemove={() => onChange({ domain: null })} />
          )}
          {filters.date !== 'any' && (
            <ActiveChip
              icon={<Calendar className="size-3" />}
              label={dateLabel}
              onRemove={() => onChange({ date: 'any', from: null, to: null })}
            />
          )}
          <button
            type="button"
            className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            onClick={() => onChange({ tags: [], domain: null, date: 'any', from: null, to: null, untagged: false })}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
