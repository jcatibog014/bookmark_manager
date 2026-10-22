import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { db } from '../db/db';
import { buildLibrary, EMPTY_LIBRARY, type Library } from '../lib/library';

interface LibraryContextValue {
  library: Library;
  loading: boolean;
}

const LibraryContext = createContext<LibraryContextValue>({ library: EMPTY_LIBRARY, loading: true });

/** Loads every table once and re-renders automatically whenever the database changes. */
export function LibraryProvider({ children }: { children: ReactNode }) {
  const raw = useLiveQuery(async () => {
    const [bookmarks, tags, links, collections] = await Promise.all([
      db.bookmarks.toArray(),
      db.tags.toArray(),
      db.bookmarkTags.toArray(),
      db.collections.toArray(),
    ]);
    return { bookmarks, tags, links, collections };
  });

  const value = useMemo(
    () => (raw ? { library: buildLibrary(raw), loading: false } : { library: EMPTY_LIBRARY, loading: true }),
    [raw],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  return useContext(LibraryContext);
}
