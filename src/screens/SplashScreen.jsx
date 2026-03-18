import { useEffect, useState } from 'react';
import babaapete from '../assets/babaapete.jpeg';

/**
 * SplashScreen — Opening animation for Prophet Emmanuel Oluwole Adewale
 * (AkA Baba Apete) 71 Years Birthday Quiz Tournament.
 * Auto-navigates to join after the animation completes.
 */
export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState(0);
  // phase 0 → black
  // phase 1 → particles + glow in
  // phase 2 → image fades in
  // phase 3 → title types in
  // phase 4 → subtitle + CTA
  // phase 5 → fade out → onDone

  useEffect(() => {
    const timings = [300, 800, 1600, 2600, 4000, 5800];
    const timers = timings.map((delay, i) =>
      setTimeout(() => setPhase(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase === 6) {
      const t = setTimeout(onDone, 600);
      return () => clearTimeout(t);
    }
  }, [phase, onDone]);

  const titleLine1 = 'PROPHET EMMANUEL OLUWOLE ADEWALE';
  const aka = '(Aka BABA APETE)';

  return (
    <div
      className="fixed inset-0 z-9999 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: '#000',
        transition: 'opacity 0.6s ease',
        opacity: phase >= 6 ? 0 : 1,
      }}
    >
      {/* ── Particle field ── */}
      {phase >= 1 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-ping"
              style={{
                width: `${4 + (i % 5) * 2}px`,
                height: `${4 + (i % 5) * 2}px`,
                left: `${(i * 37) % 100}%`,
                top: `${(i * 53) % 100}%`,
                background: i % 3 === 0
                  ? 'rgba(251,191,36,0.6)'
                  : i % 3 === 1
                  ? 'rgba(236,72,153,0.5)'
                  : 'rgba(167,139,250,0.5)',
                animationDuration: `${1.5 + (i % 4) * 0.5}s`,
                animationDelay: `${(i % 6) * 0.2}s`,
                opacity: phase >= 1 ? 1 : 0,
                transition: 'opacity 1s ease',
              }}
            />
          ))}
        </div>
      )}

      {/* ── Radial glow backdrop ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(217,119,6,0.25) 0%, rgba(168,85,247,0.2) 40%, transparent 70%)',
          opacity: phase >= 1 ? 1 : 0,
          transition: 'opacity 1.2s ease',
        }}
      />

      {/* ── Photo portrait ── */}
      <div
        style={{
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? 'scale(1) translateY(0)' : 'scale(0.6) translateY(40px)',
          transition: 'opacity 1.2s ease, transform 1.2s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        className="relative mb-6 z-10"
      >
        {/* Outer glow rings */}
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{ background: 'rgba(251,191,36,0.3)', borderRadius: '50%', margin: '-12px' }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, #f59e0b, #ec4899, #a78bfa, #f59e0b)',
            borderRadius: '50%',
            margin: '-6px',
            animation: 'spin 4s linear infinite',
          }}
        />
        <img
          src={babaapete}
          alt="Baba Apete"
          style={{
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '4px solid #000',
            position: 'relative',
            zIndex: 2,
            boxShadow: '0 0 60px rgba(251,191,36,0.6), 0 0 100px rgba(236,72,153,0.4)',
          }}
        />
        {/* Crown */}
        <div
          className="absolute"
          style={{
            top: '-28px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '36px',
            filter: 'drop-shadow(0 0 12px rgba(251,191,36,0.9))',
            animation: 'bounce 1.5s ease infinite',
          }}
        >
          👑
        </div>
      </div>

      {/* ── Title text ── */}
      <div className="z-10 text-center px-6">
        <div
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.8s ease, transform 0.8s ease',
          }}
        >
          <p
            className="font-black text-2xl leading-tight tracking-wider"
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #fde68a, #fbbf24)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
              filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.7))',
            }}
          >
            {titleLine1}
          </p>

          <p
            className="text-pink-300 font-semibold text-lg mt-1 tracking-wide"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(236,72,153,0.8))',
              fontStyle: 'italic',
            }}
          >
            {aka}
          </p>
        </div>

        <div
          style={{
            opacity: phase >= 4 ? 1 : 0,
            transform: phase >= 4 ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
            transition: 'opacity 0.8s ease 0.1s, transform 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.1s',
          }}
          className="mt-5"
        >
          {/* Divider with stars */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px flex-1 max-w-20" style={{ background: 'linear-gradient(to right, transparent, #f59e0b)' }} />
            <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px #fbbf24)' }}>✨</span>
            <span className="text-xl" style={{ filter: 'drop-shadow(0 0 8px #fbbf24)' }}>🎂</span>
            <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px #fbbf24)' }}>✨</span>
            <div className="h-px flex-1 max-w-20" style={{ background: 'linear-gradient(to left, transparent, #f59e0b)' }} />
          </div>

          {/* 71 badge */}
          <div
            className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(236,72,153,0.2))',
              border: '2px solid rgba(251,191,36,0.5)',
              boxShadow: '0 0 30px rgba(251,191,36,0.3)',
            }}
          >
            <span className="text-3xl font-black" style={{ color: '#fbbf24', textShadow: '0 0 20px #fbbf24' }}>71</span>
            <div className="text-left">
              <p className="text-white font-black text-sm leading-tight">YEARS</p>
              <p className="text-amber-400 font-semibold text-xs">BIRTHDAY</p>
            </div>
            <span className="text-3xl">🎉</span>
          </div>

          <p
            className="text-white font-black text-xl tracking-widest uppercase"
            style={{
              background: 'linear-gradient(135deg, #ec4899, #a78bfa, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 15px rgba(236,72,153,0.6))',
              letterSpacing: '0.2em',
            }}
          >
            71st Birthday Quiz Tournament
          </p>
        </div>

        {/* CTA pulse */}
        <div
          style={{
            opacity: phase >= 5 ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
          className="mt-6"
        >
          <p
            className="text-gray-300 text-sm animate-pulse"
            style={{ letterSpacing: '0.15em' }}
          >
            ● Entering Tournament ●
          </p>
        </div>
      </div>

      {/* Keyframe for conic spin */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
