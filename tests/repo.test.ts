import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/db/db';
import {
  addBookmark,
  addTagsToBookmarks,
  clearAllData,
  createCollection,
  deleteBookmarks,
  deleteCollection,
  deleteTag,
  importItems,
  mergeTags,
  normalizeTagName,
  renameCollection,
  renameTag,
  restoreBookmarks,
  updateBookmark,
} from '../src/db/repo';

async function tagNamesOf(bookmarkId: number): Promise<string[]> {
  const links = await db.bookmarkTags.where('bookmarkId').equals(bookmarkId).toArray();
  const tags = await db.tags.bulkGet(links.map((l) => l.tagId));
  return tags.map((t) => t!.name).sort();
}

beforeEach(async () => {
  await clearAllData();
});

describe('bookmarks', () => {
  it('validates, normalizes and auto-titles a new bookmark', async () => {
    const id = await addBookmark({ url: 'www.example.com/hello-world?utm_source=x', tags: ['#Web Dev', 'web-dev'] });
    const saved = await db.bookmarks.get(id);
    expect(saved).toMatchObject({
      url: 'https://www.example.com/hello-world',
      normalizedUrl: 'example.com/hello-world',
      title: 'Hello world · Example',
      isFavorite: false,
      collectionId: null,
    });
    expect(await tagNamesOf(id)).toEqual(['web-dev']);
  });

  it('rejects invalid URLs and duplicates', async () => {
    await expect(addBookmark({ url: 'javascript:alert(1)' })).rejects.toThrow(/http/);
    await addBookmark({ url: 'https://example.com/docs' });
    await expect(addBookmark({ url: 'http://www.example.com/docs/' })).rejects.toThrow(/already saved/);
    expect(await db.bookmarks.count()).toBe(1);
  });

  it('blocks editing a bookmark into a duplicate of another', async () => {
    await addBookmark({ url: 'a.com' });
    const b = await addBookmark({ url: 'b.com' });
    await expect(updateBookmark(b, { url: 'https://a.com/' })).rejects.toThrow(/already has this link/);
    await updateBookmark(b, { url: 'b.com/new', title: 'B', tags: ['x'] });
    expect((await db.bookmarks.get(b))!.title).toBe('B');
    expect(await tagNamesOf(b)).toEqual(['x']);
  });

  it('can undo a delete, including tag links', async () => {
    const id = await addBookmark({ url: 'a.com', tags: ['one', 'two'] });
    const snapshots = await deleteBookmarks([id]);
    expect(await db.bookmarks.count()).toBe(0);
    expect(await db.bookmarkTags.count()).toBe(0);
    await restoreBookmarks(snapshots);
    expect((await db.bookmarks.get(id))!.url).toBe('https://a.com/');
    expect(await tagNamesOf(id)).toEqual(['one', 'two']);
  });
});

describe('tags (many-to-many)', () => {
  it('normalizes tag names', () => {
    expect(normalizeTagName('  #Web   Dev ')).toBe('web-dev');
    expect(normalizeTagName('---')).toBe('');
  });

  it('shares one tag row between many bookmarks', async () => {
    const a = await addBookmark({ url: 'a.com', tags: ['news'] });
    const b = await addBookmark({ url: 'b.com', tags: ['News'] });
    expect(await db.tags.count()).toBe(1);
    expect(await tagNamesOf(a)).toEqual(['news']);
    expect(await tagNamesOf(b)).toEqual(['news']);
  });

  it('adds tags in bulk without removing existing ones', async () => {
    const a = await addBookmark({ url: 'a.com', tags: ['keep'] });
    const b = await addBookmark({ url: 'b.com' });
    await addTagsToBookmarks([a, b], ['new']);
    expect(await tagNamesOf(a)).toEqual(['keep', 'new']);
    expect(await tagNamesOf(b)).toEqual(['new']);
  });

  it('merges tags without creating duplicate links', async () => {
    const a = await addBookmark({ url: 'a.com', tags: ['js', 'javascript'] });
    const b = await addBookmark({ url: 'b.com', tags: ['js'] });
    const js = (await db.tags.where('name').equals('js').first())!;
    const javascript = (await db.tags.where('name').equals('javascript').first())!;

    await mergeTags(js.id, javascript.id);

    expect(await db.tags.get(js.id)).toBeUndefined();
    expect(await tagNamesOf(a)).toEqual(['javascript']);
    expect(await tagNamesOf(b)).toEqual(['javascript']);
    expect(await db.bookmarkTags.count()).toBe(2);
  });

  it('renaming a tag to an existing name merges them', async () => {
    const a = await addBookmark({ url: 'a.com', tags: ['reactjs'] });
    await addBookmark({ url: 'b.com', tags: ['react'] });
    const reactjs = (await db.tags.where('name').equals('reactjs').first())!;
    const survivor = await renameTag(reactjs.id, 'React');
    expect((await db.tags.get(survivor))!.name).toBe('react');
    expect(await db.tags.count()).toBe(1);
    expect(await tagNamesOf(a)).toEqual(['react']);
  });

  it('deleting a tag keeps its bookmarks', async () => {
    const a = await addBookmark({ url: 'a.com', tags: ['temp'] });
    const temp = (await db.tags.where('name').equals('temp').first())!;
    await deleteTag(temp.id);
    expect(await db.bookmarks.get(a)).toBeDefined();
    expect(await tagNamesOf(a)).toEqual([]);
  });
});

describe('collections (one-to-many)', () => {
  it('enforces unique, non-empty names (case-insensitive)', async () => {
    const id = await createCollection('Work');
    await expect(createCollection('  work ')).rejects.toThrow(/already exists/);
    await expect(createCollection('   ')).rejects.toThrow(/empty/);
    await renameCollection(id, 'WORK'); // renaming itself is fine
    expect((await db.collections.get(id))!.name).toBe('WORK');
  });

  it("delete with 'unsort' keeps bookmarks and clears their collection", async () => {
    const work = await createCollection('Work');
    const a = await addBookmark({ url: 'a.com', collectionId: work });
    expect(await deleteCollection(work, 'unsort')).toBe(1);
    expect((await db.bookmarks.get(a))!.collectionId).toBeNull();
  });

  it("delete with 'cascade' removes bookmarks and their tag links", async () => {
    const work = await createCollection('Work');
    await addBookmark({ url: 'a.com', collectionId: work, tags: ['x'] });
    const other = await addBookmark({ url: 'b.com', tags: ['x'] });
    expect(await deleteCollection(work, 'cascade')).toBe(1);
    expect(await db.bookmarks.toCollection().primaryKeys()).toEqual([other]);
    expect(await db.bookmarkTags.count()).toBe(1);
  });
});

describe('import', () => {
  it('reports added, duplicate and invalid items', async () => {
    await addBookmark({ url: 'already.com' });
    const report = await importItems([
      { url: 'https://new.com', tags: ['a'], collection: 'Reading' },
      { url: 'https://other.com', collection: 'reading' },
      { url: 'http://www.already.com/' },
      { url: 'https://new.com/' },
      { url: 'not a url' },
      { url: 'javascript:alert(1)' },
    ]);
    expect(report).toEqual({ added: 2, duplicates: 2, invalid: 2 });
    expect(await db.collections.count()).toBe(1);
  });
});
