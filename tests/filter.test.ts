import { describe, expect, it } from 'vitest';
import type { Tag } from '../src/db/db';
import {
  applyFilters,
  countActiveFilters,
  DEFAULT_FILTERS,
  findRelated,
  parseFilters,
  serializeFilters,
  sortBookmarks,
  type Filters,
} from '../src/lib/filter';
import type { BookmarkView } from '../src/lib/library';
import { createSearchIndex } from '../src/lib/search';

const NOW = new Date(2026, 9, 22, 12, 0, 0).getTime(); // Oct 22 2026, local noon
const DAY = 24 * 60 * 60 * 1000;

let nextId = 1;
const tag = (name: string): Tag => ({ id: name.length * 100 + name.charCodeAt(0), name, color: 'slate' });

function bm(partial: Partial<BookmarkView> & { title: string }): BookmarkView {
  const id = nextId++;
  return {
    id,
    url: `https://example.com/${id}`,
    normalizedUrl: `example.com/${id}`,
    description: '',
    collectionId: null,
    collection: null,
    isFavorite: false,
    visitCount: 0,
    lastVisitedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    domain: 'example.com',
    tags: [],
    ...partial,
  };
}

const react = bm({ title: 'React docs', domain: 'react.dev', tags: [tag('react'), tag('frontend'), tag('docs')], isFavorite: true, createdAt: NOW - 2 * DAY, visitCount: 10, lastVisitedAt: NOW - DAY });
const vue = bm({ title: 'Vue guide', domain: 'vuejs.org', tags: [tag('vue'), tag('frontend'), tag('docs')], createdAt: NOW - 20 * DAY, visitCount: 2, lastVisitedAt: NOW - 3 * DAY, collectionId: 1 });
const hooks = bm({ title: 'Hooks API reference', domain: 'react.dev', tags: [tag('react')], createdAt: NOW - 40 * DAY, collectionId: 1 });
const news = bm({ title: 'Hacker News', domain: 'news.ycombinator.com', createdAt: NOW - 1000 });
const all = [react, vue, hooks, news];

const filter = (f: Partial<Filters>) => applyFilters(all, { ...DEFAULT_FILTERS, ...f }, NOW).map((b) => b.title);

describe('applyFilters', () => {
  it('returns everything with default filters', () => {
    expect(filter({})).toHaveLength(4);
  });

  it('filters by sidebar view', () => {
    expect(filter({ view: 'favorites' })).toEqual(['React docs']);
    expect(filter({ view: 'recent' })).toEqual(['React docs', 'Vue guide']);
    expect(filter({ view: 'unsorted' })).toEqual(['React docs', 'Hacker News']);
  });

  it('filters by collection (one-to-many)', () => {
    expect(filter({ collectionId: 1 })).toEqual(['Vue guide', 'Hooks API reference']);
  });

  it('combines multiple tags with OR', () => {
    expect(filter({ tags: ['vue', 'react'], tagMode: 'or' })).toEqual(['React docs', 'Vue guide', 'Hooks API reference']);
  });

  it('combines multiple tags with AND', () => {
    expect(filter({ tags: ['react', 'docs'], tagMode: 'and' })).toEqual(['React docs']);
    expect(filter({ tags: ['frontend', 'docs'], tagMode: 'and' })).toEqual(['React docs', 'Vue guide']);
    expect(filter({ tags: ['react', 'vue'], tagMode: 'and' })).toEqual([]);
  });

  it('filters untagged bookmarks and by domain', () => {
    expect(filter({ untagged: true })).toEqual(['Hacker News']);
    expect(filter({ domain: 'react.dev' })).toEqual(['React docs', 'Hooks API reference']);
  });

  it('filters by date range', () => {
    expect(filter({ date: 'today' })).toEqual(['Hacker News']);
    expect(filter({ date: '7d' })).toEqual(['React docs', 'Hacker News']);
    expect(filter({ date: '30d' })).toEqual(['React docs', 'Vue guide', 'Hacker News']);
    // Custom range is inclusive of both whole days.
    expect(filter({ date: 'custom', from: '2026-10-02', to: '2026-10-20' })).toEqual(['React docs', 'Vue guide']);
    expect(filter({ date: 'custom', from: null, to: '2026-10-01' })).toEqual(['Hooks API reference']);
  });

  it('stacks filters together', () => {
    expect(filter({ view: 'favorites', tags: ['vue'] })).toEqual([]);
    expect(filter({ collectionId: 1, tags: ['react'] })).toEqual(['Hooks API reference']);
  });
});

