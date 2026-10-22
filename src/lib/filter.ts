// Filtering & sorting — pure functions over BookmarkView[], so they're easy to test.
// Filter state lives in the URL query string (parseFilters / serializeFilters),
// which makes every filtered view shareable and refresh-proof.

import type { BookmarkView } from './library';

export const VIEWS = ['all', 'favorites', 'recent', 'unsorted'] as const;
export type View = (typeof VIEWS)[number];

export const SORTS = ['newest', 'oldest', 'title', 'most-visited', 'recently-visited'] as const;
export type SortKey = (typeof SORTS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  title: 'Title A–Z',
  'most-visited': 'Most visited',
  'recently-visited': 'Recently opened',
};

export const DATE_RANGES = ['any', 'today', '7d', '30d', 'custom'] as const;
export type DateRange = (typeof DATE_RANGES)[number];

export const DATE_LABELS: Record<DateRange, string> = {
  any: 'Any time',
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  custom: 'Custom range',
};

export type TagMode = 'and' | 'or';

export interface Filters {
  view: View;
  collectionId: number | null;
  tags: string[];
  tagMode: TagMode;
  domain: string | null;
  date: DateRange;
  /** yyyy-mm-dd, only used when date === 'custom'. */
  from: string | null;
  to: string | null;
  untagged: boolean;
  q: string;
  sort: SortKey;
}

export const DEFAULT_FILTERS: Filters = {
  view: 'all',
  collectionId: null,
  tags: [],
  tagMode: 'or',
  domain: null,
  date: 'any',
  from: null,
  to: null,
  untagged: false,
  q: '',
  sort: 'newest',
};

const DAY = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The "Recently opened" view sorts by last visit unless the user picks something else. */
export function defaultSortFor(view: View): SortKey {
  return view === 'recent' ? 'recently-visited' : 'newest';
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function parseFilters(params: URLSearchParams): Filters {
  const view = oneOf(params.get('view'), VIEWS, 'all');
  const collection = Number(params.get('collection'));
  const from = params.get('from');
  const to = params.get('to');
  return {
    view,
    collectionId: Number.isInteger(collection) && collection > 0 ? collection : null,
    tags: [
      ...new Set(
        (params.get('tags') ?? '')
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ),
    ],
    tagMode: params.get('mode') === 'and' ? 'and' : 'or',
    domain: params.get('domain') || null,
    date: oneOf(params.get('date'), DATE_RANGES, 'any'),
    from: from && ISO_DATE.test(from) ? from : null,
    to: to && ISO_DATE.test(to) ? to : null,
    untagged: params.get('untagged') === '1',
    q: params.get('q') ?? '',
    sort: oneOf(params.get('sort'), SORTS, defaultSortFor(view)),
  };
}

/** Only non-default values are written, so URLs stay short. */
export function serializeFilters(f: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.view !== 'all') params.set('view', f.view);
  if (f.collectionId !== null) params.set('collection', String(f.collectionId));
  if (f.tags.length) params.set('tags', f.tags.join(','));
  if (f.tags.length > 1 && f.tagMode === 'and') params.set('mode', 'and');
  if (f.domain) params.set('domain', f.domain);
  if (f.date !== 'any') params.set('date', f.date);
  if (f.date === 'custom' && f.from) params.set('from', f.from);
  if (f.date === 'custom' && f.to) params.set('to', f.to);
  if (f.untagged) params.set('untagged', '1');
  if (f.q.trim()) params.set('q', f.q);
  if (f.sort !== defaultSortFor(f.view)) params.set('sort', f.sort);
  return params;
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Inclusive [start, end] timestamps for the date filter, or nulls for "no bound". */
export function dateBounds(f: Pick<Filters, 'date' | 'from' | 'to'>, now = Date.now()) {
  switch (f.date) {
    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start: start.getTime(), end: null };
    }
    case '7d':
      return { start: now - 7 * DAY, end: null };
    case '30d':
      return { start: now - 30 * DAY, end: null };
    case 'custom': {
      const start = f.from ? parseLocalDate(f.from).getTime() : null;
      const end = f.to ? parseLocalDate(f.to).getTime() + DAY - 1 : null;
      return { start, end };
    }
    default:
      return { start: null, end: null };
  }
}

export function applyFilters(items: BookmarkView[], f: Filters, now = Date.now()): BookmarkView[] {
  const { start, end } = dateBounds(f, now);
  const wanted = f.tags;

  return items.filter((b) => {
    if (f.view === 'favorites' && !b.isFavorite) return false;
    if (f.view === 'recent' && b.lastVisitedAt === null) return false;
    if (f.view === 'unsorted' && b.collectionId !== null) return false;
    if (f.collectionId !== null && b.collectionId !== f.collectionId) return false;
    if (f.domain && b.domain !== f.domain) return false;
    if (start !== null && b.createdAt < start) return false;
    if (end !== null && b.createdAt > end) return false;
    if (f.untagged && b.tags.length > 0) return false;
    if (wanted.length) {
      const names = new Set(b.tags.map((t) => t.name));
      const hit = f.tagMode === 'and' ? wanted.every((t) => names.has(t)) : wanted.some((t) => names.has(t));
      if (!hit) return false;
    }
    return true;
  });
}

export function sortBookmarks(items: BookmarkView[], sort: SortKey): BookmarkView[] {
  const sorted = [...items];
  const newest = (a: BookmarkView, b: BookmarkView) => b.createdAt - a.createdAt || b.id - a.id;
  switch (sort) {
    case 'oldest':
      return sorted.sort((a, b) => -newest(a, b));
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    case 'most-visited':
      return sorted.sort((a, b) => b.visitCount - a.visitCount || newest(a, b));
    case 'recently-visited':
      return sorted.sort((a, b) => (b.lastVisitedAt ?? 0) - (a.lastVisitedAt ?? 0) || newest(a, b));
    default:
      return sorted.sort(newest);
  }
}

/** Number of refinements on top of the view/collection scope (used for the "Filters" badge). */
export function countActiveFilters(f: Filters): number {
  return f.tags.length + (f.domain ? 1 : 0) + (f.date !== 'any' ? 1 : 0) + (f.untagged ? 1 : 0);
}

export interface RelatedBookmark {
  bookmark: BookmarkView;
  sameDomain: boolean;
  sharedTags: string[];
}

/** Bookmarks on the same site or sharing at least two tags, best matches first. */
export function findRelated(target: BookmarkView, all: BookmarkView[], limit = 5): RelatedBookmark[] {
  const targetTags = new Set(target.tags.map((t) => t.name));
  return all
    .filter((b) => b.id !== target.id)
    .map((b) => ({
      bookmark: b,
      sameDomain: b.domain === target.domain,
      sharedTags: b.tags.map((t) => t.name).filter((name) => targetTags.has(name)),
    }))
    .filter((r) => r.sameDomain || r.sharedTags.length >= 2)
    .sort(
      (a, b) =>
        b.sharedTags.length * 2 + Number(b.sameDomain) * 3 - (a.sharedTags.length * 2 + Number(a.sameDomain) * 3) ||
        b.bookmark.createdAt - a.bookmark.createdAt,
    )
    .slice(0, limit);
}
