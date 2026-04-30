import { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import api from '../api/axios';

function InsightBadge({ label, color, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p style={{ fontSize: '9px', color: '#4A5E9A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.slice(0, 5).map((item, i) => (
          <span key={i} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', background: `${color}15`, border: `1px solid ${color}30`, color }}>{typeof item === 'string' ? item : item.name}</span>
        ))}
      </div>
    </div>
  );
}

export default function JournalPage() {
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState('write');
  const [voiceStatus, setVoiceStatus] = useState('idle');
  const [interimText, setInterimText] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [fileContext, setFileContext] = useState('');
  const recRef = useRef(null);
  const listenRef = useRef(false);
  const fileInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Write freely. No judgment here. Let your thoughts flow...' })
    ],
    editorProps: { attributes: { class: 'font-serif text-base leading-loose focus:outline-none min-h-48' } }
  });

  useEffect(() => {
    api.get('/journal').then(({ data }) => setEntries(data)).catch(() => {});
  }, []);

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || listenRef.current) return;
    const rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = true;
    recRef.current = rec; listenRef.current = true; setVoiceStatus('listening');
    rec.onresult = e => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      setInterimText(interim);
      if (final && editor) editor.commands.insertContent(final);
    };
    rec.onerror = rec.onend = () => { listenRef.current = false; setVoiceStatus('idle'); setInterimText(''); };
    rec.start();
  }

  function stopVoice() { recRef.current?.stop(); listenRef.current = false; setVoiceStatus('idle'); setInterimText(''); }

  function handleFileAttach(e) {
    const file = e.target.files[0];
    if (!file) return;
    setAttachedFile(file);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result;
      setFileContext(text.slice(0, 3000));
      editor?.commands.insertContent(`\n\n[Reference: ${file.name}]\n`);
    };
    reader.readAsText(file);
  }

  async function save() {
    const html = editor?.getHTML();
    const text = editor?.getText();
    if (!text?.trim() || text.trim().length < 10) return;
    setSaving(true);
    try {
      const fullContent = fileContext ? `${text}\n\nFile context: ${fileContext}` : text;
      const { data } = await api.post('/journal', { content: html, contentText: fullContent, wordCount: text.split(' ').length });
      setEntries(prev => [data, ...prev]);
      editor?.commands.clearContent();
      setAttachedFile(null); setFileContext('');
      const poll = setInterval(async () => {
        try {
          const { data: updated } = await api.get(`/journal/${data._id}`);
          if (updated.aiInsights?.analyzed) { setEntries(prev => prev.map(e => e._id === updated._id ? updated : e)); clearInterval(poll); }
        } catch { clearInterval(poll); }
      }, 3000);
      setTimeout(() => clearInterval(poll), 60000);
    } catch {}
    setSaving(false);
  }

  async function deleteEntry(id, e) {
    e.stopPropagation();
    if (!confirm('Delete this entry?')) return;
    await api.delete(`/journal/${id}`);
    setEntries(prev => prev.filter(e => e._id !== id));
    if (selectedEntry?._id === id) setSelectedEntry(null);
  }

  return (
    <div className="flex h-full" style={{ background: '#060D33' }}>
      {/* Main editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#1E2F80', background: '#0A1240' }}>
          <div>
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: '#E8EEFF', fontWeight: 400 }}>Mirror</h1>
            <p style={{ fontSize: '10px', color: '#4A5E9A', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>Private Journal · AI Analyzes Every Entry</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setView(v => v === 'write' ? 'entries' : 'write')}
              className="btn-secondary text-xs">
              {view === 'write' ? `Past Entries (${entries.length})` : 'Write'}
            </button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </div>

        {view === 'write' ? (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Date */}
            <p style={{ fontSize: '10px', color: '#2A3A70', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            {/* Attached file badge */}
            {attachedFile && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl" style={{ background: '#F6804815', border: '1px solid #F6804840' }}>
                <span style={{ fontSize: '12px' }}>📎</span>
                <span style={{ fontSize: '11px', color: '#F68048' }}>{attachedFile.name}</span>
                <button onClick={() => { setAttachedFile(null); setFileContext(''); }} className="ml-auto text-red-400 hover:text-red-300 text-xs">✕</button>
              </div>
            )}

            {/* Interim voice text */}
            {interimText && (
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: '#4A5E9A', fontSize: '14px', marginBottom: '8px' }}>"{interimText}"</p>
            )}

            {/* Editor */}
            <div style={{ color: '#E8EEFF' }}>
              <EditorContent editor={editor} />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
            {entries.length === 0 && (
              <div className="flex items-center justify-center h-40">
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: '#2A3A70', fontSize: '16px' }}>No entries yet. Start writing.</p>
              </div>
            )}
            {entries.map(entry => (
              <div key={entry._id} onClick={() => setSelectedEntry(selectedEntry?._id === entry._id ? null : entry)}
                className="rounded-2xl p-5 cursor-pointer transition-all hover:brightness-110 relative group"
                style={{ background: '#0F1A55', border: `1px solid ${selectedEntry?._id === entry._id ? '#2845D6' : '#1E2F80'}` }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p style={{ fontSize: '10px', color: '#4A5E9A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {entry.wordCount} words
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.aiInsights?.analyzed
                      ? <span style={{ fontSize: '8px', color: '#7eb8d4', letterSpacing: '0.1em', textTransform: 'uppercase', background: '#7eb8d415', border: '1px solid #7eb8d430', padding: '2px 8px', borderRadius: '10px' }}>Analyzed</span>
                      : <span style={{ fontSize: '8px', color: '#4A5E9A', textTransform: 'uppercase', letterSpacing: '0.1em' }} className="animate-pulse">Analyzing...</span>
                    }
                    <button onClick={e => deleteEntry(entry._id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 text-xs px-1">✕</button>
                  </div>
                </div>
                <div style={{ fontSize: '14px', color: '#8A9FD8', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  dangerouslySetInnerHTML={{ __html: entry.content }} />

                {selectedEntry?._id === entry._id && entry.aiInsights?.analyzed && (
                  <div className="mt-5 pt-5 flex flex-col gap-4" style={{ borderTop: '1px solid #1E2F80' }}>
                    {entry.aiInsights.summary && (
                      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: '15px', color: '#8A9FD8', lineHeight: 1.7 }}>{entry.aiInsights.summary}</p>
                    )}
                    <InsightBadge label="Emotions" color="#7eb8d4" items={entry.aiInsights.emotions} />
                    <InsightBadge label="Themes" color="#2845D6" items={entry.aiInsights.themes} />
                    {entry.aiInsights.biasesDetected?.length > 0 && (
                      <div>
                        <p style={{ fontSize: '9px', color: '#4A5E9A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Biases Flagged</p>
                        {entry.aiInsights.biasesDetected.map(b => (
                          <div key={b.name} className="mb-2 p-3 rounded-xl" style={{ background: '#F6804810', border: '1px solid #F6804820' }}>
                            <div className="flex justify-between mb-1">
                              <span style={{ fontSize: '11px', color: '#F68048', fontWeight: 500 }}>{b.name}</span>
                              <span style={{ fontSize: '9px', color: '#4A5E9A' }}>severity {b.severity}/10</span>
                            </div>
                            <p style={{ fontSize: '11px', color: '#8A9FD8', lineHeight: 1.5 }}>{b.explanation}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Voice + File toolbar */}
        {view === 'write' && (
          <div className="flex items-center gap-3 px-6 py-3 border-t flex-shrink-0" style={{ borderColor: '#1E2F80', background: '#0A1240' }}>
            <button
              onClick={voiceStatus === 'listening' ? stopVoice : startVoice}
              className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-medium"
              style={{
                background: voiceStatus === 'listening' ? '#2845D620' : '#0F1A55',
                border: `1px solid ${voiceStatus === 'listening' ? '#2845D6' : '#1E2F80'}`,
                color: voiceStatus === 'listening' ? '#7eb8d4' : '#4A5E9A',
                boxShadow: voiceStatus === 'listening' ? '0 0 12px #2845D630' : 'none'
              }}>
              {voiceStatus === 'listening' ? '⏹ Stop' : '🎙 Dictate'}
            </button>
            <input ref={fileInputRef} type="file" accept=".txt,.pdf,.md,.doc,.docx" onChange={handleFileAttach} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: '#0F1A55', border: '1px solid #1E2F80', color: '#4A5E9A' }}
              title="Attach a reference file">
              📎 Attach Reference
            </button>
            {voiceStatus === 'listening' && (
              <div className="flex gap-1 items-end h-6 ml-2">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="w-1 rounded-full" style={{ background: '#2845D6', height: `${8 + Math.random() * 14}px`, animation: `waveBar 0.6s ${i*0.1}s ease-in-out infinite`, transformOrigin: 'bottom' }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right insights panel */}
      {view === 'write' && entries[0]?.aiInsights?.analyzed && (
        <div className="hidden xl:flex flex-col w-72 border-l overflow-y-auto p-5 flex-shrink-0" style={{ borderColor: '#1E2F80', background: '#0A1240' }}>
          <p style={{ fontSize: '9px', color: '#4A5E9A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Latest Insights</p>
          <div className="flex flex-col gap-4">
            {entries[0].aiInsights.summary && (
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: '14px', color: '#8A9FD8', lineHeight: 1.7 }}>{entries[0].aiInsights.summary}</p>
            )}
            <InsightBadge label="Emotions" color="#7eb8d4" items={entries[0].aiInsights.emotions} />
            <InsightBadge label="Themes" color="#2845D6" items={entries[0].aiInsights.themes} />
            <InsightBadge label="Biases" color="#F68048" items={entries[0].aiInsights.biasesDetected} />
          </div>
        </div>
      )}
    </div>
  );
}