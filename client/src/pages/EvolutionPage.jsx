import { useEffect, useState } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Area, AreaChart } from 'recharts';
import api from '../api/axios';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F1A55', border: '1px solid #1E2F80', borderRadius: '10px', padding: '8px 12px', fontSize: '11px', color: '#E8EEFF' }}>
      <p style={{ color: '#4A5E9A', marginBottom: '2px' }}>{label}</p>
      <p style={{ color: '#F68048' }}>{payload[0]?.value}</p>
    </div>
  );
};

export default function EvolutionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/profile/evolution').then(({ data }) => { setData(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full" style={{ background: '#060D33' }}>
      <div className="flex gap-1 items-end">
        {[0,1,2,3,4].map(i => <div key={i} className="w-1.5 rounded-full" style={{ height: '24px', background: '#2845D6', animation: `waveBar 0.8s ${i*0.15}s ease-in-out infinite`, transformOrigin: 'bottom' }} />)}
      </div>
    </div>
  );

  if (!data?.profile) return (
    <div className="flex flex-col items-center justify-center h-full gap-4" style={{ background: '#060D33' }}>
      <div style={{ fontSize: '48px', opacity: 0.2 }}>◉</div>
      <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: '#4A5E9A', fontWeight: 400 }}>Evolution Unlocks at 3 Entries</h2>
      <p style={{ fontSize: '13px', color: '#2A3A70' }}>Keep journaling to track your psychological growth.</p>
    </div>
  );

  const { profile, entries, narrative } = data;
  const biasData = profile.topBiases?.map(b => ({ subject: b.name?.split(' ')[0] || b.name, strength: b.strength })) || [];
  const moodData = entries?.slice(-20).map(e => ({ date: new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), mood: e.mood || 5 })) || [];

  return (
    <div className="p-8 overflow-y-auto" style={{ background: '#060D33', minHeight: '100%' }}>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', color: '#E8EEFF', fontWeight: 400 }}>Evolution</h1>
          <p style={{ fontSize: '10px', color: '#4A5E9A', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '4px' }}>Your Psychological Growth Over Time</p>
        </div>

        {/* Narrative */}
        {narrative && (
          <div className="mb-6 p-6 rounded-2xl" style={{ background: '#0F1A55', border: '1px solid #2845D640', boxShadow: '0 0 40px #2845D615' }}>
            <p style={{ fontSize: '9px', color: '#2845D6', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Oracle Growth Narrative</p>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: '#E8EEFF', fontStyle: 'italic', lineHeight: 1.8 }}>{narrative}</p>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {biasData.length >= 3 && (
            <div className="p-5 rounded-2xl" style={{ background: '#0F1A55', border: '1px solid #1E2F80' }}>
              <p style={{ fontSize: '9px', color: '#4A5E9A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Bias Radar</p>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={biasData}>
                  <PolarGrid stroke="#1E2F80" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#4A5E9A', fontSize: 10, fontFamily: 'DM Mono' }} />
                  <Radar name="bias" dataKey="strength" stroke="#F68048" fill="#F68048" fillOpacity={0.15} strokeWidth={1.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
          {moodData.length >= 3 && (
            <div className="p-5 rounded-2xl" style={{ background: '#0F1A55', border: '1px solid #1E2F80' }}>
              <p style={{ fontSize: '9px', color: '#4A5E9A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Mood Timeline</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={moodData}>
                  <defs>
                    <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2845D6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2845D6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#4A5E9A', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[1,10]} tick={{ fill: '#4A5E9A', fontSize: 9 }} axisLine={false} tickLine={false} width={20} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="mood" stroke="#2845D6" fill="url(#moodGrad)" strokeWidth={2} dot={{ fill: '#F68048', r: 3, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bias cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {profile.topBiases?.slice(0, 4).map(bias => (
            <div key={bias.name} className="p-5 rounded-2xl" style={{ background: '#0F1A55', border: '1px solid #1E2F80' }}>
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontSize: '13px', color: '#F68048', fontWeight: 500 }}>{bias.name}</span>
                <span style={{ fontSize: '10px', color: '#4A5E9A' }}>{bias.strength}/100</span>
              </div>
              <div className="w-full h-1.5 rounded-full mb-3" style={{ background: '#1E2F80' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${bias.strength}%`, background: bias.strength > 70 ? '#FF6B6B' : bias.strength > 40 ? '#F68048' : '#7ec47e' }} />
              </div>
              <p style={{ fontSize: '11px', color: '#4A5E9A', lineHeight: 1.5 }}>{bias.description}</p>
            </div>
          ))}
        </div>

        {/* Profile details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profile.decisionPattern && (
            <div className="p-5 rounded-2xl" style={{ background: '#0F1A55', border: '1px solid #2845D640' }}>
              <p style={{ fontSize: '9px', color: '#2845D6', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Decision Pattern</p>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: '15px', color: '#E8EEFF', lineHeight: 1.7 }}>{profile.decisionPattern}</p>
            </div>
          )}
          {profile.growthAreas?.length > 0 && (
            <div className="p-5 rounded-2xl" style={{ background: '#0F1A55', border: '1px solid #7ec47e30' }}>
              <p style={{ fontSize: '9px', color: '#7ec47e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Growth Areas</p>
              <div className="flex flex-wrap gap-2">
                {profile.growthAreas.map(a => <span key={a} style={{ fontSize: '11px', color: '#7ec47e', background: '#7ec47e10', border: '1px solid #7ec47e25', padding: '3px 10px', borderRadius: '20px' }}>{a}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}