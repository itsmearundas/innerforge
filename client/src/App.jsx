import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import SplashScreen from './components/SplashScreen';
import Layout from './components/Layout';
import OracleLanding from './pages/OracleLanding';
import AuthPage from './pages/AuthPage';
import JournalPage from './pages/JournalPage';
import ForgePage from './pages/ForgePage';
import ArenaPage from './pages/ArenaPage';
import EvolutionPage from './pages/EvolutionPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#040C10' }}>
      <div style={{ display: 'flex', gap: '5px', alignItems: 'flex-end' }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ width: '3px', height: '20px', background: '#2A6B85', borderRadius: '2px', animation: `waveBar 0.8s ${i*0.12}s ease-in-out infinite`, transformOrigin: 'bottom' }} />
        ))}
      </div>
    </div>
  );
  return user ? children : <Navigate to="/auth" />;
}

export default function App() {
  const init = useAuthStore(s => s.init);
  const [splashDone, setSplashDone] = useState(false);
  const [splashShown] = useState(() => sessionStorage.getItem('splashShown') === 'true');

  useEffect(() => {
    init();
    if (splashShown) setSplashDone(true);
  }, []);

  function handleSplashFinish() {
    sessionStorage.setItem('splashShown', 'true');
    setSplashDone(true);
  }

  return (
    <>
      {!splashDone && <SplashScreen onFinish={handleSplashFinish} />}
      <div style={{ opacity: splashDone ? 1 : 0, transition: 'opacity 0.5s ease' }}>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<OracleLanding />} />
              <Route path="journal" element={<JournalPage />} />
              <Route path="forge" element={<ForgePage />} />
              <Route path="arena" element={<ArenaPage />} />
              <Route path="evolution" element={<EvolutionPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </div>
    </>
  );
}