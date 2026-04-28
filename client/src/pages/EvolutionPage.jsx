import { useEffect, useState } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import api from '../api/axios';

export default function EvolutionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/profile/evolution').then(({ data }) => { setData(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-ink-700 text-xs font-mono animate-pulse">Loading your evolution...</div>;
  if (!data?.profile) return (
    <div className="p-8">
      <h1 className="font-serif text-2xl text-ink-100 mb-2">Evolution</h1>
      <p className="text-ink-600 font-serif italic">Write at least 3 journal entries to begin tracking your psychological evolution.</p>
    </div>
  );

  const { profile, entries, narrative } = data;

  const biasRadarData = profile.topBiases?.map(b => ({ subject: b.name.split(' ')[0], strength: b.strength })) || [];

  const emotionTimeline = entries?.slice(-20).map(e => ({
    date: new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    mood: e.mood || 5,
  })) || [];

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-serif text-2xl text-ink-100">Evolution</h1>
        <p className="text-[10px] text-ink-700 uppercase tracking-wider mt-1">Your Psychological Growth Over Time</p>
      </div>

      {narrative && (
        <div className="card mb-6 border-coach/20 bg-coach/5">
          <div className="text-[9px] text-coach uppercase tracking-wider mb-3">Oracle Growth Narrative</div>
          <p className="text-base text-ink-200 font-serif italic leading-relaxed">{narrative}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {biasRadarData.length >= 3 && (
          <div className="card">
            <div className="text-[9px] text-ink-700 uppercase tracking-wider mb-4">Bias Radar</div>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={biasRadarData}>
                <PolarGrid stroke="#1e1e2a" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#4a4a62', fontSize: 10, fontFamily: 'DM Mono' }} />
                <Radar name="bias" dataKey="strength" stroke="#e8a84c" fill="#e8a84c" fillOpacity={0.15} strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {emotionTimeline.length >= 3 && (
          <div className="card">
            <div className="text-[9px] text-ink-700 uppercase tracking-wider mb-4">Mood Timeline</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={emotionTimeline}>
                <XAxis dataKey="date" tick={{ fill: '#3a3a52', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={[1,10]} tick={{ fill: '#3a3a52', fontSize: 9 }} axisLine={false} tickLine={false} width={20} />
                <Tooltip contentStyle={{ background: '#0a0a18', border: '1px solid #1e1e2a', borderRadius: 8, fontSize: 10, fontFamily: 'DM Mono' }} />
                <Line type="monotone" dataKey="mood" stroke="#7eb8d4" strokeWidth={1.5} dot={{ fill: '#7eb8d4', r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Profile snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profile.topBiases?.slice(0, 4).map(bias => (
          <div key={bias.name} className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-forge font-mono">{bias.name}</span>
              <span className="text-[9px] text-ink-700">{bias.strength}/100</span>
            </div>
            <div className="w-full h-1 bg-ink-900 rounded-full">
              <div className="h-full rounded-full transition-all" style={{ width: `${bias.strength}%`, background: bias.strength > 70 ? '#e8a84c' : bias.strength > 40 ? '#7eb8d4' : '#7ec47e' }} />
            </div>
            <p className="text-[10px] text-ink-600 mt-2 leading-relaxed">{bias.description}</p>
          </div>
        ))}
      </div>

      {profile.decisionPattern && (
        <div className="card mt-4 border-mirror/20">
          <div className="text-[9px] text-mirror uppercase tracking-wider mb-2">Your Decision Pattern</div>
          <p className="text-sm text-ink-300 font-serif italic">{profile.decisionPattern}</p>
        </div>
      )}
    </div>
  );
}
