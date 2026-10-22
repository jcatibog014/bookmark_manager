import Dexie, { type EntityTable, type Table } from 'dexie';
import type { ColorName } from '../lib/colors';

// Relationships:
//   Collection 1 ── * Bookmark   (bookmark.collectionId, null = "Unsorted")
//   Bookmark   * ── * Tag        (through the BookmarkTag join table)

export interface Bookmark {
  id: number;
  url: string;
  /** Duplicate-detection key from normalizeUrl(); unique. */
  normalizedUrl: string;
  title: string;
  description: string;
  collectionId: number | null;
  isFavorite: boolean;
  visitCount: number;
  lastVisitedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Tag {
  id: number;
  /** Lowercase, unique. */
  name: string;
  color: ColorName;
}

export interface BookmarkTag {
  bookmarkId: number;
  tagId: number;
}

export interface Collection {
  id: number;
  name: string;
  color: ColorName;
  createdAt: number;
}

export class BookmarkDB extends Dexie {
  bookmarks!: EntityTable<Bookmark, 'id'>;
  tags!: EntityTable<Tag, 'id'>;
  bookmarkTags!: Table<BookmarkTag, [number, number]>;
  collections!: EntityTable<Collection, 'id'>;

  constructor(name = 'bookmark-manager') {
    super(name);
    this.version(1).stores({
      bookmarks: '++id, &normalizedUrl, collectionId, createdAt',
      tags: '++id, &name',
      bookmarkTags: '[bookmarkId+tagId], bookmarkId, tagId',
      collections: '++id, name',
    });
  }
}

export const db = new BookmarkDB();
