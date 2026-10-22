import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { LibraryProvider } from './context/library';
import { UIProvider } from './context/ui';
import Collections from './pages/Collections';
import Home from './pages/Home';
import Settings from './pages/Settings';
import Tags from './pages/Tags';

export default function App() {
  return (
    <UIProvider>
      <LibraryProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="tags" element={<Tags />} />
            <Route path="collections" element={<Collections />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </LibraryProvider>
    </UIProvider>
  );
}
