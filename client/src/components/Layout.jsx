import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuthStore, useOracleStore } from '../store';
import { useEffect } from 'react';
import api from '../api/axios';

const NAV = [
  { to: '/journal', label: 'Mirror', icon: '◯', desc: 'Journal' },
  { to: '/forge', label: 'Forge', icon: '◈', desc: 'Ideas' },
  { to: '/arena', label: 'Arena', icon: '◇', desc: 'Debate' },
  { to: '/evolution', label: 'Evolution', icon: '◉', desc: 'Growth' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { toggle, insights, addInsight, addBgEvent } = useOracleStore();

  // SSE connection for background insights
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const evtSource = new EventSource(`/api/oracle/stream?token=${token}`);
    evtSource.onmessage = (e) => {
      try {
        const insight = JSON.parse(e.data);
        addInsight(insight);
        addBgEvent({ time: new Date().toLocaleTimeString(), ...insight });
      } catch {}
    };
    // Load existing insights
    api.get('/oracle/insights').then(({ data }) => data.forEach(addInsight)).catch(() => {});
    return () => evtSource.close();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-ink-950">
      {/* Sidebar */}
      <aside className="w-16 md:w-56 flex-shrink-0 border-r border-ink-900 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-ink-900">
          <div className="flex items-center gap-3">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <polygon points="11,2 20,19 2,19" stroke="#e8a84c" strokeWidth="0.8" fill="none" opacity="0.6"/>
              <circle cx="11" cy="11" r="2.5" fill="#e8a84c" opacity="0.8"/>
            </svg>
            <span className="hidden md:block font-serif text-forge text-base tracking-wide">InnerForge</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 flex flex-col gap-1">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all ${
                  isActive ? 'bg-ink-900 text-ink-100 border border-ink-800' : 'text-ink-600 hover:text-ink-300 hover:bg-ink-900/50'
                }`
              }>
              <span className="text-sm flex-shrink-0">{n.icon}</span>
              <span className="hidden md:block">{n.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Oracle button */}
        <div className="p-3 border-t border-ink-900">
          <button onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-forge/10 border border-forge/20 text-forge text-xs tracking-wider uppercase hover:bg-forge/20 transition-all relative">
            <span className="text-sm">◬</span>
            <span className="hidden md:block">Oracle</span>
            {insights.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-forge text-ink-950 text-[9px] rounded-full flex items-center justify-center font-bold">
                {insights.length}
              </span>
            )}
          </button>
        </div>

        {/* User */}
        <div className="p-3 border-t border-ink-900">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-ink-800 rounded-full flex items-center justify-center text-xs text-ink-400 flex-shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="hidden md:flex flex-col min-w-0">
              <span className="text-xs text-ink-300 truncate">{user?.name}</span>
              <button onClick={logout} className="text-[9px] text-ink-600 hover:text-ink-400 text-left tracking-wider uppercase">Logout</button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
