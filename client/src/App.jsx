import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import Layout from './components/Layout';
import Oracle from './components/Oracle';
import AuthPage from './pages/AuthPage';
import JournalPage from './pages/JournalPage';
import ForgePage from './pages/ForgePage';
import ArenaPage from './pages/ArenaPage';
import EvolutionPage from './pages/EvolutionPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) return <div className="min-h-screen bg-ink-950 flex items-center justify-center text-ink-600 font-mono text-xs tracking-widest">LOADING...</div>;
  return user ? children : <Navigate to="/auth" />;
}

export default function App() {
  const init = useAuthStore(s => s.init);
  useEffect(() => { init(); }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/journal" />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="forge" element={<ForgePage />} />
          <Route path="arena" element={<ArenaPage />} />
          <Route path="evolution" element={<EvolutionPage />} />
        </Route>
      </Routes>
      <Oracle />
    </BrowserRouter>
  );
}
