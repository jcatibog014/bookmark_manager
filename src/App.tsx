import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { UIProvider } from './context/ui';
import Home from './pages/Home';
import Settings from './pages/Settings';

export default function App() {
  return (
    <UIProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </UIProvider>
  );
}
