import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuthStore();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate('/journal');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-3">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <polygon points="20,3 37,34 3,34" stroke="#e8a84c" strokeWidth="1" fill="none" opacity="0.6"/>
              <circle cx="20" cy="20" r="5" fill="#e8a84c" opacity="0.8"/>
              <line x1="20" y1="3" x2="20" y2="34" stroke="#e8a84c" strokeWidth="0.5" opacity="0.3"/>
            </svg>
          </div>
          <h1 className="font-serif text-3xl text-forge mb-1">InnerForge</h1>
          <p className="text-[10px] text-ink-700 tracking-widest uppercase">AI that knows you, then challenges you</p>
        </div>

        <form onSubmit={submit} className="card flex flex-col gap-4">
          <div className="flex gap-1 p-1 bg-ink-950 rounded-lg">
            {['login','register'].map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`flex-1 py-2 text-[10px] tracking-widest uppercase rounded-md transition-all ${mode === m ? 'bg-ink-900 text-ink-200 border border-ink-800' : 'text-ink-600 hover:text-ink-400'}`}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {mode === 'register' && (
            <input className="input-field" placeholder="Your name" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          )}
          <input className="input-field" type="email" placeholder="Email" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          <input className="input-field" type="password" placeholder="Password" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />

          {error && <p className="text-red-400 text-xs font-mono">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? 'Please wait...' : mode === 'login' ? 'Enter the Forge' : 'Begin Your Journey'}
          </button>
        </form>
      </div>
    </div>
  );
}
