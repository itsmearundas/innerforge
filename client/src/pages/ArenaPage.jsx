import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store';
import api from '../api/axios';

const SIDE_COLORS = { for: '#7ec47e', against: '#FF6B6B', neutral: '#8A9FD8' };

export default function ArenaPage() {
  const { user } = useAuthStore();
  const [ideas, setIdeas] = useState([]);
  const [publicIdeas, setPublicIdeas] = useState([]);
  const [view, setView] = useState('lobby');
  const [roomCode, setRoomCode] = useState('');
  const [debate, setDebate] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [side, setSide] = useState('for');
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get('/forge').then(({ data }) => setIdeas(data.filter(i => i.attacks?.length > 0))).catch(() => {});
    api.get('/forge/public').then(({ data }) => setPublicIdeas(data)).catch(() => {});
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function createRoom(ideaId) {
    const { data } = await api.post('/arena/create', { ideaId });
    joinSocket(data.roomCode, data);
  }

  async function joinRoom() {
    if (!roomCode.trim()) return;
    const { data } = await api.post('/arena/join', { roomCode: roomCode.toUpperCase() });
    joinSocket(data.roomCode, data);
  }

  function joinSocket(code, debateData) {
    const socket = io();
    socketRef.current = socket;
    socket.emit('join_room', { roomCode: code, user: { name: user.name } });
    socket.on('new_message', msg => setMessages(prev => [...prev, msg]));
    socket.on('user_joined', ({ name }) => setMessages(prev => [...prev, { system: true, text: `${name} joined the arena` }]));
    socket.on('debate_ended', () => setMessages(prev => [...prev, { system: true, text: 'Debate ended' }]));
    setDebate(debateData); setView('debate');
  }

  function sendMsg() {
    if (!msgInput.trim() || !socketRef.current) return;
    socketRef.current.emit('debate_message', { roomCode: debate.roomCode, message: msgInput, userId: user._id, userName: user.name, side });
    setMsgInput('');
  }

  function endDebate() {
    socketRef.current?.emit('end_debate', { roomCode: debate.roomCode });
    socketRef.current?.disconnect();
    setView('lobby'); setDebate(null); setMessages([]);
  }

  return (
    <div className="flex h-full" style={{ background: '#060D33' }}>
      {view === 'lobby' ? (
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl">
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', color: '#E8EEFF', fontWeight: 400, marginBottom: '4px' }}>The Arena</h1>
            <p style={{ fontSize: '10px', color: '#4A5E9A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '32px' }}>Live Debates · Community Stress-Testing</p>

            <div className="flex flex-col gap-5">
              {/* Create room */}
              <div className="p-6 rounded-2xl" style={{ background: '#0F1A55', border: '1px solid #1E2F80' }}>
                <p style={{ fontSize: '10px', color: '#4A5E9A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Challenge a Friend to Debate Your Idea</p>
                {ideas.length === 0
                  ? <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: '#2A3A70', fontSize: '14px' }}>Stress-test an idea in the Forge first to use it here.</p>
                  : <div className="flex flex-col gap-2">
                    {ideas.map(idea => (
                      <div key={idea._id} onClick={() => createRoom(idea._id)}
                        className="flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all hover:brightness-110"
                        style={{ background: '#060D33', border: '1px solid #1E2F80' }}>
                        <span style={{ fontSize: '14px', color: '#E8EEFF', fontFamily: 'Cormorant Garamond, serif' }}>{idea.title}</span>
                        <span className="btn-primary text-xs px-3 py-1.5">Host →</span>
                      </div>
                    ))}
                  </div>
                }
              </div>

              {/* Join room */}
              <div className="p-6 rounded-2xl" style={{ background: '#0F1A55', border: '1px solid #1E2F80' }}>
                <p style={{ fontSize: '10px', color: '#4A5E9A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Join a Debate</p>
                <div className="flex gap-3">
                  <input className="input-field flex-1" style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}
                    placeholder="ROOM CODE" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} maxLength={6} />
                  <button onClick={joinRoom} className="btn-primary px-6">Join</button>
                </div>
              </div>

              {/* Community */}
              {publicIdeas.length > 0 && (
                <div className="p-6 rounded-2xl" style={{ background: '#0F1A55', border: '1px solid #1E2F80' }}>
                  <p style={{ fontSize: '10px', color: '#4A5E9A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Community Ideas · Idea of the Week</p>
                  {publicIdeas.map(idea => (
                    <div key={idea._id} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #1E2F80' }}>
                      <div>
                        <p style={{ fontSize: '14px', color: '#E8EEFF', fontFamily: 'Cormorant Garamond, serif' }}>{idea.title}</p>
                        <p style={{ fontSize: '10px', color: '#4A5E9A' }}>by {idea.user?.name}</p>
                      </div>
                      <button onClick={() => api.post(`/forge/${idea._id}/upvote`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all hover:brightness-110"
                        style={{ background: '#F6804815', border: '1px solid #F6804830', color: '#F68048', fontSize: '12px' }}>
                        ↑ {idea.upvotes}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Debate header */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#1E2F80', background: '#0A1240' }}>
            <div className="flex items-center gap-4">
              <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: '#E8EEFF' }}>Arena</span>
              <span style={{ fontSize: '11px', color: '#F68048', background: '#F6804815', border: '1px solid #F6804830', padding: '4px 12px', borderRadius: '20px', letterSpacing: '0.12em', fontWeight: 600 }}>{debate?.roomCode}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#060D33' }}>
                {['for','against','neutral'].map(s => (
                  <button key={s} onClick={() => setSide(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                    style={{ background: side === s ? `${SIDE_COLORS[s]}20` : 'transparent', color: side === s ? SIDE_COLORS[s] : '#4A5E9A', border: side === s ? `1px solid ${SIDE_COLORS[s]}40` : '1px solid transparent' }}>
                    {s}
                  </button>
                ))}
              </div>
              <button onClick={endDebate} className="btn-danger text-xs">Leave</button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
            {messages.map((m, i) => m.system ? (
              <div key={i} className="text-center" style={{ fontSize: '9px', color: '#2A3A70', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px' }}>{m.text}</div>
            ) : (
              <div key={i} className={`flex flex-col ${m.userId === user._id ? 'items-end' : 'items-start'}`}>
                <div style={{ fontSize: '9px', color: '#2A3A70', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{m.userName} · {m.side}</div>
                <div style={{
                  maxWidth: '70%', padding: '12px 16px', borderRadius: m.userId === user._id ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                  background: `${SIDE_COLORS[m.side]}15`, border: `1px solid ${SIDE_COLORS[m.side]}30`,
                  color: SIDE_COLORS[m.side], fontSize: '14px', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', lineHeight: 1.6
                }}>{m.text}</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-6 py-4 border-t flex gap-3 flex-shrink-0" style={{ borderColor: '#1E2F80', background: '#0A1240' }}>
            <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()}
              placeholder={`Make your ${side} argument...`}
              className="input-field flex-1" />
            <button onClick={sendMsg} className="btn-primary px-5">Send</button>
          </div>
        </div>
      )}
    </div>
  );
}