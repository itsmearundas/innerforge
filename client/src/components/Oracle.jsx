import { useState, useRef, useEffect, useCallback } from 'react';
import { useOracleStore } from '../store';
import api from '../api/axios';

const MODE_COLORS = { mirror: '#7eb8d4', forge: '#e8a84c', coach: '#7ec47e', arena: '#c47eb8', auto: '#3a3a52' };
const MODE_LABELS = { mirror: 'Mirror', forge: 'Forge', coach: 'Coach', arena: 'Arena', auto: 'Awaiting' };
const STAGE_LABELS = { stranger: 'New Connection', acquaintance: 'Getting to Know You', familiar: 'Trusted Advisor', intimate: 'Deep Bond' };
const STAGE_COLORS = { stranger: '#3a3a52', acquaintance: '#7eb8d4', familiar: '#e8a84c', intimate: '#c47eb8' };

export default function Oracle() {
  const { isOpen, toggle, close, messages, mode, status, setStatus, insights, dismissInsight } = useOracleStore();
  const [localMessages, setLocalMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [relationshipStage, setRelationshipStage] = useState('stranger');
  const [totalExchanges, setTotalExchanges] = useState(0);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [showStage, setShowStage] = useState(false);
  const synthRef = useRef(window.speechSynthesis);
  const recRef = useRef(null);
  const listenRef = useRef(false);
  const bottomRef = useRef(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  // Load conversation history when Oracle opens
  useEffect(() => {
    if (isOpen && !historyLoaded) {
      api.get('/oracle/history').then(({ data }) => {
        setLocalMessages(data.messages || []);
        setRelationshipStage(data.relationshipStage || 'stranger');
        setTotalExchanges(data.totalExchanges || 0);
        setHistoryLoaded(true);
      }).catch(() => setHistoryLoaded(true));
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, loading]);

  const speak = useCallback((text, m) => {
    const s = synthRef.current; s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.91; u.pitch = m === 'forge' ? 0.85 : m === 'mirror' ? 1.08 : 0.97; u.volume = 0.92;
    const v = s.getVoices().find(x => x.lang.startsWith('en') && (x.name.includes('Google') || x.name.includes('Samantha'))) || s.getVoices().find(x => x.lang.startsWith('en'));
    if (v) u.voice = v;
    u.onstart = () => setStatus('speaking');
    u.onend = u.onerror = () => setStatus('idle');
    s.speak(u);
  }, [setStatus]);

  const handleSend = async (userText, bgContext = null) => {
    if (!userText.trim() || loading) return;
    setText('');
    const userMsg = { role: 'user', content: userText, timestamp: new Date() };
    setLocalMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const { data } = await api.post('/oracle/chat', { message: userText.trim(), backgroundContext: bgContext });
      const aiMsg = { role: 'ai', content: data.text, mode: data.mode, timestamp: new Date() };
      setLocalMessages(prev => [...prev, aiMsg]);
      setRelationshipStage(data.relationshipStage || relationshipStage);
      setTotalExchanges(data.totalExchanges || totalExchanges + 1);
      speak(data.text, data.mode);
    } catch {
      setLocalMessages(prev => [...prev, { role: 'ai', content: 'Oracle is temporarily unreachable.', mode: 'auto' }]);
    }
    setLoading(false);
  };

  function startListen() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || listenRef.current) return;
    synthRef.current.cancel();
    const rec = new SR(); rec.lang = 'en-US'; rec.interimResults = false;
    recRef.current = rec; listenRef.current = true; setStatus('listening');
    let final = '';
    rec.onresult = e => { final = e.results[0][0].transcript; };
    rec.onspeechend = () => rec.stop();
    rec.onend = () => { listenRef.current = false; if (final) handleSend(final); else setStatus('idle'); };
    rec.onerror = () => { listenRef.current = false; setStatus('idle'); };
    rec.start();
  }

  function toggleOrb() {
    if (status === 'speaking') { synthRef.current.cancel(); setStatus('idle'); return; }
    if (status === 'listening') { recRef.current?.stop(); return; }
    if (status === 'idle') startListen();
  }

  async function clearHistory() {
    if (!confirm('Start fresh with Oracle? Your conversation history will be cleared.')) return;
    await api.delete('/oracle/history');
    setLocalMessages([]);
    setRelationshipStage('stranger');
    setTotalExchanges(0);
  }

  const mColor = MODE_COLORS[mode] || MODE_COLORS.auto;
  const stageColor = STAGE_COLORS[relationshipStage] || STAGE_COLORS.stranger;

  if (!isOpen) return (
    <button onClick={toggle}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full border flex items-center justify-center transition-all hover:scale-105"
      style={{ background: '#0a0a18', borderColor: mColor + '40', boxShadow: `0 0 20px ${mColor}20` }}>
      <span style={{ color: mColor, fontSize: 18 }}>◬</span>
      {insights.length > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-forge text-ink-950 text-[9px] rounded-full flex items-center justify-center font-bold">
          {insights.length}
        </span>
      )}
    </button>
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-ink-800" style={{ background: '#080810', maxHeight: '80vh' }}>
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-ink-900">
        <span style={{ color: mColor, fontSize: 16 }}>◬</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono text-ink-300 tracking-wider">The Oracle</div>
          <button onClick={() => setShowStage(s => !s)}
            className="text-[9px] tracking-widest uppercase transition-colors hover:opacity-80"
            style={{ color: stageColor }}>
            {STAGE_LABELS[relationshipStage]} · {totalExchanges} talks
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: mColor, boxShadow: `0 0 4px ${mColor}` }} />
          <button onClick={clearHistory} title="Fresh start" className="text-ink-800 hover:text-ink-600 text-xs">↺</button>
          <button onClick={close} className="text-ink-700 hover:text-ink-400 text-sm">✕</button>
        </div>
      </div>

      {/* Relationship stage banner */}
      {showStage && (
        <div className="px-3 py-2 border-b border-ink-900 text-[9px] leading-relaxed" style={{ background: stageColor + '10', color: stageColor }}>
          {{
            stranger: 'Oracle is learning who you are. Keep talking — it remembers everything.',
            acquaintance: 'Oracle is starting to notice your patterns across conversations.',
            familiar: 'Oracle knows you well. It will call out contradictions and reference your past.',
            intimate: 'Deep bond formed. Oracle speaks with radical honesty and genuine care.'
          }[relationshipStage]}
        </div>
      )}

      {/* Insight cards */}
      {insights.length > 0 && (
        <div className="flex flex-col gap-2 p-3 border-b border-ink-900">
          {insights.slice(0, 2).map(ins => (
            <div key={ins._id}
              onClick={() => { handleSend(ins.text, ins.context); dismissInsight(ins._id); }}
              className="rounded-lg p-3 cursor-pointer hover:brightness-110 transition-all border relative"
              style={{ background: `${MODE_COLORS[ins.mode]}08`, borderColor: `${MODE_COLORS[ins.mode]}20` }}>
              <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: MODE_COLORS[ins.mode] }}>{ins.title}</div>
              <div className="text-[10px] text-ink-500 leading-relaxed">{ins.text}</div>
              <div className="text-[9px] mt-1 uppercase tracking-wider" style={{ color: MODE_COLORS[ins.mode] }}>{ins.cta}</div>
              <button onClick={e => { e.stopPropagation(); dismissInsight(ins._id); }}
                className="absolute top-2 right-2 text-ink-700 text-[10px] hover:text-ink-400">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-[140px]">
        {!historyLoaded && (
          <div className="flex items-center justify-center py-6">
            <div className="text-[9px] text-ink-700 uppercase tracking-widest animate-pulse">Loading memory...</div>
          </div>
        )}
        {historyLoaded && localMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
            <span className="text-3xl opacity-20">◬</span>
            <p className="text-[9px] text-ink-700 uppercase tracking-widest leading-relaxed">
              {relationshipStage === 'stranger' ? 'First time here. Say anything.' : `Welcome back. ${totalExchanges} conversations so far.`}
            </p>
          </div>
        )}
        {localMessages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            {m.role === 'ai' && (
              <div className="text-[8px] text-ink-800 uppercase tracking-wider mb-1 px-1">
                oracle · {MODE_LABELS[m.mode || 'auto']?.toLowerCase()}
              </div>
            )}
            <div className={`max-w-[88%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
              m.role === 'user'
                ? 'bg-ink-900 border border-ink-800 text-ink-300 font-serif italic text-sm rounded-br-sm'
                : 'bg-ink-950 border rounded-bl-sm'
            }`} style={m.role === 'ai' ? {
              borderColor: `${MODE_COLORS[m.mode || 'auto']}25`,
              color: MODE_COLORS[m.mode || 'auto'] + 'cc'
            } : {}}>
              {m.content}
            </div>
            {m.timestamp && (
              <div className="text-[7px] text-ink-900 mt-0.5 px-1">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-xl bg-ink-950 border border-ink-900 flex gap-1.5 items-center">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-ink-700"
                  style={{ animation: `pulse 1s ${i * 0.2}s ease-in-out infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-ink-900 flex gap-2 items-center">
        <button onClick={toggleOrb}
          className="w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            borderColor: status === 'listening' ? mColor : '#1e1e30',
            background: status === 'listening' ? `${mColor}15` : '#0a0a18',
            color: status === 'listening' ? mColor : '#3a3a52'
          }}>
          {status === 'listening' ? '🎙' : status === 'speaking' ? '⏹' : '🎙'}
        </button>
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend(text)}
          placeholder={totalExchanges === 0 ? 'Say anything to begin...' : 'Continue the conversation...'}
          className="flex-1 bg-ink-950 border border-ink-900 rounded-lg px-3 py-2 text-xs text-ink-300 font-mono outline-none placeholder-ink-800 focus:border-ink-700" />
        <button onClick={() => handleSend(text)} disabled={!text.trim() || loading}
          className="w-8 h-8 rounded-lg border border-ink-800 bg-ink-950 text-ink-600 hover:text-forge hover:border-forge/30 disabled:opacity-30 text-xs transition-all">→</button>
      </div>
    </div>
  );
}