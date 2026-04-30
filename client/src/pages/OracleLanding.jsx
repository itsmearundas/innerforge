import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOracleStore } from '../store';
import api from '../api/axios';

const MC = { mirror:'#3A8FA8', forge:'#C8834A', coach:'#5A9A6A', arena:'#8A6AB8', auto:'#2A6B85' };
const ML = { mirror:'Mirror', forge:'Forge', coach:'Coach', arena:'Arena', auto:'Oracle' };
const STAGES = { stranger:'First Encounter', acquaintance:'Building Trust', familiar:'Trusted Advisor', intimate:'Deep Bond' };
const NAV_MAP = {
  'open mirror':'/journal','mirror':'/journal','journal':'/journal',
  'open forge':'/forge','forge':'/forge','test idea':'/forge','stress test':'/forge',
  'open arena':'/arena','arena':'/arena','debate':'/arena',
  'open evolution':'/evolution','evolution':'/evolution','my growth':'/evolution','growth':'/evolution',
};
const WAKE_WORDS = ['hey oracle','oracle','innerforge','inner forge'];

export default function OracleLanding() {
  const navigate = useNavigate();
  const { insights, dismissInsight } = useOracleStore();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('auto');
  const [listenStatus, setListenStatus] = useState('idle');
  const [stage, setStage] = useState('stranger');
  const [exchanges, setExchanges] = useState(0);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [convoMode, setConvoMode] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState(0);
  const [wakeFlash, setWakeFlash] = useState(false);
  const [micError, setMicError] = useState('');

  const canvasRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const mainRecRef = useRef(null);
  const wakeRecRef = useRef(null);
  const animRef = useRef(null);
  const tRef = useRef(0);
  const bottomRef = useRef(null);
  const autoTimerRef = useRef(null);
  const convoModeRef = useRef(false);
  convoModeRef.current = convoMode;
  const listenStatusRef = useRef('idle');
  listenStatusRef.current = listenStatus;
  const loadingRef = useRef(false);
  loadingRef.current = loading;

  // Load history
  useEffect(() => {
    api.get('/oracle/history').then(function(res) {
      var data = res.data;
      setMessages(data.messages || []);
      setStage(data.relationshipStage || 'stranger');
      setExchanges(data.totalExchanges || 0);
      setHistoryLoaded(true);
    }).catch(function() { setHistoryLoaded(true); });
  }, []);

  useEffect(function() {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Canvas wave
  useEffect(function() {
    var canvas = canvasRef.current;
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
    resize();
    window.addEventListener('resize', resize);
    function draw() {
      var width = canvas.width;
      var height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      var st = listenStatusRef.current;
      tRef.current += st === 'idle' ? 0.005 : st === 'thinking' ? 0.018 : 0.028;
      var t = tRef.current;
      var amp = st !== 'idle' ? 42 : 10;
      var currentMode = mode;
      var mc = MC[currentMode] || MC.auto;
      var layers = [[mc, 0.55, 0], ['#C8834A', 0.2, 1], ['#3A8FA8', 0.2, 2]];
      layers.forEach(function(item) {
        var hex = item[0]; var alpha = item[1]; var layer = item[2];
        ctx.beginPath();
        for (var i = 0; i <= 100; i++) {
          var x = (i / 100) * width;
          var y = height / 2 + Math.sin(t * (1 + layer * 0.4) + i * 0.1 + layer * 1.5) * amp * (1 + Math.sin(t * 0.5 + i * 0.06) * 0.35);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        var r = parseInt(hex.slice(1,3), 16);
        var g = parseInt(hex.slice(3,5), 16);
        var b = parseInt(hex.slice(5,7), 16);
        ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
        ctx.lineWidth = st !== 'idle' ? 2.2 - layer * 0.4 : 1.2 - layer * 0.2;
        ctx.stroke();
        if (st !== 'idle' && layer === 0) {
          for (var j = 0; j < 100; j += 6) {
            var px = (j / 100) * width + (Math.random() - 0.5) * 8;
            var py = height / 2 + Math.sin(t * (1 + layer * 0.4) + j * 0.1 + layer * 1.5) * amp * (1 + Math.sin(t * 0.5 + j * 0.06) * 0.35) + (Math.random() - 0.5) * 10;
            ctx.beginPath();
            ctx.arc(px, py, Math.random() * 1.8 + 0.3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha * 0.5) + ')';
            ctx.fill();
          }
        }
      });
      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return function() { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, [mode]);

  // Speak
  const speak = useCallback(function(responseText, m) {
    var s = synthRef.current;
    s.cancel();
    var u = new SpeechSynthesisUtterance(responseText);
    u.rate = 0.9;
    u.pitch = m === 'forge' ? 0.82 : m === 'mirror' ? 1.1 : 0.95;
    u.volume = 0.92;
    var voices = s.getVoices();
    var v = voices.find(function(x) { return x.lang.startsWith('en') && (x.name.includes('Google') || x.name.includes('Samantha') || x.name.includes('Daniel')); })
          || voices.find(function(x) { return x.lang.startsWith('en'); });
    if (v) u.voice = v;
    u.onstart = function() { setListenStatus('speaking'); };
    u.onend = function() {
      setListenStatus('idle');
      if (convoModeRef.current) {
        var cd = 3;
        setAutoCountdown(cd);
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = setInterval(function() {
          cd--;
          setAutoCountdown(cd);
          if (cd <= 0) {
            clearInterval(autoTimerRef.current);
            setAutoCountdown(0);
            startListening(true);
          }
        }, 1000);
      }
    };
    u.onerror = function() { setListenStatus('idle'); };
    s.speak(u);
  }, []);

  // Send message
  const sendMessage = useCallback(function(userText, bgContext) {
    if (!userText || !userText.trim() || loadingRef.current) return;
    setText('');
    setInterimText('');
    clearInterval(autoTimerRef.current);
    setAutoCountdown(0);

    var lower = userText.toLowerCase();
    var navKeys = Object.keys(NAV_MAP);
    for (var k = 0; k < navKeys.length; k++) {
      if (lower.includes(navKeys[k])) {
        navigate(NAV_MAP[navKeys[k]]);
        return;
      }
    }

    var userMsg = { role: 'user', content: userText, timestamp: new Date() };
    setMessages(function(prev) { return prev.concat([userMsg]); });
    setLoading(true);
    setListenStatus('thinking');

    api.post('/oracle/chat', { message: userText.trim(), backgroundContext: bgContext || null })
      .then(function(res) {
        var data = res.data;
        var aiMsg = { role: 'ai', content: data.text, mode: data.mode, timestamp: new Date() };
        setMessages(function(prev) { return prev.concat([aiMsg]); });
        setMode(data.mode || 'auto');
        setStage(data.relationshipStage || 'stranger');
        setExchanges(data.totalExchanges || 0);
        setLoading(false);
        speak(data.text, data.mode);
      })
      .catch(function() {
        var errMsg = { role: 'ai', content: 'Oracle is temporarily unreachable.', mode: 'auto', timestamp: new Date() };
        setMessages(function(prev) { return prev.concat([errMsg]); });
        setLoading(false);
        setListenStatus('idle');
      });
  }, [navigate, speak]);

  // Start main listening
  const startListening = useCallback(function(isAutoLoop) {
    if (wakeRecRef.current) {
      try { wakeRecRef.current.stop(); } catch(e) {}
      wakeRecRef.current = null;
    }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setMicError('Voice not supported. Use Chrome or Edge.'); return; }
    if (mainRecRef.current) return;

    setMicError('');

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function(stream) {
        stream.getTracks().forEach(function(track) { track.stop(); });
        var rec = new SR();
        rec.lang = 'en-US';
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        rec.continuous = false;
        mainRecRef.current = rec;

        var finalText = '';
        var autoTimeout = isAutoLoop ? setTimeout(function() { try { rec.stop(); } catch(e) {} }, 12000) : null;

        rec.onstart = function() {
          setListenStatus('listening');
          setInterimText('');
        };

        rec.onresult = function(e) {
          var interim = '';
          var final = '';
          for (var i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) final += e.results[i][0].transcript;
            else interim += e.results[i][0].transcript;
          }
          if (final) finalText += final;
          setInterimText(interim || finalText);
          if (autoTimeout) {
            clearTimeout(autoTimeout);
            autoTimeout = setTimeout(function() { try { rec.stop(); } catch(e) {} }, 12000);
          }
        };

        rec.onend = function() {
          clearTimeout(autoTimeout);
          mainRecRef.current = null;
          setListenStatus('idle');
          setInterimText('');
          if (finalText.trim()) {
            sendMessage(finalText.trim());
          } else if (convoModeRef.current) {
            setTimeout(startWakeListener, 1500);
          }
        };

        rec.onerror = function(e) {
          clearTimeout(autoTimeout);
          mainRecRef.current = null;
          setListenStatus('idle');
          setInterimText('');
          if (e.error === 'not-allowed') {
            setMicError('Mic access denied. Click the lock icon in the address bar and allow microphone.');
          } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
            setMicError('Mic error: ' + e.error);
          }
          if (convoModeRef.current && e.error !== 'aborted') {
            setTimeout(startWakeListener, 1500);
          }
        };

        rec.start();
      })
      .catch(function() {
        setMicError('Mic access denied. Click the lock icon in the address bar and allow microphone.');
      });
  }, [sendMessage]);

  // Wake word listener
  const startWakeListener = useCallback(function() {
    if (!convoModeRef.current) return;
    if (wakeRecRef.current || mainRecRef.current) return;
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    try {
      var rec = new SR();
      rec.lang = 'en-US';
      rec.continuous = true;
      rec.interimResults = true;
      wakeRecRef.current = rec;
      rec.onresult = function(e) {
        var txt = Array.from(e.results).map(function(r) { return r[0].transcript; }).join(' ').toLowerCase();
        var detected = WAKE_WORDS.some(function(w) { return txt.includes(w); });
        if (detected && listenStatusRef.current === 'idle') {
          setWakeFlash(true);
          setTimeout(function() { setWakeFlash(false); }, 1500);
          try { rec.stop(); } catch(e) {}
          wakeRecRef.current = null;
          setTimeout(function() { startListening(false); }, 800);
        }
      };
      rec.onend = function() {
        wakeRecRef.current = null;
        if (convoModeRef.current && !mainRecRef.current) {
          setTimeout(startWakeListener, 1000);
        }
      };
      rec.onerror = function() { wakeRecRef.current = null; };
      rec.start();
    } catch(e) {}
  }, [startListening]);

  // Conversation mode toggle
  useEffect(function() {
    if (convoMode) {
      startWakeListener();
    } else {
      if (wakeRecRef.current) { try { wakeRecRef.current.stop(); } catch(e) {} wakeRecRef.current = null; }
      clearInterval(autoTimerRef.current);
      setAutoCountdown(0);
    }
  }, [convoMode, startWakeListener]);

  // Cleanup
  useEffect(function() {
    return function() {
      cancelAnimationFrame(animRef.current);
      if (synthRef.current) synthRef.current.cancel();
      if (mainRecRef.current) { try { mainRecRef.current.stop(); } catch(e) {} }
      if (wakeRecRef.current) { try { wakeRecRef.current.stop(); } catch(e) {} }
      clearInterval(autoTimerRef.current);
    };
  }, []);

  function handleOrbClick() {
    clearInterval(autoTimerRef.current);
    setAutoCountdown(0);
    if (listenStatus === 'speaking') { synthRef.current.cancel(); setListenStatus('idle'); return; }
    if (listenStatus === 'listening') { if (mainRecRef.current) { try { mainRecRef.current.stop(); } catch(e) {} } return; }
    if (listenStatus === 'idle') startListening(false);
  }

  function clearHistory() {
    if (!confirm('Start fresh with Oracle?')) return;
    api.delete('/oracle/history');
    setMessages([]);
    setStage('stranger');
    setExchanges(0);
  }

  var mColor = MC[mode] || MC.auto;
  var statusLabel = listenStatus === 'listening' ? 'listening...'
    : listenStatus === 'thinking' ? 'thinking...'
    : listenStatus === 'speaking' ? 'speaking'
    : autoCountdown > 0 ? ('auto-listening in ' + autoCountdown + 's...')
    : convoMode ? 'say "hey oracle" anytime'
    : 'tap orb or mic to speak';

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#040C10' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px', borderBottom:'1px solid #163040', background:'#071A24', flexShrink:0 }}>
        <div>
          <h1 style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'22px', color:'#E8F4F6', fontWeight:400 }}>The Oracle</h1>
          <p style={{ fontSize:'9px', color:'#3A6070', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:'2px' }}>{STAGES[stage]} · {exchanges} conversations</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          {wakeFlash && <span style={{ fontSize:'9px', color:mColor, letterSpacing:'0.1em', textTransform:'uppercase' }}>🎙 WAKE!</span>}
          <button onClick={function() { setConvoMode(function(c) { return !c; }); }}
            style={{ display:'flex', alignItems:'center', gap:'7px', padding:'7px 14px', borderRadius:'20px', fontSize:'10px', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:500, cursor:'pointer', transition:'all 0.3s', border:'1px solid', background: convoMode ? (mColor + '15') : 'transparent', borderColor: convoMode ? mColor : '#163040', color: convoMode ? mColor : '#3A6070' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: convoMode ? mColor : '#3A6070', boxShadow: convoMode ? ('0 0 6px ' + mColor) : 'none', transition:'all 0.3s' }} />
            {convoMode ? 'Conversation On' : 'Conversation Off'}
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 12px', borderRadius:'20px', background:(mColor + '12'), border:('1px solid ' + mColor + '30') }}>
            <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:mColor, boxShadow:('0 0 5px ' + mColor) }} />
            <span style={{ fontSize:'9px', color:mColor, letterSpacing:'0.1em', textTransform:'uppercase' }}>{ML[mode]}</span>
          </div>
          <button onClick={clearHistory}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#3A6070', fontSize:'14px' }}
            onMouseEnter={function(e) { e.target.style.color = '#FF5555'; }}
            onMouseLeave={function(e) { e.target.style.color = '#3A6070'; }}>↺</button>
        </div>
      </div>

      {/* Wave + Orb */}
      <div style={{ position:'relative', height:'148px', flexShrink:0, overflow:'hidden', borderBottom:'1px solid #163040' }}>
        <canvas ref={canvasRef} style={{ width:'100%', height:'100%', display:'block', pointerEvents:'none' }} />
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'10px' }}>
          <div style={{ position:'relative', cursor:'pointer' }} onClick={handleOrbClick}>
            {(listenStatus === 'listening' || listenStatus === 'speaking') && (
              <div style={{ position:'absolute', inset:'-20px', borderRadius:'50%', background:mColor, opacity:0.07, animation:'pulse 1.5s ease-in-out infinite' }} />
            )}
            {(listenStatus === 'listening' || listenStatus === 'speaking') && (
              <div style={{ position:'absolute', inset:'-10px', borderRadius:'50%', border:('1px solid ' + mColor), opacity:0.25, animation:'pulse 1.5s 0.4s ease-in-out infinite' }} />
            )}
            <div style={{ width:'64px', height:'64px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:('radial-gradient(circle at 35% 35%, ' + mColor + ', #071A24)'), border:('1px solid ' + mColor + '50'), boxShadow:('0 0 24px ' + mColor + '30, 0 0 60px ' + mColor + '10'), transition:'all 0.4s ease', cursor:'pointer' }}>
              <span style={{ fontSize:'22px', color:'white', userSelect:'none' }}>
                {listenStatus === 'listening' ? '🎙' : listenStatus === 'thinking' ? '⋯' : listenStatus === 'speaking' ? '◈' : '◬'}
              </span>
            </div>
          </div>
          <div style={{ textAlign:'center' }}>
            <p style={{ fontSize:'9px', color:'#3A6070', letterSpacing:'0.14em', textTransform:'uppercase' }}>{statusLabel}</p>
            {interimText && <p style={{ fontFamily:'Cormorant Garamond, serif', fontStyle:'italic', color:'#7AAAB8', fontSize:'12px', marginTop:'3px' }}>"{interimText}"</p>}
          </div>
        </div>
      </div>

      {/* Mic error */}
      {micError && (
        <div style={{ padding:'10px 20px', background:'#FF444410', borderBottom:'1px solid #FF444430', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <p style={{ fontSize:'12px', color:'#FF7777' }}>⚠ {micError}</p>
          <button onClick={function() { setMicError(''); }} style={{ color:'#FF5555', background:'none', border:'none', cursor:'pointer', fontSize:'14px' }}>✕</button>
        </div>
      )}

      {/* Insight cards */}
      {insights.length > 0 && (
        <div style={{ display:'flex', gap:'10px', padding:'10px 20px', overflowX:'auto', borderBottom:'1px solid #163040', flexShrink:0 }}>
          {insights.slice(0,3).map(function(ins) {
            return (
              <div key={ins._id}
                onClick={function() { sendMessage(ins.text, ins.context); dismissInsight(ins._id); }}
                style={{ flexShrink:0, minWidth:'200px', maxWidth:'240px', padding:'12px', borderRadius:'14px', cursor:'pointer', position:'relative', background:'#071A24', border:('1px solid ' + (MC[ins.mode] || MC.auto) + '25') }}>
                <p style={{ fontSize:'8px', color:(MC[ins.mode] || MC.auto), letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'5px' }}>{ins.title}</p>
                <p style={{ fontSize:'10px', color:'#7AAAB8', lineHeight:1.5 }}>{ins.text}</p>
                <button onClick={function(e) { e.stopPropagation(); dismissInsight(ins._id); }}
                  style={{ position:'absolute', top:'8px', right:'8px', background:'none', border:'none', color:'#FF5555', cursor:'pointer', fontSize:'11px' }}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 24px', display:'flex', flexDirection:'column', gap:'14px' }}>
        {historyLoaded && messages.length === 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'16px', textAlign:'center' }}>
            <div style={{ fontSize:'44px', opacity:0.1 }}>◬</div>
            <p style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'20px', color:'#3A6070', fontStyle:'italic' }}>
              {stage === 'stranger' ? 'Tap the orb or mic to speak.' : 'Welcome back. The Oracle remembers.'}
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'8px' }}>
              {['"open mirror"', '"test my idea"', '"my growth"', '"open arena"'].map(function(h) {
                return <span key={h} style={{ fontSize:'10px', color:'#1E3840', background:'#071A24', border:'1px solid #163040', padding:'4px 10px', borderRadius:'20px', fontFamily:'DM Mono, monospace' }}>{h}</span>;
              })}
            </div>
          </div>
        )}
        {messages.map(function(m, i) {
          return (
            <div key={i} style={{ display:'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth:'76%' }}>
                {m.role === 'ai' && <p style={{ fontSize:'8px', color:'#1E3840', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'4px' }}>oracle · {(ML[m.mode || 'auto'] || 'oracle').toLowerCase()}</p>}
                <div style={{ padding:'12px 16px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px', background: m.role === 'user' ? '#0D2535' : '#071A24', border: m.role === 'user' ? '1px solid #1E506840' : ('1px solid ' + (MC[m.mode || 'auto'] || MC.auto) + '20'), color: m.role === 'user' ? '#E8F4F6' : ((MC[m.mode || 'auto'] || MC.auto) + 'dd'), fontSize: m.role === 'user' ? '15px' : '13px', fontFamily: m.role === 'user' ? 'Cormorant Garamond, serif' : 'Inter, sans-serif', fontStyle: m.role === 'user' ? 'italic' : 'normal', lineHeight:1.65 }}>
                  {m.content}
                </div>
                <p style={{ fontSize:'7px', color:'#1E3840', marginTop:'3px', textAlign: m.role === 'user' ? 'right' : 'left', padding:'0 4px' }}>
                  {new Date(m.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        {loading && (
          <div style={{ display:'flex' }}>
            <div style={{ padding:'12px 18px', borderRadius:'4px 16px 16px 16px', background:'#071A24', border:'1px solid #163040', display:'flex', gap:'5px', alignItems:'center' }}>
              {[0,1,2].map(function(i) {
                return <div key={i} style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#2A6B85', animation:('pulse 1s ' + (i * 0.2) + 's ease-in-out infinite') }} />;
              })}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding:'12px 20px 16px', borderTop:'1px solid #163040', background:'#071A24', flexShrink:0 }}>
        <div style={{ display:'flex', gap:'6px', marginBottom:'10px', flexWrap:'wrap' }}>
          {[['mirror','/journal'],['forge','/forge'],['arena','/arena'],['evolution','/evolution']].map(function(item) {
            var m = item[0]; var path = item[1];
            return (
              <button key={m} onClick={function() { navigate(path); }}
                style={{ padding:'4px 12px', borderRadius:'20px', fontSize:'9px', textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:500, cursor:'pointer', transition:'all 0.2s', background:(MC[m] + '10'), border:('1px solid ' + MC[m] + '25'), color:MC[m] }}>
                {m}
              </button>
            );
          })}
        </div>
        <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
          <button onClick={handleOrbClick}
            title={listenStatus === 'listening' ? 'Stop listening' : 'Start listening'}
            style={{ width:'42px', height:'42px', borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.3s', background: listenStatus === 'listening' ? (mColor + '18') : '#040C10', border:('1px solid ' + (listenStatus === 'listening' ? mColor : '#163040')), color: listenStatus === 'listening' ? mColor : '#3A6070', boxShadow: listenStatus === 'listening' ? ('0 0 14px ' + mColor + '30') : 'none', fontSize:'16px' }}>
            {listenStatus === 'speaking' ? '⏹' : '🎙'}
          </button>
          <input value={text} onChange={function(e) { setText(e.target.value); }}
            onKeyDown={function(e) { if (e.key === 'Enter') sendMessage(text); }}
            placeholder="or type here..."
            style={{ flex:1, background:'#040C10', border:'1px solid #163040', borderRadius:'12px', padding:'11px 16px', color:'#E8F4F6', fontSize:'13px', outline:'none', fontFamily:'Inter, sans-serif', transition:'border-color 0.2s' }}
            onFocus={function(e) { e.target.style.borderColor = '#2A6B85'; }}
            onBlur={function(e) { e.target.style.borderColor = '#163040'; }} />
          <button onClick={function() { sendMessage(text); }}
            disabled={!text.trim() || loading}
            className="btn-primary"
            style={{ padding:'11px 20px', flexShrink:0 }}>→</button>
        </div>
      </div>
    </div>
  );
}