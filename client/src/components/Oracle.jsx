import { useState, useRef, useEffect, useCallback } from 'react';
import { useOracleStore } from '../store';

const MODE_COLORS = { mirror: '#7eb8d4', forge: '#e8a84c', coach: '#7ec47e', arena: '#c47eb8', auto: '#3a3a52' };
const MODE_LABELS = { mirror: 'Mirror', forge: 'Forge', coach: 'Coach', arena: 'Arena', auto: 'Awaiting' };

export default function Oracle() {
  const { isOpen, toggle, close, messages, mode, status, setStatus, insights, dismissInsight, sendMessage, addBgEvent } = useOracleStore();
  const [text, setText] = useState('');
  const [showBg, setShowBg] = useState(false);
  const [bgLog, setBgLog] = useState([]);
  const synthRef = useRef(window.speechSynthesis);
  const recRef = useRef(null);
  const listenRef = useRef(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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
    if (!userText.trim() || status === 'thinking' || status === 'speaking') return;
    setText('');
    const result = await sendMessage(userText.trim(), bgContext);
    if (result?.text) speak(result.text, result.mode);
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

  const mColor = MODE_COLORS[mode] || MODE_COLORS.auto;

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
    <div className="fixed bottom-6 right-6 z-50 w-80 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-ink-800" style={{ background: '#080810', maxHeight: '75vh' }}>
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-ink-900">
        <span style={{ color: mColor, fontSize: 16 }}>◬</span>
        <div className="flex-1">
          <div className="text-xs font-mono text-ink-300 tracking-wider">The Oracle</div>
          <div className="text-[9px] text-ink-700 tracking-widest uppercase">{MODE_LABELS[mode]}</div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: mColor, boxShadow: `0 0 4px ${mColor}` }} />
          <span className="text-[9px] text-ink-700 uppercase tracking-wider">{status === 'idle' ? 'ready' : status}</span>
        </div>
        <button onClick={close} className="text-ink-700 hover:text-ink-400 text-sm ml-1">✕</button>
      </div>

      {/* Insight cards */}
      {insights.length > 0 && (
        <div className="flex flex-col gap-2 p-3 border-b border-ink-900">
          {insights.slice(0, 3).map(ins => (
            <div key={ins._id} onClick={() => { handleSend(ins.text, ins.context); dismissInsight(ins._id); }}
              className="rounded-lg p-3 cursor-pointer hover:brightness-110 transition-all border"
              style={{ background: `${MODE_COLORS[ins.mode]}08`, borderColor: `${MODE_COLORS[ins.mode]}20` }}>
              <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: MODE_COLORS[ins.mode] }}>{ins.title}</div>
              <div className="text-[10px] text-ink-500 leading-relaxed">{ins.text}</div>
              <div className="text-[9px] mt-1 uppercase tracking-wider" style={{ color: MODE_COLORS[ins.mode] }}>{ins.cta}</div>
              <button onClick={e => { e.stopPropagation(); dismissInsight(ins._id); }} className="absolute top-2 right-2 text-ink-700 text-[10px]">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-[120px]">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-6">
            <span className="text-3xl opacity-20">◬</span>
            <p className="text-[9px] text-ink-700 uppercase tracking-widest">Speak or type anytime</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
              m.role === 'user' ? 'bg-ink-900 border border-ink-800 text-ink-300 font-serif italic text-sm' : 'bg-ink-950 border text-ink-400'
            }`} style={m.role === 'ai' ? { borderColor: `${MODE_COLORS[m.mode || 'auto']}20`, color: MODE_COLORS[m.mode || 'auto'] + 'cc' } : {}}>
              {m.content}
            </div>
          </div>
        ))}
        {status === 'thinking' && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-xl bg-ink-950 border border-ink-900 flex gap-1">
              {[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-full bg-ink-700" style={{ animation: `pulse 1s ${i*0.2}s ease-in-out infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-ink-900 flex gap-2 items-center">
        <button onClick={toggleOrb}
          className="w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 transition-all"
          style={{ borderColor: status === 'listening' ? mColor : '#1e1e30', background: status === 'listening' ? `${mColor}15` : '#0a0a18', color: status === 'listening' ? mColor : '#3a3a52' }}>
          {status === 'listening' ? '🎙' : status === 'speaking' ? '⏹' : '🎙'}
        </button>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend(text)}
          placeholder="or type here…"
          className="flex-1 bg-ink-950 border border-ink-900 rounded-lg px-3 py-2 text-xs text-ink-300 font-mono outline-none placeholder-ink-800 focus:border-ink-700" />
        <button onClick={() => handleSend(text)} disabled={!text.trim() || status !== 'idle'}
          className="w-8 h-8 rounded-lg border border-ink-800 bg-ink-950 text-ink-600 hover:text-forge hover:border-forge/30 disabled:opacity-30 text-xs transition-all">→</button>
      </div>
    </div>
  );
}
