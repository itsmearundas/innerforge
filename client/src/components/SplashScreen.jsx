import { useEffect, useState, useRef } from 'react';

export default function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState(0);
  // phase 0: black
  // phase 1: logo appears
  // phase 2: app name appears
  // phase 3: company line appears
  // phase 4: wave builds
  // phase 5: fade out
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const tRef = useRef(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1300);
    const t3 = setTimeout(() => setPhase(3), 2200);
    const t4 = setTimeout(() => setPhase(4), 2800);
    const t5 = setTimeout(() => setPhase(5), 4200);
    const t6 = setTimeout(() => onFinish(), 5000);
    return () => [t1,t2,t3,t4,t5,t6].forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      tRef.current += 0.012;
      const t = tRef.current;
      const intensity = phase >= 4 ? Math.min(1, (phase - 3) * 0.5) : 0;

      [0, 1, 2, 3].forEach(layer => {
        const amp = (50 - layer * 10) * intensity;
        const alpha = (0.5 - layer * 0.1) * intensity;
        const colors = ['#1E5068','#2A6B85','#C8834A','#3A8FA8'];
        ctx.beginPath();
        for (let i = 0; i <= 120; i++) {
          const x = (i / 120) * width;
          const y = height * 0.72 + Math.sin(t * (1 + layer * 0.3) + i * 0.08 + layer * 1.5) * amp;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = colors[layer].replace(')', `,${alpha})`).replace('rgb', 'rgba').replace('#', '');
        // simpler approach:
        const hex = colors[layer];
        const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = 2.5 - layer * 0.4;
        ctx.stroke();

        // particles
        if (intensity > 0.3) {
          for (let i = 0; i < 120; i += 8) {
            const x = (i / 120) * width + (Math.random()-0.5)*6;
            const y = height * 0.72 + Math.sin(t*(1+layer*0.3)+i*0.08+layer*1.5)*amp + (Math.random()-0.5)*8;
            ctx.beginPath();
            ctx.arc(x, y, Math.random()*2+0.3, 0, Math.PI*2);
            ctx.fillStyle = `rgba(${r},${g},${b},${alpha*0.6})`;
            ctx.fill();
          }
        }
      });
      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, [phase]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: '#040C10',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: phase === 5 ? 0 : 1, transition: 'opacity 0.8s ease',
    }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0px' }}>
        {/* Aetrus Logo */}
        <div style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'scale(1) translateY(0)' : 'scale(0.7) translateY(20px)',
          transition: 'all 0.9s cubic-bezier(0.34,1.56,0.64,1)',
          marginBottom: '32px'
        }}>
          <img src="/aetrus-logo.png" alt="Aetrus" style={{ width: '90px', height: '90px', objectFit: 'contain' }} />
        </div>

        {/* App Name */}
        <div style={{
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 0.8s ease',
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 'clamp(48px, 8vw, 72px)',
          fontWeight: 300,
          letterSpacing: '0.12em',
          color: '#E8F4F6',
          lineHeight: 1,
          textAlign: 'center',
        }}>
          InnerForge
        </div>

        {/* Tagline */}
        <div style={{
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.8s ease 0.2s',
          fontFamily: 'Inter, sans-serif',
          fontSize: '11px',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: '#3A6070',
          marginTop: '10px',
          textAlign: 'center',
        }}>
          AI that knows you, then challenges you
        </div>

        {/* Divider */}
        <div style={{
          width: phase >= 3 ? '120px' : '0px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, #C8834A, transparent)',
          margin: '28px 0 20px',
          transition: 'width 0.6s ease',
        }} />

        {/* Company */}
        <div style={{
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? 'translateY(0)' : 'translateY(8px)',
          transition: 'all 0.6s ease',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
        }}>
          <img src="/aetrus-logo.png" alt="Aetrus" style={{ width: '22px', height: '22px', objectFit: 'contain', opacity: 0.7 }} />
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: '#C8834A',
            fontWeight: 500,
          }}>
            AETRUS
          </span>
        </div>
      </div>

      {/* Loading dots */}
      <div style={{
        position: 'absolute', bottom: '48px',
        display: 'flex', gap: '6px', alignItems: 'center',
        opacity: phase >= 4 ? 1 : 0, transition: 'opacity 0.4s ease'
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: '4px', height: '4px', borderRadius: '50%', background: '#3A6070',
            animation: `waveBar 1s ${i*0.2}s ease-in-out infinite`, transformOrigin: 'center'
          }} />
        ))}
      </div>
    </div>
  );
}