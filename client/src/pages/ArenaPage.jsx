import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store';
import api from '../api/axios';

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    socket.on('user_joined', ({ name }) => setMessages(prev => [...prev, { system: true, text: `${name} joined the debate` }]));
    socket.on('debate_ended', () => setMessages(prev => [...prev, { system: true, text: 'Debate ended' }]));
    setDebate(debateData);
    setView('debate');
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
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-ink-100">The Arena</h1>
          <p className="text-[10px] text-ink-700 uppercase tracking-wider mt-1">Live Debates · Community Stress-Testing</p>
        </div>
        {view === 'debate' && (
          <button onClick={endDebate} className="btn-ghost text-[9px]">Leave Arena</button>
        )}
      </div>

      {view === 'lobby' && (
        <div className="flex flex-col gap-6">
          {/* Create room */}
          <div className="card">
            <div className="text-[9px] text-ink-700 uppercase tracking-wider mb-3">Invite Someone to Debate Your Idea</div>
            <div className="flex flex-col gap-2">
              {ideas.length === 0 && <p className="text-ink-700 text-xs font-serif italic">Stress-test an idea in the Forge first.</p>}
              {ideas.map(idea => (
                <div key={idea._id} onClick={() => createRoom(idea._id)}
                  className="flex items-center justify-between p-3 bg-ink-950 border border-ink-900 rounded-lg cursor-pointer hover:border-ink-700 transition-all">
                  <span className="text-sm text-ink-300 font-serif">{idea.title}</span>
                  <span className="text-[9px] text-arena uppercase tracking-wider">Host →</span>
                </div>
              ))}
            </div>
          </div>

          {/* Join room */}
          <div className="card">
            <div className="text-[9px] text-ink-700 uppercase tracking-wider mb-3">Join a Debate</div>
            <div className="flex gap-2">
              <input className="input-field flex-1 uppercase tracking-widest" placeholder="ROOM CODE" value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())} maxLength={6} />
              <button onClick={joinRoom} className="btn-primary">Join</button>
            </div>
          </div>

          {/* Public ideas */}
          {publicIdeas.length > 0 && (
            <div className="card">
              <div className="text-[9px] text-ink-700 uppercase tracking-wider mb-3">Community Ideas · Upvote the Strongest</div>
              {publicIdeas.map(idea => (
                <div key={idea._id} className="flex items-center justify-between py-2 border-b border-ink-900 last:border-0">
                  <div>
                    <div className="text-sm text-ink-300 font-serif">{idea.title}</div>
                    <div className="text-[9px] text-ink-700">by {idea.user?.name}</div>
                  </div>
                  <button onClick={() => api.post(`/forge/${idea._id}/upvote`)}
                    className="text-[10px] text-ink-600 hover:text-forge transition-colors px-2">
                    ↑ {idea.upvotes}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'debate' && debate && (
        <div className="flex flex-col" style={{ height: '70vh' }}>
          <div className="card mb-3 flex items-center justify-between py-2">
            <div>
              <span className="text-[9px] text-ink-700 uppercase tracking-wider">Room </span>
              <span className="text-xs text-arena font-mono tracking-widest">{debate.roomCode}</span>
            </div>
            <div className="flex gap-1">
              {['for','against','neutral'].map(s => (
                <button key={s} onClick={() => setSide(s)}
                  className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded border transition-all ${side===s ? 'border-arena/40 text-arena bg-arena/10' : 'border-ink-900 text-ink-700'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto card mb-3 flex flex-col gap-3">
            {messages.map((m, i) => m.system ? (
              <div key={i} className="text-center text-[9px] text-ink-700 uppercase tracking-wider py-1">{m.text}</div>
            ) : (
              <div key={i} className={`flex flex-col ${m.userId === user._id ? 'items-end' : 'items-start'}`}>
                <div className="text-[8px] text-ink-700 uppercase tracking-wider mb-1">
                  {m.userName} · {m.side}
                </div>
                <div className={`max-w-xs px-3 py-2 rounded-xl text-xs font-serif italic leading-relaxed ${
                  m.side === 'for' ? 'bg-coach/10 border border-coach/20 text-coach' :
                  m.side === 'against' ? 'bg-forge/10 border border-forge/20 text-forge' :
                  'bg-ink-900 border border-ink-800 text-ink-300'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2">
            <input value={msgInput} onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg()}
              placeholder="Make your argument..."
              className="input-field flex-1" />
            <button onClick={sendMsg} className="btn-primary">Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
