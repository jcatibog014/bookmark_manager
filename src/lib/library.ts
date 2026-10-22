// Joins the raw tables into view models the UI can render directly.

import type { Bookmark, BookmarkTag, Collection, Tag } from '../db/db';
import { getDomain } from './url';

export interface BookmarkView extends Bookmark {
  tags: Tag[];
  domain: string;
  collection: Collection | null;
}

export interface TagWithCount extends Tag {
  count: number;
}

export interface CollectionWithCount extends Collection {
  count: number;
}

export interface DomainCount {
  domain: string;
  count: number;
}

export interface Library {
  bookmarks: BookmarkView[];
  tags: TagWithCount[];
  collections: CollectionWithCount[];
  domains: DomainCount[];
  byId: Map<number, BookmarkView>;
  byNormalizedUrl: Map<string, BookmarkView>;
}

export interface RawLibrary {
  bookmarks: Bookmark[];
  tags: Tag[];
  links: BookmarkTag[];
  collections: Collection[];
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

export function buildLibrary({ bookmarks, tags, links, collections }: RawLibrary): Library {
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const collectionById = new Map(collections.map((c) => [c.id, c]));

  const tagsByBookmark = new Map<number, Tag[]>();
  const tagCounts = new Map<number, number>();
  for (const { bookmarkId, tagId } of links) {
    const tag = tagById.get(tagId);
    if (!tag) continue;
    const list = tagsByBookmark.get(bookmarkId) ?? [];
    list.push(tag);
    tagsByBookmark.set(bookmarkId, list);
    tagCounts.set(tagId, (tagCounts.get(tagId) ?? 0) + 1);
  }

  const collectionCounts = new Map<number, number>();
  const domainCounts = new Map<string, number>();
  const views: BookmarkView[] = bookmarks.map((bookmark) => {
    const domain = getDomain(bookmark.url);
    domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
    if (bookmark.collectionId !== null) {
      collectionCounts.set(bookmark.collectionId, (collectionCounts.get(bookmark.collectionId) ?? 0) + 1);
    }
    return {
      ...bookmark,
      domain,
      tags: (tagsByBookmark.get(bookmark.id) ?? []).sort(byName),
      collection: bookmark.collectionId !== null ? (collectionById.get(bookmark.collectionId) ?? null) : null,
    };
  });

  return {
    bookmarks: views,
    tags: tags.map((tag) => ({ ...tag, count: tagCounts.get(tag.id) ?? 0 })).sort(byName),
    collections: collections.map((c) => ({ ...c, count: collectionCounts.get(c.id) ?? 0 })).sort(byName),
    domains: [...domainCounts]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain)),
    byId: new Map(views.map((v) => [v.id, v])),
    byNormalizedUrl: new Map(views.map((v) => [v.normalizedUrl, v])),
  };
}

export const EMPTY_LIBRARY: Library = buildLibrary({ bookmarks: [], tags: [], links: [], collections: [] });
