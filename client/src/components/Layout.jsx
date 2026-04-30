import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore, useOracleStore } from '../store';
import { useEffect, useState } from 'react';
import api from '../api/axios';

const NAV = [
  { to: '/', label: 'Oracle', icon: '◬', exact: true },
  { to: '/journal', label: 'Mirror', icon: '◯' },
  { to: '/forge', label: 'Forge', icon: '◈' },
  { to: '/arena', label: 'Arena', icon: '◇' },
  { to: '/evolution', label: 'Evolution', icon: '◉' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { addInsight, addBgEvent } = useOracleStore();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token'); if (!token) return;
    const es = new EventSource(`/api/oracle/stream?token=${token}`);
    es.onmessage = e => { try { const d = JSON.parse(e.data); addInsight(d); addBgEvent({time:new Date().toLocaleTimeString(),...d}); } catch {} };
    api.get('/oracle/insights').then(({data})=>data.forEach(addInsight)).catch(()=>{});
    return () => es.close();
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#040C10' }}>
      {/* Sidebar */}
      <aside style={{ width: collapsed ? '60px' : '210px', flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#071A24', borderRight: '1px solid #163040', transition: 'width 0.3s ease', overflow: 'hidden' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 14px', borderBottom: '1px solid #163040', flexShrink: 0 }}>
          <img src="/aetrus-logo.png" alt="Aetrus" style={{ width: '28px', height: '28px', objectFit: 'contain', flexShrink: 0 }} />
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: '#E8F4F6', fontWeight: 400, whiteSpace: 'nowrap' }}>InnerForge</p>
              <p style={{ fontSize: '8px', color: '#C8834A', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '1px' }}>by AETRUS</p>
            </div>
          )}
          <button onClick={() => setCollapsed(c=>!c)} style={{ marginLeft: 'auto', color: '#1E3840', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '4px' }}>
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.exact} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: collapsed ? '10px' : '10px 12px',
              borderRadius: '12px', fontSize: '13px', fontWeight: isActive ? 500 : 400,
              textDecoration: 'none', transition: 'all 0.2s', whiteSpace: 'nowrap',
              background: isActive ? '#0D2535' : 'transparent',
              color: isActive ? '#C8834A' : '#3A6070',
              border: isActive ? '1px solid #1E506840' : '1px solid transparent',
              justifyContent: collapsed ? 'center' : 'flex-start',
            })}>
              <span style={{ fontSize: '15px', flexShrink: 0 }}>{n.icon}</span>
              {!collapsed && <span>{n.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid #163040' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '12px', background: '#0D2535' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1E5068', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: '#E8F4F6', flexShrink: 0 }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '12px', color: '#E8F4F6', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</p>
                <button onClick={logout} style={{ fontSize: '10px', color: '#3A6070', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}
                  onMouseEnter={e=>e.target.style.color='#FF6666'} onMouseLeave={e=>e.target.style.color='#3A6070'}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} className="page-enter">
        <Outlet />
      </main>
    </div>
  );
}