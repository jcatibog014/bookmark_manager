import Fuse, { type FuseResult, type RangeTuple } from 'fuse.js';
import type { BookmarkView } from './library';

export type SearchResult = FuseResult<BookmarkView>;

/** Fuzzy search index over title, domain, tags, URL and notes (typo-tolerant). */
export function createSearchIndex(items: BookmarkView[]): Fuse<BookmarkView> {
  return new Fuse(items, {
    keys: [
      { name: 'title', weight: 3 },
      { name: 'domain', weight: 2 },
      { name: 'tags.name', weight: 2 },
      { name: 'url', weight: 1 },
      { name: 'description', weight: 1 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
    includeMatches: true,
    minMatchCharLength: 2,
  });
}

/** Character ranges in `key` that matched, for highlighting. */
export function matchRanges(result: SearchResult | undefined, key: string): readonly RangeTuple[] {
  return result?.matches?.find((m) => m.key === key)?.indices ?? [];
}
