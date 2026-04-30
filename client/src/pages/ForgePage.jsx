import { useState, useEffect } from 'react';
import api from '../api/axios';

const SEV_COLOR = s => s >= 8 ? '#FF6B6B' : s >= 5 ? '#F68048' : '#8A9FD8';

export default function ForgePage() {
  const [ideas, setIdeas] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', isPublic: false });
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState('submit');
  const [tab, setTab] = useState('attacks');

  useEffect(() => { api.get('/forge').then(({ data }) => setIdeas(data)).catch(() => {}); }, []);

  async function submit(e) {
    e.preventDefault(); setSubmitting(true);
    try {
      const { data } = await api.post('/forge', form);
      setIdeas(prev => [data, ...prev]); setSelected(data._id); setView('ideas');
      setForm({ title: '', content: '', isPublic: false });
      const poll = setInterval(async () => {
        const { data: u } = await api.get(`/forge/${data._id}`);
        if (u.attacks?.length > 0) { setIdeas(prev => prev.map(i => i._id === u._id ? u : i)); clearInterval(poll); }
      }, 3000);
      setTimeout(() => clearInterval(poll), 120000);
    } catch {}
    setSubmitting(false);
  }

  async function deleteIdea(id, e) {
    e.stopPropagation();
    if (!confirm('Delete this idea?')) return;
    setIdeas(prev => prev.filter(i => i._id !== id));
  }

  const selectedIdea = ideas.find(i => i._id === selected);

  return (
    <div className="flex h-full" style={{ background: '#060D33' }}>
      {/* Left — list */}
      <div className="flex flex-col border-r" style={{ width: '340px', flexShrink: 0, borderColor: '#1E2F80', background: '#0A1240' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1E2F80' }}>
          <div>
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#E8EEFF', fontWeight: 400 }}>The Forge</h1>
            <p style={{ fontSize: '9px', color: '#4A5E9A', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>Stress-test your ideas</p>
          </div>
          <button onClick={() => { setView('submit'); setSelected(null); }} className="btn-primary text-xs px-3 py-2">+ New</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {ideas.map(idea => (
            <div key={idea._id} onClick={() => { setSelected(idea._id); setView('result'); }}
              className="rounded-xl p-4 cursor-pointer transition-all group relative"
              style={{ background: selected === idea._id ? '#162070' : '#0F1A55', border: `1px solid ${selected === idea._id ? '#2845D6' : '#1E2F80'}` }}>
              <div className="flex items-start justify-between gap-2">
                <p style={{ fontSize: '13px', color: '#E8EEFF', fontWeight: 500, lineHeight: 1.4 }} className="line-clamp-2">{idea.title}</p>
                <button onClick={e => deleteIdea(idea._id, e)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 text-xs flex-shrink-0">✕</button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {idea.overallScore != null && (
                  <span style={{ fontSize: '10px', color: idea.overallScore > 60 ? '#7ec47e' : idea.overallScore > 40 ? '#F68048' : '#FF6B6B', background: idea.overallScore > 60 ? '#7ec47e15' : idea.overallScore > 40 ? '#F6804815' : '#FF6B6B15', border: `1px solid ${idea.overallScore > 60 ? '#7ec47e30' : idea.overallScore > 40 ? '#F6804830' : '#FF6B6B30'}`, padding: '1px 8px', borderRadius: '10px' }}>
                    {idea.overallScore}/100
                  </span>
                )}
                {idea.attacks?.length > 0
                  ? <span style={{ fontSize: '9px', color: '#4A5E9A' }}>{idea.attacks.length} attacks</span>
                  : <span style={{ fontSize: '9px', color: '#4A5E9A' }} className="animate-pulse">Forging...</span>}
              </div>
            </div>
          ))}
          {ideas.length === 0 && (
            <div className="flex items-center justify-center h-40">
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: '#2A3A70', fontSize: '15px' }}>No ideas forged yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right — submit or result */}
      <div className="flex-1 overflow-y-auto">
        {view === 'submit' ? (
          <div className="p-8 max-w-2xl">
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: '#E8EEFF', fontWeight: 400, marginBottom: '8px' }}>New Idea</h2>
            <p style={{ fontSize: '12px', color: '#4A5E9A', marginBottom: '32px' }}>The AI will attack it from 10 angles using your psychological profile.</p>
            <form onSubmit={submit} className="flex flex-col gap-5">
              <div>
                <label style={{ fontSize: '10px', color: '#4A5E9A', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Idea Title</label>
                <input className="input-field" placeholder="e.g. Quit my job to build a SaaS" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: '#4A5E9A', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Describe It</label>
                <textarea className="input-field" style={{ minHeight: '160px', resize: 'vertical' }} placeholder="Explain your idea in detail. The more context, the more personalized the attack..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm(f => ({ ...f, isPublic: !f.isPublic }))}
                  className="w-10 h-5 rounded-full transition-all relative"
                  style={{ background: form.isPublic ? '#2845D6' : '#1E2F80' }}>
                  <div className="w-4 h-4 rounded-full absolute top-0.5 transition-all" style={{ background: 'white', left: form.isPublic ? '22px' : '2px' }} />
                </div>
                <span style={{ fontSize: '12px', color: '#8A9FD8' }}>Make public for community stress-testing</span>
              </label>
              <button type="submit" disabled={submitting} className="btn-primary" style={{ padding: '14px', fontSize: '14px' }}>
                {submitting ? 'Forging...' : 'Stress-Test This Idea →'}
              </button>
            </form>
          </div>
        ) : selectedIdea ? (
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#E8EEFF', fontWeight: 400 }}>{selectedIdea.title}</h2>
                <p style={{ fontSize: '12px', color: '#4A5E9A', marginTop: '4px' }}>{new Date(selectedIdea.createdAt).toLocaleDateString()}</p>
              </div>
              {selectedIdea.overallScore != null && (
                <div className="text-center px-6 py-4 rounded-2xl" style={{ background: '#0F1A55', border: '1px solid #1E2F80' }}>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: selectedIdea.overallScore > 60 ? '#7ec47e' : selectedIdea.overallScore > 40 ? '#F68048' : '#FF6B6B' }}>{selectedIdea.overallScore}</p>
                  <p style={{ fontSize: '9px', color: '#4A5E9A', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Score</p>
                </div>
              )}
            </div>

            {!selectedIdea.attacks?.length ? (
              <div className="flex flex-col items-center gap-4 py-16">
                <div className="flex gap-1 items-end">
                  {[0,1,2,3,4].map(i => <div key={i} className="w-1.5 rounded-full" style={{ height: '24px', background: '#F68048', animation: `waveBar 0.8s ${i*0.15}s ease-in-out infinite`, transformOrigin: 'bottom' }} />)}
                </div>
                <p style={{ color: '#4A5E9A', fontSize: '12px' }}>Forging attacks...</p>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                  {['attacks', 'steelman'].map(t => (
                    <button key={t} onClick={() => setTab(t)}
                      className="px-4 py-2 rounded-xl text-xs font-medium transition-all capitalize"
                      style={{ background: tab === t ? '#162070' : '#0F1A55', color: tab === t ? '#E8EEFF' : '#4A5E9A', border: `1px solid ${tab === t ? '#2845D640' : '#1E2F80'}` }}>
                      {t === 'steelman' ? '🛡 Steel Man' : `⚔️ ${selectedIdea.attacks.length} Attacks`}
                    </button>
                  ))}
                </div>

                {tab === 'attacks' && (
                  <div className="flex flex-col gap-3">
                    {selectedIdea.attacks.map((a, i) => (
                      <div key={i} className="p-5 rounded-2xl" style={{ background: '#0F1A55', border: `1px solid ${a.isPersonalized ? '#F6804830' : '#1E2F80'}` }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {a.isPersonalized && <span style={{ fontSize: '8px', background: '#F6804815', border: '1px solid #F6804840', color: '#F68048', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Personalized</span>}
                            <span style={{ fontSize: '10px', color: '#4A5E9A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{a.angle}</span>
                          </div>
                          <div className="flex gap-1">
                            {[...Array(10)].map((_, j) => <div key={j} className="w-2 h-2 rounded-full" style={{ background: j < a.severity ? SEV_COLOR(a.severity) : '#1E2F80' }} />)}
                          </div>
                        </div>
                        <p style={{ fontSize: '13px', color: '#8A9FD8', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', lineHeight: 1.7 }}>{a.argument}</p>
                      </div>
                    ))}
                  </div>
                )}
                {tab === 'steelman' && selectedIdea.steelMan && (
                  <div className="p-6 rounded-2xl" style={{ background: '#7ec47e10', border: '1px solid #7ec47e30' }}>
                    <p style={{ fontSize: '10px', color: '#7ec47e', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Strongest Version</p>
                    <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '17px', color: '#E8EEFF', lineHeight: 1.8, fontStyle: 'italic' }}>{selectedIdea.steelMan}</p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: '#2A3A70', fontSize: '16px' }}>Select an idea to view results</p>
          </div>
        )}
      </div>
    </div>
  );
}