describe('sortBookmarks', () => {
  const titles = (sort: Parameters<typeof sortBookmarks>[1]) => sortBookmarks(all, sort).map((b) => b.title);

  it('sorts by date, title and visits', () => {
    expect(titles('newest')).toEqual(['Hacker News', 'React docs', 'Vue guide', 'Hooks API reference']);
    expect(titles('oldest')).toEqual(['Hooks API reference', 'Vue guide', 'React docs', 'Hacker News']);
    expect(titles('title')).toEqual(['Hacker News', 'Hooks API reference', 'React docs', 'Vue guide']);
    expect(titles('most-visited').slice(0, 2)).toEqual(['React docs', 'Vue guide']);
    expect(titles('recently-visited').slice(0, 2)).toEqual(['React docs', 'Vue guide']);
  });

  it('does not mutate the input', () => {
    const before = all.map((b) => b.id);
    sortBookmarks(all, 'title');
    expect(all.map((b) => b.id)).toEqual(before);
  });
});

describe('URL query params', () => {
  it('round-trips filters through the URL', () => {
    const f: Filters = {
      ...DEFAULT_FILTERS,
      view: 'favorites',
      collectionId: 3,
      tags: ['react', 'docs'],
      tagMode: 'and',
      domain: 'react.dev',
      date: 'custom',
      from: '2026-01-01',
      to: '2026-02-01',
      untagged: false,
      q: 'hooks',
      sort: 'title',
    };
    expect(parseFilters(serializeFilters(f))).toEqual(f);
  });

  it('omits defaults to keep URLs short', () => {
    expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe('');
    expect(serializeFilters({ ...DEFAULT_FILTERS, view: 'recent', sort: 'recently-visited' }).toString()).toBe('view=recent');
  });

  it('ignores garbage values', () => {
    const f = parseFilters(new URLSearchParams('view=nope&collection=-4&sort=zzz&date=soon&from=yesterday&tags=,A,,a'));
    expect(f).toMatchObject({ view: 'all', collectionId: null, sort: 'newest', date: 'any', from: null, tags: ['a'] });
  });

  it('counts active refinements', () => {
    expect(countActiveFilters({ ...DEFAULT_FILTERS, tags: ['a', 'b'], domain: 'x.com', untagged: true })).toBe(4);
  });
});

describe('related bookmarks', () => {
  it('finds same-domain and 2+ shared-tag bookmarks, same site ranked higher', () => {
    const related = findRelated(react, all);
    expect(related.map((r) => r.bookmark.title)).toEqual(['Hooks API reference', 'Vue guide']);
    expect(related[0].sameDomain).toBe(true);
    expect(related[1].sharedTags.sort()).toEqual(['docs', 'frontend']);
    expect(findRelated(news, all)).toEqual([]);
  });
});

describe('fuzzy search', () => {
  it('tolerates typos and searches tags', () => {
    const index = createSearchIndex(all);
    expect(index.search('reakt docs')[0].item.title).toBe('React docs');
    expect(index.search('hoks')[0].item.title).toBe('Hooks API reference');
    expect(index.search('vue').map((r) => r.item.title)).toContain('Vue guide');
    expect(index.search('ycombinator')[0].item.title).toBe('Hacker News');
  });
});
