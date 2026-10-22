// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/db/db';
import { addBookmark, clearAllData, createCollection, importItems } from '../src/db/repo';
import { buildHtmlExport, buildJsonExport, parseImportFile, parseJsonImport, parseNetscapeHtml } from '../src/lib/importExport';
import { buildLibrary } from '../src/lib/library';

const CHROME_EXPORT = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1700000000" PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>
    <DL><p>
        <DT><A HREF="https://react.dev/" ADD_DATE="1700000100">React</A>
        <DT><H3>Recipes</H3>
        <DL><p>
            <DT><A HREF="https://cooking.example.com/pasta" ADD_DATE="1700000200" TAGS="food,italian">Pasta &amp; sauce</A>
            <DD>Grandma's favorite
        </DL><p>
    </DL><p>
    <DT><A HREF="javascript:void(0)">Bookmarklet</A>
</DL><p>`;

async function snapshotLibrary() {
  return buildLibrary({
    bookmarks: await db.bookmarks.toArray(),
    tags: await db.tags.toArray(),
    links: await db.bookmarkTags.toArray(),
    collections: await db.collections.toArray(),
  });
}

beforeEach(async () => {
  await clearAllData();
});

describe('browser HTML import', () => {
  it('reads links, folders as collections, dates, tags and descriptions', () => {
    const { items } = parseNetscapeHtml(CHROME_EXPORT);
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ url: 'https://react.dev/', title: 'React', collection: null, createdAt: 1700000100000 });
    expect(items[1]).toMatchObject({
      url: 'https://cooking.example.com/pasta',
      title: 'Pasta & sauce',
      collection: 'Recipes',
      tags: ['food', 'italian'],
      description: "Grandma's favorite",
    });
  });

  it('skips unsafe links when importing', async () => {
    const report = await importItems(parseImportFile('bookmarks.html', CHROME_EXPORT).items);
    expect(report).toEqual({ added: 2, duplicates: 0, invalid: 1 });
  });
});

describe('JSON backup', () => {
  it('round-trips bookmarks, tags, collections and favorites', async () => {
    const work = await createCollection('Work', 'emerald');
    await addBookmark({ url: 'a.com', title: 'A', tags: ['x', 'y'], collectionId: work, isFavorite: true });
    await addBookmark({ url: 'b.com', description: 'note' });

    const json = JSON.stringify(buildJsonExport(await snapshotLibrary()));
    await clearAllData();

    const parsed = parseImportFile('backup.json', json);
    expect(parsed.collectionColors.get('Work')).toBe('emerald');
    expect(await importItems(parsed.items)).toEqual({ added: 2, duplicates: 0, invalid: 0 });

    const lib = await snapshotLibrary();
    const a = lib.bookmarks.find((b) => b.title === 'A')!;
    expect(a.isFavorite).toBe(true);
    expect(a.collection?.name).toBe('Work');
    expect(a.tags.map((t) => t.name)).toEqual(['x', 'y']);
    expect(lib.bookmarks.find((b) => b.domain === 'b.com')!.description).toBe('note');
  });

  it('accepts a plain array and rejects broken files', () => {
    expect(parseJsonImport('[{"url":"a.com"},{"nope":1}]').items).toHaveLength(1);
    expect(() => parseJsonImport('{oops')).toThrow(/not valid JSON/);
    expect(() => parseJsonImport('{"hello":"world"}')).toThrow(/No bookmarks/);
  });
});

describe('HTML export', () => {
  it('produces a file that imports back the same links', async () => {
    const recipes = await createCollection('Recipes');
    await addBookmark({ url: 'cook.com/pasta', title: 'Pasta <best>', collectionId: recipes, tags: ['food'] });
    await addBookmark({ url: 'news.com' });

    const html = buildHtmlExport(await snapshotLibrary());
    expect(html).toContain('&lt;best&gt;');

    const { items } = parseNetscapeHtml(html);
    expect(items.map((i) => [i.url, i.collection])).toEqual([
      ['https://cook.com/pasta', 'Recipes'],
      ['https://news.com/', null],
    ]);
    expect(items[0].tags).toEqual(['food']);
  });
});
