import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import api from '../api/axios';

function InsightCard({ entry }) {
  if (!entry?.aiInsights?.analyzed) return (
    <div className="text-[9px] text-ink-700 uppercase tracking-wider animate-pulse">Analyzing your entry...</div>
  );
  const { emotions, themes, biasesDetected, summary } = entry.aiInsights;
  return (
    <div className="flex flex-col gap-4">
      {summary && <p className="text-xs text-ink-400 font-serif italic leading-relaxed">{summary}</p>}
      {emotions?.length > 0 && (
        <div>
          <div className="text-[9px] text-ink-700 uppercase tracking-wider mb-2">Emotions Detected</div>
          <div className="flex flex-wrap gap-1">
            {emotions.map(e => <span key={e} className="px-2 py-0.5 bg-mirror/10 border border-mirror/20 text-mirror text-[10px] rounded-full">{e}</span>)}
          </div>
        </div>
      )}
      {themes?.length > 0 && (
        <div>
          <div className="text-[9px] text-ink-700 uppercase tracking-wider mb-2">Recurring Themes</div>
          <div className="flex flex-wrap gap-1">
            {themes.map(t => <span key={t} className="px-2 py-0.5 bg-ink-900 border border-ink-800 text-ink-400 text-[10px] rounded-full">{t}</span>)}
          </div>
        </div>
      )}
      {biasesDetected?.length > 0 && (
        <div>
          <div className="text-[9px] text-ink-700 uppercase tracking-wider mb-2">Biases Flagged</div>
          {biasesDetected.map(b => (
            <div key={b.name} className="mb-2 p-2 bg-forge/5 border border-forge/15 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-forge font-mono">{b.name}</span>
                <span className="text-[9px] text-ink-700">severity {b.severity}/10</span>
              </div>
              <p className="text-[10px] text-ink-500 leading-relaxed">{b.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function JournalPage() {
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState('write'); // write | entries

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Write freely. The Oracle is watching, not judging. Let your thoughts flow...' })
    ],
    editorProps: {
      attributes: { class: 'font-serif text-base text-ink-200 leading-loose focus:outline-none min-h-64 p-1' }
    }
  });

  useEffect(() => {
    api.get('/journal').then(({ data }) => setEntries(data)).catch(() => {});
  }, []);

  async function save() {
    const html = editor?.getHTML();
    const text = editor?.getText();
    if (!text?.trim() || text.trim().length < 20) return;
    setSaving(true);
    try {
      const { data } = await api.post('/journal', {
        content: html, contentText: text, wordCount: text.split(' ').length
      });
      setEntries(prev => [data, ...prev]);
      editor?.commands.clearContent();
      // Poll for AI insights
      const poll = setInterval(async () => {
        try {
          const { data: updated } = await api.get(`/journal/${data._id}`);
          if (updated.aiInsights?.analyzed) {
            setEntries(prev => prev.map(e => e._id === updated._id ? updated : e));
            clearInterval(poll);
          }
        } catch { clearInterval(poll); }
      }, 3000);
      setTimeout(() => clearInterval(poll), 60000);
    } catch {}
    setSaving(false);
  }

  return (
    <div className="flex h-full">
      {/* Editor */}
      <div className="flex-1 flex flex-col p-6 md:p-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl text-ink-100">Mirror</h1>
            <p className="text-[10px] text-ink-700 uppercase tracking-wider mt-1">Private Journal · AI Analyzes Every Entry</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView(v => v === 'write' ? 'entries' : 'write')}
              className="btn-ghost text-[9px]">{view === 'write' ? `Past Entries (${entries.length})` : 'Write'}</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </div>

        {view === 'write' ? (
          <div className="card flex-1">
            <div className="text-[9px] text-ink-800 uppercase tracking-widest mb-4">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <EditorContent editor={editor} />
          </div>
        ) : (
          <div className="flex flex-col gap-3 overflow-y-auto">
            {entries.length === 0 && <p className="text-ink-700 text-sm font-serif italic">No entries yet. Start writing.</p>}
            {entries.map(e => (
              <div key={e._id} onClick={() => setSelectedEntry(e === selectedEntry ? null : e)}
                className="card cursor-pointer hover:border-ink-700 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="text-[9px] text-ink-700 uppercase tracking-wider">
                    {new Date(e.createdAt).toLocaleDateString()} · {e.wordCount} words
                  </div>
                  {e.aiInsights?.analyzed
                    ? <span className="text-[8px] text-mirror uppercase tracking-wider">Analyzed</span>
                    : <span className="text-[8px] text-ink-700 uppercase tracking-wider animate-pulse">Analyzing...</span>}
                </div>
                <div className="text-sm text-ink-400 font-serif italic line-clamp-2" dangerouslySetInnerHTML={{ __html: e.content }} />
                {selectedEntry?._id === e._id && (
                  <div className="mt-4 pt-4 border-t border-ink-800">
                    <InsightCard entry={e} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right panel — latest insights */}
      {entries[0]?.aiInsights?.analyzed && view === 'write' && (
        <div className="hidden lg:flex flex-col w-72 border-l border-ink-900 p-5 overflow-y-auto">
          <div className="text-[9px] text-ink-700 uppercase tracking-wider mb-4">Latest Insights</div>
          <InsightCard entry={entries[0]} />
        </div>
      )}
    </div>
  );
}
