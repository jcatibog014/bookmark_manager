import { Outlet } from 'react-router-dom';
import { useUI } from '../context/ui';
import BookmarkForm from './BookmarkForm';
import Sidebar from './Sidebar';
import Toaster from './Toaster';
import TopBar from './TopBar';

export default function Layout() {
  const { editor } = useUI();
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      {editor && <BookmarkForm key={editor.key} editor={editor} />}
      <Toaster />
    </div>
  );
}
