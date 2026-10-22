// Import & export formats:
//  - JSON: this app's full backup (bookmarks, tags, collections, colors, stats)
//  - HTML: the "Netscape bookmark file" every browser can import/export

import type { ImportItem } from '../db/repo';
import { isColorName, type ColorName } from './colors';
import type { Library } from './library';

export interface ExportFile {
  app: 'bookmark-manager';
  version: 1;
  exportedAt: string;
  collections: { name: string; color: ColorName }[];
  tags: { name: string; color: ColorName }[];
  bookmarks: ImportItem[];
}

export interface ParsedImport {
  items: ImportItem[];
  tagColors: Map<string, ColorName>;
  collectionColors: Map<string, ColorName>;
}

export function buildJsonExport(library: Library): ExportFile {
  return {
    app: 'bookmark-manager',
    version: 1,
    exportedAt: new Date().toISOString(),
    collections: library.collections.map(({ name, color }) => ({ name, color })),
    tags: library.tags.map(({ name, color }) => ({ name, color })),
    bookmarks: library.bookmarks.map((b) => ({
      url: b.url,
      title: b.title,
      description: b.description,
      tags: b.tags.map((t) => t.name),
      collection: b.collection?.name ?? null,
      isFavorite: b.isFavorite,
      createdAt: b.createdAt,
      visitCount: b.visitCount,
      lastVisitedAt: b.lastVisitedAt,
    })),
  };
}

/** Accepts this app's export, or a plain array of { url, title?, tags? } objects. */
export function parseJsonImport(text: string): ParsedImport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  const record = (data ?? {}) as Partial<ExportFile>;
  const list = Array.isArray(data) ? data : record.bookmarks;
  if (!Array.isArray(list)) throw new Error('No bookmarks found in this JSON file.');

  const items: ImportItem[] = list
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && 'url' in x)
    .map((x) => ({
      url: String(x.url),
      title: typeof x.title === 'string' ? x.title : undefined,
      description: typeof x.description === 'string' ? x.description : undefined,
      tags: Array.isArray(x.tags) ? x.tags.map(String) : undefined,
      collection: typeof x.collection === 'string' ? x.collection : null,
      isFavorite: x.isFavorite === true,
      createdAt: typeof x.createdAt === 'number' ? x.createdAt : undefined,
      visitCount: typeof x.visitCount === 'number' ? x.visitCount : undefined,
      lastVisitedAt: typeof x.lastVisitedAt === 'number' ? x.lastVisitedAt : null,
    }));

  const colors = (entries: unknown) =>
    new Map(
      (Array.isArray(entries) ? entries : [])
        .filter((e) => e && typeof e.name === 'string' && isColorName(e.color))
        .map((e) => [e.name as string, e.color as ColorName]),
    );

  return { items, tagColors: colors(record.tags), collectionColors: colors(record.collections) };
}

/** Browser root folders aren't meaningful collections. */
const ROOT_FOLDERS = /^(bookmarks( bar| toolbar| menu)?|other bookmarks|favorites bar|mobile bookmarks)$/i;

/** Parses a Chrome / Firefox / Edge / Safari bookmarks.html export. Folders become collections. */
export function parseNetscapeHtml(html: string): ParsedImport {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const items: ImportItem[] = [];

  for (const a of Array.from(doc.querySelectorAll('a[href]'))) {
    const heading = a.closest('dl')?.previousElementSibling;
    const folder = heading?.tagName === 'H3' ? heading.textContent?.trim() : undefined;

    const addDate = Number(a.getAttribute('add_date'));
    // Most browsers write seconds; a few write milliseconds or microseconds.
    const createdAt =
      addDate > 1e14 ? Math.floor(addDate / 1000) : addDate > 1e11 ? addDate : addDate > 0 ? addDate * 1000 : undefined;

    const dd = a.parentElement?.nextElementSibling;
    const description = dd?.tagName === 'DD' ? dd.textContent?.trim() : undefined;

    items.push({
      url: a.getAttribute('href') ?? '',
      title: a.textContent?.trim() || undefined,
      description,
      tags: a.getAttribute('tags')?.split(',').filter(Boolean),
      collection: folder && !ROOT_FOLDERS.test(folder) ? folder : null,
      createdAt,
    });
  }
  return { items, tagColors: new Map(), collectionColors: new Map() };
}

export function parseImportFile(fileName: string, text: string): ParsedImport {
  const trimmed = text.trimStart();
  if (/\.json$/i.test(fileName) || trimmed.startsWith('{') || trimmed.startsWith('[')) return parseJsonImport(text);
  if (/\.html?$/i.test(fileName) || /^<!doctype netscape/i.test(trimmed) || trimmed.startsWith('<')) return parseNetscapeHtml(text);
  throw new Error('Unsupported file. Choose a .json backup or a browser bookmarks .html file.');
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Netscape bookmark file, importable by any browser. Collections become folders. */
export function buildHtmlExport(library: Library): string {
  const line = (b: Library['bookmarks'][number], indent: string) => {
    const attrs = [
      `HREF="${escapeHtml(b.url)}"`,
      `ADD_DATE="${Math.floor(b.createdAt / 1000)}"`,
      b.tags.length ? `TAGS="${escapeHtml(b.tags.map((t) => t.name).join(','))}"` : '',
    ]
      .filter(Boolean)
      .join(' ');
    const desc = b.description ? `\n${indent}<DD>${escapeHtml(b.description)}` : '';
    return `${indent}<DT><A ${attrs}>${escapeHtml(b.title)}</A>${desc}`;
  };

  const out = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ];
  for (const c of library.collections) {
    out.push(`    <DT><H3>${escapeHtml(c.name)}</H3>`, '    <DL><p>');
    for (const b of library.bookmarks.filter((b) => b.collectionId === c.id)) out.push(line(b, '        '));
    out.push('    </DL><p>');
  }
  for (const b of library.bookmarks.filter((b) => b.collection === null)) out.push(line(b, '    '));
  out.push('</DL><p>');
  return out.join('\n');
}

export function downloadFile(fileName: string, content: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
