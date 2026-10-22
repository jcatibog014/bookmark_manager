import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { useUI } from '../context/ui';
import { useHotkeys } from '../hooks/useHotkeys';
import BookmarkForm from './BookmarkForm';
import CommandPalette from './CommandPalette';
import ShortcutHelp from './ShortcutHelp';
import Sidebar from './Sidebar';
import Toaster from './Toaster';
import TopBar from './TopBar';

export default function Layout() {
  const { editor, openEditor, paletteOpen, setPaletteOpen, helpOpen, setHelpOpen } = useUI();

  useHotkeys({
    'mod+k': () => setPaletteOpen(!paletteOpen),
    n: () => openEditor(),
    '/': () => document.getElementById('global-search')?.focus(),
    '?': () => setHelpOpen(true),
  });

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <Suspense>
            <Outlet />
          </Suspense>
        </main>
      </div>
      {editor && <BookmarkForm key={editor.key} editor={editor} />}
      {paletteOpen && <CommandPalette />}
      {helpOpen && <ShortcutHelp />}
      <Toaster />
    </div>
  );
}
