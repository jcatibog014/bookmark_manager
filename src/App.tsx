import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { LibraryProvider } from './context/library';
import { UIProvider } from './context/ui';
import Home from './pages/Home';

// Secondary pages load on demand to keep the first load small.
const Tags = lazy(() => import('./pages/Tags'));
const Collections = lazy(() => import('./pages/Collections'));
const Settings = lazy(() => import('./pages/Settings'));

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
