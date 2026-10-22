// All writes to the database go through these functions, so validation and
// relationship rules (tags, collections, cascades) live in one place.

import { colorForName, type ColorName } from '../lib/colors';
import { suggestTitle, validateUrl } from '../lib/url';
import { db, type Bookmark } from './db';

/** An error with a message that is safe to show to the user. */
export class RepoError extends Error {}

export interface BookmarkInput {
  url: string;
  title?: string;
  description?: string;
  tags?: string[];
  collectionId?: number | null;
  isFavorite?: boolean;
}

export interface BookmarkSnapshot {
  bookmark: Bookmark;
  tagIds: number[];
}

const ALL_TABLES = () => [db.bookmarks, db.tags, db.bookmarkTags, db.collections];

// ---------------------------------------------------------------- bookmarks

export async function findDuplicate(normalizedUrl: string, excludeId?: number): Promise<Bookmark | undefined> {
  const found = await db.bookmarks.where('normalizedUrl').equals(normalizedUrl).first();
  return found && found.id !== excludeId ? found : undefined;
}

export async function addBookmark(input: BookmarkInput): Promise<number> {
  const check = validateUrl(input.url);
  if (!check.ok) throw new RepoError(check.error);

  return db.transaction('rw', ALL_TABLES(), async () => {
    if (await findDuplicate(check.normalized)) throw new RepoError('This link is already saved.');
    const now = Date.now();
    const id = await db.bookmarks.add({
      url: check.url,
      normalizedUrl: check.normalized,
      title: input.title?.trim() || suggestTitle(check.url),
      description: input.description?.trim() ?? '',
      collectionId: input.collectionId ?? null,
      isFavorite: input.isFavorite ?? false,
      visitCount: 0,
      lastVisitedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    await setBookmarkTags(id, input.tags ?? []);
    return id;
  });
}

export async function updateBookmark(id: number, input: BookmarkInput): Promise<void> {
  const check = validateUrl(input.url);
  if (!check.ok) throw new RepoError(check.error);

  await db.transaction('rw', ALL_TABLES(), async () => {
    if (!(await db.bookmarks.get(id))) throw new RepoError('That bookmark no longer exists.');
    if (await findDuplicate(check.normalized, id)) throw new RepoError('Another bookmark already has this link.');
    await db.bookmarks.update(id, {
      url: check.url,
      normalizedUrl: check.normalized,
      title: input.title?.trim() || suggestTitle(check.url),
      description: input.description?.trim() ?? '',
      collectionId: input.collectionId ?? null,
      isFavorite: input.isFavorite ?? false,
      updatedAt: Date.now(),
    });
    if (input.tags) await setBookmarkTags(id, input.tags);
  });
}

/** Deletes bookmarks and their tag links. Returns snapshots so the delete can be undone. */
export async function deleteBookmarks(ids: number[]): Promise<BookmarkSnapshot[]> {
  return db.transaction('rw', db.bookmarks, db.bookmarkTags, async () => {
    const bookmarks = (await db.bookmarks.bulkGet(ids)).filter((b): b is Bookmark => !!b);
    const links = await db.bookmarkTags.where('bookmarkId').anyOf(ids).toArray();
    await db.bookmarkTags.where('bookmarkId').anyOf(ids).delete();
    await db.bookmarks.bulkDelete(ids);
    return bookmarks.map((bookmark) => ({
      bookmark,
      tagIds: links.filter((link) => link.bookmarkId === bookmark.id).map((link) => link.tagId),
    }));
  });
}

/** Undo for deleteBookmarks(). Skips links to tags/collections deleted in the meantime. */
export async function restoreBookmarks(snapshots: BookmarkSnapshot[]): Promise<void> {
  await db.transaction('rw', ALL_TABLES(), async () => {
    const tagIds = new Set(await db.tags.toCollection().primaryKeys());
    const collectionIds = new Set(await db.collections.toCollection().primaryKeys());
    for (const { bookmark, tagIds: linked } of snapshots) {
      if (await findDuplicate(bookmark.normalizedUrl, bookmark.id)) continue;
      const collectionId =
        bookmark.collectionId !== null && collectionIds.has(bookmark.collectionId) ? bookmark.collectionId : null;
      await db.bookmarks.put({ ...bookmark, collectionId });
      await db.bookmarkTags.bulkPut(
        linked.filter((tagId) => tagIds.has(tagId)).map((tagId) => ({ bookmarkId: bookmark.id, tagId })),
      );
    }
  });
}

export async function toggleFavorite(id: number): Promise<void> {
  await db.transaction('rw', db.bookmarks, async () => {
    const bookmark = await db.bookmarks.get(id);
    if (bookmark) await db.bookmarks.update(id, { isFavorite: !bookmark.isFavorite });
  });
}

export async function setFavorite(ids: number[], isFavorite: boolean): Promise<void> {
  await db.bookmarks.bulkUpdate(ids.map((key) => ({ key, changes: { isFavorite } })));
}

export async function recordVisit(id: number): Promise<void> {
  await db.transaction('rw', db.bookmarks, async () => {
    const bookmark = await db.bookmarks.get(id);
    if (bookmark) await db.bookmarks.update(id, { visitCount: bookmark.visitCount + 1, lastVisitedAt: Date.now() });
  });
}

export async function moveToCollection(ids: number[], collectionId: number | null): Promise<void> {
  await db.bookmarks.bulkUpdate(ids.map((key) => ({ key, changes: { collectionId } })));
}

// --------------------------------------------------------------------- tags

/** "#Web Dev " → "web-dev" */
export function normalizeTagName(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/[\s,]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}

/** Finds or creates tags by name and returns their ids. */
async function ensureTags(names: string[]): Promise<number[]> {
  const unique = [...new Set(names.map(normalizeTagName).filter(Boolean))];
  const ids: number[] = [];
  for (const name of unique) {
    const existing = await db.tags.where('name').equals(name).first();
    ids.push(existing ? existing.id : await db.tags.add({ name, color: colorForName(name) }));
  }
  return ids;
}

/** Replaces a bookmark's tags with the given names (many-to-many). */
export async function setBookmarkTags(bookmarkId: number, names: string[]): Promise<void> {
  await db.transaction('rw', db.tags, db.bookmarkTags, async () => {
    const tagIds = await ensureTags(names);
    await db.bookmarkTags.where('bookmarkId').equals(bookmarkId).delete();
    await db.bookmarkTags.bulkAdd(tagIds.map((tagId) => ({ bookmarkId, tagId })));
  });
}

/** Adds tags to many bookmarks without removing their existing tags. */
export async function addTagsToBookmarks(bookmarkIds: number[], names: string[]): Promise<void> {
  await db.transaction('rw', db.tags, db.bookmarkTags, async () => {
    const tagIds = await ensureTags(names);
    await db.bookmarkTags.bulkPut(bookmarkIds.flatMap((bookmarkId) => tagIds.map((tagId) => ({ bookmarkId, tagId }))));
  });
}

/** Moves every link from `sourceId` to `targetId`, then deletes the source tag. */
export async function mergeTags(sourceId: number, targetId: number): Promise<void> {
  if (sourceId === targetId) return;
  await db.transaction('rw', db.tags, db.bookmarkTags, async () => {
    if (!(await db.tags.get(targetId))) throw new RepoError('The tag to merge into no longer exists.');
    const links = await db.bookmarkTags.where('tagId').equals(sourceId).toArray();
    // The compound primary key [bookmarkId+tagId] makes bulkPut skip links that already exist.
    await db.bookmarkTags.bulkPut(links.map(({ bookmarkId }) => ({ bookmarkId, tagId: targetId })));
    await db.bookmarkTags.where('tagId').equals(sourceId).delete();
    await db.tags.delete(sourceId);
  });
}

/** Renames a tag. Renaming to an existing tag's name merges the two. Returns the surviving tag id. */
export async function renameTag(id: number, newName: string): Promise<number> {
  const name = normalizeTagName(newName);
  if (!name) throw new RepoError('Tag name cannot be empty.');
  return db.transaction('rw', db.tags, db.bookmarkTags, async () => {
    const existing = await db.tags.where('name').equals(name).first();
    if (existing && existing.id !== id) {
      await mergeTags(id, existing.id);
      return existing.id;
    }
    await db.tags.update(id, { name });
    return id;
  });
}

export async function setTagColor(id: number, color: ColorName): Promise<void> {
  await db.tags.update(id, { color });
}

/** Deletes a tag and its links. The bookmarks themselves are kept. */
export async function deleteTag(id: number): Promise<void> {
  await db.transaction('rw', db.tags, db.bookmarkTags, async () => {
    await db.bookmarkTags.where('tagId').equals(id).delete();
    await db.tags.delete(id);
  });
}

// -------------------------------------------------------------- collections

async function checkCollectionName(raw: string, excludeId?: number): Promise<string> {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) throw new RepoError('Collection name cannot be empty.');
  if (name.length > 40) throw new RepoError('Collection name is too long (max 40 characters).');
  const clash = await db.collections.where('name').equalsIgnoreCase(name).first();
  if (clash && clash.id !== excludeId) throw new RepoError(`A collection named "${clash.name}" already exists.`);
  return name;
}

export async function createCollection(rawName: string, color?: ColorName): Promise<number> {
  return db.transaction('rw', db.collections, async () => {
    const name = await checkCollectionName(rawName);
    return db.collections.add({ name, color: color ?? colorForName(name.toLowerCase()), createdAt: Date.now() });
  });
}

export async function renameCollection(id: number, rawName: string): Promise<void> {
  await db.transaction('rw', db.collections, async () => {
    const name = await checkCollectionName(rawName, id);
    await db.collections.update(id, { name });
  });
}

export async function setCollectionColor(id: number, color: ColorName): Promise<void> {
  await db.collections.update(id, { color });
}

export type DeleteCollectionMode = 'unsort' | 'cascade';

/**
 * Deletes a collection.
 * - 'unsort'  : its bookmarks stay, moved to Unsorted (collectionId = null)
 * - 'cascade' : its bookmarks (and their tag links) are deleted too
 * Returns how many bookmarks were affected.
 */
export async function deleteCollection(id: number, mode: DeleteCollectionMode): Promise<number> {
  return db.transaction('rw', ALL_TABLES(), async () => {
    const bookmarkIds = await db.bookmarks.where('collectionId').equals(id).primaryKeys();
    if (mode === 'cascade') {
      await db.bookmarkTags.where('bookmarkId').anyOf(bookmarkIds).delete();
      await db.bookmarks.bulkDelete(bookmarkIds);
    } else {
      await db.bookmarks.where('collectionId').equals(id).modify({ collectionId: null });
    }
    await db.collections.delete(id);
    return bookmarkIds.length;
  });
}

// ------------------------------------------------------------------- import

export interface ImportItem {
  url: string;
  title?: string;
  description?: string;
  tags?: string[];
  collection?: string | null;
  isFavorite?: boolean;
  createdAt?: number;
  visitCount?: number;
  lastVisitedAt?: number | null;
}

export interface ImportReport {
  added: number;
  duplicates: number;
  invalid: number;
}

/** Validates and de-duplicates each item; creates missing collections and tags. */
export async function importItems(items: ImportItem[]): Promise<ImportReport> {
  const report: ImportReport = { added: 0, duplicates: 0, invalid: 0 };
  await db.transaction('rw', ALL_TABLES(), async () => {
    const collectionIds = new Map<string, number>();
    for (const item of items) {
      const check = validateUrl(String(item.url ?? ''));
      if (!check.ok) {
        report.invalid++;
        continue;
      }
      if (await findDuplicate(check.normalized)) {
        report.duplicates++;
        continue;
      }

      let collectionId: number | null = null;
      const collectionName = item.collection?.trim();
      if (collectionName) {
        const key = collectionName.toLowerCase();
        if (!collectionIds.has(key)) {
          const existing = await db.collections.where('name').equalsIgnoreCase(collectionName).first();
          collectionIds.set(key, existing ? existing.id : await createCollection(collectionName));
        }
        collectionId = collectionIds.get(key)!;
      }

      const now = Date.now();
      const id = await db.bookmarks.add({
        url: check.url,
        normalizedUrl: check.normalized,
        title: item.title?.trim() || suggestTitle(check.url),
        description: item.description?.trim() ?? '',
        collectionId,
        isFavorite: !!item.isFavorite,
        visitCount: Math.max(0, Math.floor(Number(item.visitCount) || 0)),
        lastVisitedAt: typeof item.lastVisitedAt === 'number' ? item.lastVisitedAt : null,
        createdAt: typeof item.createdAt === 'number' && item.createdAt > 0 ? item.createdAt : now,
        updatedAt: now,
      });
      await setBookmarkTags(id, Array.isArray(item.tags) ? item.tags.map(String) : []);
      report.added++;
    }
  });
  return report;
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', ALL_TABLES(), async () => {
    await Promise.all(ALL_TABLES().map((table) => table.clear()));
  });
}
