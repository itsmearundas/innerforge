import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuthStore();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let t = 0;
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize(); window.addEventListener('resize', resize);
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height); t += 0.006;
      [[0,'#1E5068',0.25],[1,'#2A6B85',0.18],[2,'#C8834A',0.12]].forEach(([layer, hex, alpha]) => {
        ctx.beginPath();
        for (let i = 0; i <= 100; i++) {
          const x = (i/100)*canvas.width;
          const y = canvas.height*0.5 + Math.sin(t+i*0.07+layer*1.4)*(50-layer*12)*(1+Math.sin(t*0.4)*0.3);
          i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
        }
        const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
        ctx.strokeStyle=`rgba(${r},${g},${b},${alpha})`; ctx.lineWidth=2-layer*0.3; ctx.stroke();
      });
      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, []);

  async function submit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) { setError(err.response?.data?.message || 'Something went wrong'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#040C10', position: 'relative', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px', padding: '24px' }}>
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <img src="/aetrus-logo.png" alt="Aetrus" style={{ width: '100px', height: '100px', objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '38px', fontWeight: 300, color: '#E8F4F6', letterSpacing: '0.08em', lineHeight: 1 }}>InnerForge</h1>
          <p style={{ fontSize: '10px', color: '#3A6070', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '8px' }}>AI that knows you, then challenges you</p>

        </div>

        {/* Form card */}
        <div style={{ background: '#071A24', border: '1px solid #163040', borderRadius: '20px', padding: '32px', boxShadow: '0 20px 60px #00000060' }}>
          {/* Toggle */}
          <div style={{ display: 'flex', gap: '4px', padding: '4px', background: '#040C10', borderRadius: '12px', marginBottom: '24px' }}>
            {['login','register'].map(m => (
              <button key={m} type="button" onClick={() => setMode(m)} style={{
                flex: 1, padding: '10px', borderRadius: '10px', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif', letterSpacing: '0.02em',
                background: mode === m ? '#0D2535' : 'transparent',
                color: mode === m ? '#E8F4F6' : '#3A6070',
                border: mode === m ? '1px solid #163040' : '1px solid transparent',
              }}>{m === 'login' ? 'Sign In' : 'Create Account'}</button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mode === 'register' && (
              <div>
                <label style={{ fontSize: '10px', color: '#3A6070', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Full Name</label>
                <input className="input-field" placeholder="Your name" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required />
              </div>
            )}
            <div>
              <label style={{ fontSize: '10px', color: '#3A6070', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Email</label>
              <input className="input-field" type="email" placeholder="you@email.com" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} required />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#3A6070', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Password</label>
              <input className="input-field" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} required />
            </div>
            {error && <div style={{ background: '#FF444410', border: '1px solid #FF444330', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#FF7777' }}>{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '8px', padding: '14px' }}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Enter the Forge →' : 'Begin Your Journey →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}