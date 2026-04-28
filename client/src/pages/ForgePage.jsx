import { useState, useEffect } from 'react';
import api from '../api/axios';

const SEVERITY_COLOR = s => s >= 8 ? '#e8a84c' : s >= 5 ? '#9090c0' : '#4a4a62';

function AttackCard({ attack }) {
  return (
    <div className="p-4 border rounded-xl mb-3 transition-all"
      style={{ borderColor: attack.isPersonalized ? '#e8a84c30' : '#1e1e2a', background: attack.isPersonalized ? '#180e0008' : 'transparent' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {attack.isPersonalized && <span className="text-[8px] bg-forge/20 text-forge px-2 py-0.5 rounded-full uppercase tracking-wider">Personalized</span>}
          <span className="text-[9px] text-ink-600 uppercase tracking-wider">{attack.angle}</span>
        </div>
        <div className="flex items-center gap-1">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full"
              style={{ background: i < attack.severity ? SEVERITY_COLOR(attack.severity) : '#1e1e2a' }} />
          ))}
        </div>
      </div>
      <p className="text-sm text-ink-400 font-serif italic leading-relaxed">{attack.argument}</p>
    </div>
  );
}

export default function ForgePage() {
  const [ideas, setIdeas] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', isPublic: false });
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState('submit');

  useEffect(() => {
    api.get('/forge').then(({ data }) => setIdeas(data)).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post('/forge', form);
      setIdeas(prev => [data, ...prev]);
      setSelected(data._id);
      setView('ideas');
      setForm({ title: '', content: '', isPublic: false });
      // Poll for attacks
      const poll = setInterval(async () => {
        const { data: updated } = await api.get(`/forge/${data._id}`);
        if (updated.attacks?.length > 0) {
          setIdeas(prev => prev.map(i => i._id === updated._id ? updated : i));
          clearInterval(poll);
        }
      }, 3000);
      setTimeout(() => clearInterval(poll), 120000);
    } catch {}
    setSubmitting(false);
  }

  const selectedIdea = ideas.find(i => i._id === selected);

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-ink-100">The Forge</h1>
          <p className="text-[10px] text-ink-700 uppercase tracking-wider mt-1">Stress-test any idea · Personalized attacks</p>
        </div>
        <div className="flex gap-2">
          {['submit','ideas'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${view===v ? 'bg-ink-900 border-ink-700 text-ink-200' : 'border-ink-900 text-ink-600 hover:text-ink-400'}`}>
              {v === 'submit' ? 'New Idea' : `My Ideas (${ideas.length})`}
            </button>
          ))}
        </div>
      </div>

      {view === 'submit' ? (
        <form onSubmit={submit} className="card flex flex-col gap-4">
          <div>
            <label className="text-[9px] text-ink-700 uppercase tracking-wider block mb-2">Idea Title</label>
            <input className="input-field" placeholder="e.g. Quit my job to build a SaaS" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div>
            <label className="text-[9px] text-ink-700 uppercase tracking-wider block mb-2">Describe Your Idea</label>
            <textarea className="input-field h-36 resize-none" placeholder="Explain your idea, plan, or belief in detail. The more you share, the more personalized the attack..."
              value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isPublic} onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))}
              className="w-3 h-3 bg-ink-900 border-ink-700 rounded" />
            <span className="text-[10px] text-ink-600 uppercase tracking-wider">Make public for community stress-testing</span>
          </label>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Forging...' : 'Stress-Test This Idea →'}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {ideas.map(idea => (
              <div key={idea._id} onClick={() => setSelected(selected === idea._id ? null : idea._id)}
                className="card cursor-pointer hover:border-ink-700 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-serif text-base text-ink-200">{idea.title}</h3>
                  <div className="flex items-center gap-3">
                    {idea.overallScore != null && (
                      <div className="text-[10px] font-mono" style={{ color: idea.overallScore > 60 ? '#7ec47e' : idea.overallScore > 40 ? '#e8a84c' : '#e87e7e' }}>
                        Score {idea.overallScore}/100
                      </div>
                    )}
                    {idea.attacks?.length > 0
                      ? <span className="text-[8px] text-forge uppercase tracking-wider">{idea.attacks.length} attacks</span>
                      : <span className="text-[8px] text-ink-700 uppercase tracking-wider animate-pulse">Forging...</span>
                    }
                  </div>
                </div>
                <p className="text-[11px] text-ink-600 line-clamp-2">{idea.content}</p>

                {selected === idea._id && idea.attacks?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-ink-900">
                    <div className="text-[9px] text-ink-700 uppercase tracking-wider mb-3">Attack Results</div>
                    {idea.attacks.map((a, i) => <AttackCard key={i} attack={a} />)}
                    {idea.steelMan && (
                      <div className="p-4 bg-coach/5 border border-coach/20 rounded-xl mt-2">
                        <div className="text-[9px] text-coach uppercase tracking-wider mb-2">Steel Man</div>
                        <p className="text-sm text-ink-300 font-serif italic leading-relaxed">{idea.steelMan}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
