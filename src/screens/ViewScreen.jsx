import { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Zap, Crown, Flame, Users, Swords, Timer, Star, TrendingUp, Activity, Radio } from 'lucide-react';
import { io } from 'socket.io-client';
import { BASE_URL as SOCKET_URL } from '../utils/api';

/**
 * ViewScreen — Admin / big-screen spectator view.
 *
 * Shows:
 *  • Big round banner (Round N / Quarter Final / Semi Final / Final / Champion)
 *  • Live match grid: username VS username cards
 *  • Elimination pop-out animations (slide-in, hold 2s, fade out)
 *  • "Merge" animation when both players answer correctly
 *  • Leaderboard with frequent updates
 *
 * Connects to the server socket as a "view-only" spectator.
 */

// ─── Eviction Toast (full-width dramatic banner) ─────────────────────────────
// Tightened to ~1.4 s total so a flurry of evictions clears fast.
function EvictionToast({ username, onDone, index = 0 }) {
  const [phase, setPhase] = useState(0); // 0=hidden 1=slam-in 2=hold 3=fade

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 20);
    const t2 = setTimeout(() => setPhase(2), 260);
    const t3 = setTimeout(() => setPhase(3), 1100);
    const t4 = setTimeout(onDone, 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  const visible = phase === 1 || phase === 2;

  // Stacked offset so multiple toasts pile up cleanly
  const topPct = 8 + index * 6;
  const baseTransform = visible
    ? 'translateY(0) scale(1)'
    : phase === 3
    ? 'translateY(-20px) scale(0.95)'
    : 'translateY(-80px) scale(0.7)';

  return (
    <div
      className="fixed inset-x-0 pointer-events-none z-50 flex flex-col items-center"
      style={{
        top: `${topPct}%`,
        transform: baseTransform,
        opacity: phase === 3 ? 0 : phase >= 1 ? 1 : 0,
        transition: phase === 1 ? 'all 0.32s cubic-bezier(0.34,1.56,0.64,1)' : 'all 0.3s ease-in',
      }}
    >
      {/* Red flash overlay — only on the first toast in the stack */}
      {phase === 1 && index === 0 && (
        <div className="fixed inset-0 pointer-events-none"
          style={{ background: 'rgba(239,68,68,0.12)', animation: 'ping 0.3s ease-out 1' }} />
      )}
      {/* Main banner */}
      <div
        className="mx-auto px-10 py-5 rounded-3xl shadow-2xl text-center"
        style={{
          background: 'linear-gradient(135deg, #1a0000 0%, #7f1d1d 40%, #dc2626 70%, #7f1d1d 100%)',
          border: '3px solid rgba(239,68,68,0.9)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 0 80px rgba(239,68,68,0.7), 0 0 160px rgba(239,68,68,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          minWidth: '340px',
        }}
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <span style={{ fontSize: '32px', filter: 'drop-shadow(0 0 8px #ef4444)' }}>🚨</span>
          <div>
            <p className="text-red-200 text-xs font-black uppercase tracking-[0.3em] mb-0.5"
              style={{ textShadow: '0 0 10px rgba(239,68,68,0.8)' }}>EVICTED</p>
            <p className="text-white font-black text-3xl leading-tight"
              style={{ textShadow: '0 0 20px rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>
              {username}
            </p>
          </div>
          <span style={{ fontSize: '32px', filter: 'drop-shadow(0 0 8px #ef4444)' }}>🚨</span>
        </div>
        <p className="text-red-300 text-xs font-semibold tracking-widest uppercase">Has been evicted from the tournament</p>
      </div>
      {/* Shake sparks */}
      <div className="flex gap-4 mt-2">
        {['💥','🔥','💥'].map((e,i)=>(
          <span key={i} style={{ fontSize:'22px', opacity: phase===1?1:0, transition:`opacity 0.3s ${i*0.1}s`, filter:'drop-shadow(0 0 6px #ef4444)' }}>{e}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Correct-Answer Merge Animation ──────────────────────────────────────────
function MergeToast({ p1, p2, onDone }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 30);
    const t2 = setTimeout(() => setPhase(2), 320);
    const t3 = setTimeout(() => setPhase(3), 800);
    const t4 = setTimeout(onDone, 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-40">
      <div className="flex items-center gap-4">
        {/* P1 */}
        <div
          className="flex items-center justify-center rounded-2xl px-5 py-3 font-black text-xl text-white"
          style={{
            background: 'rgba(16,185,129,0.85)',
            border: '2px solid rgba(52,211,153,0.8)',
            boxShadow: '0 0 30px rgba(16,185,129,0.5)',
            transform: phase >= 2 ? 'translateX(60px) scale(0.85)' : 'translateX(0) scale(1)',
            opacity: phase >= 3 ? 0 : 1,
            transition: 'all 0.6s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          ✅ {p1}
        </div>

        {/* Lightning bolt between */}
        <div style={{ opacity: phase >= 2 ? 1 : 0, transition: 'opacity 0.3s', fontSize: '28px', textShadow: '0 0 12px #fbbf24' }}>
          ⚡ BOTH CORRECT! ⚡
        </div>

        {/* P2 */}
        <div
          className="flex items-center justify-center rounded-2xl px-5 py-3 font-black text-xl text-white"
          style={{
            background: 'rgba(16,185,129,0.85)',
            border: '2px solid rgba(52,211,153,0.8)',
            boxShadow: '0 0 30px rgba(16,185,129,0.5)',
            transform: phase >= 2 ? 'translateX(-60px) scale(0.85)' : 'translateX(0) scale(1)',
            opacity: phase >= 3 ? 0 : 1,
            transition: 'all 0.6s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          ✅ {p2}
        </div>
      </div>
    </div>
  );
}

// ─── VS Match Card ────────────────────────────────────────────────────────────
function MatchCard({ match, index }) {
  const [pulse, setPulse] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());

  // Tick elapsed seconds
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [match]);

  const playerIds = Object.keys(match.players || {});
  const p1 = match.players?.[playerIds[0]];
  const p2 = match.players?.[playerIds[1]];
  if (!p1 || !p2) return null;

  const p1Answered = p1.answer !== null && p1.answer !== undefined;
  const p2Answered = p2.answer !== null && p2.answer !== undefined;

  const palettes = [
    { p1: '#ec4899', p2: '#a78bfa', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.4)', glow: 'rgba(236,72,153,0.3)' },
    { p1: '#60a5fa', p2: '#34d399', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.4)', glow: 'rgba(96,165,250,0.3)' },
    { p1: '#fbbf24', p2: '#f87171', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.4)', glow: 'rgba(251,191,36,0.3)' },
    { p1: '#34d399', p2: '#a78bfa', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.4)', glow: 'rgba(52,211,153,0.3)' },
    { p1: '#f472b6', p2: '#38bdf8', bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.4)', glow: 'rgba(244,114,182,0.3)' },
  ];
  const pal = palettes[index % palettes.length];
  const fmtElapsed = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m${elapsed % 60 ? ` ${elapsed % 60}s` : ''}`;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-500"
      style={{
        background: `linear-gradient(135deg, ${pal.bg}, rgba(10,5,30,0.7))`,
        border: `1.5px solid ${pulse ? pal.border : pal.border.replace('0.4', '0.2')}`,
        backdropFilter: 'blur(14px)',
        boxShadow: pulse ? `0 0 24px ${pal.glow}` : `0 0 8px ${pal.glow.replace('0.3','0.1')}`,
        transform: pulse ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {/* Top bar: match timer + live badge */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-xs font-mono" style={{ color: pal.border }}> {fmtElapsed}</span>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          <span className="text-xs font-black tracking-widest" style={{ color: '#ff6b6b', textShadow: '0 0 8px rgba(239,68,68,0.8)' }}>LIVE</span>
        </div>
      </div>

      {/* Players row */}
      <div className="flex items-stretch gap-0 px-3 pb-3">

        {/* Player 1 */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          {/* Avatar with glow ring */}
          <div className="relative">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl text-white"
              style={{
                background: `linear-gradient(135deg, ${pal.p1}55, ${pal.p1}33)`,
                border: `2px solid ${pal.p1}99`,
                boxShadow: p1Answered ? `0 0 18px ${pal.p1}` : 'none',
                transition: 'box-shadow 0.3s',
              }}
            >
              {p1.username?.[0]?.toUpperCase()}
            </div>
            {p1Answered && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                style={{ background: '#22c55e', border: '2px solid rgba(10,5,30,0.9)', boxShadow: '0 0 8px #22c55e' }}>
                OK
              </div>
            )}
          </div>
          <p className="text-white font-bold text-xs truncate max-w-full px-1 text-center">{p1.username}</p>
          <p className="text-xs font-semibold" style={{ color: p1Answered ? '#4ade80' : '#fbbf24', textShadow: p1Answered ? '0 0 6px #22c55e' : '0 0 6px #fbbf24', animation: p1Answered ? 'none' : 'pulse 1s ease-in-out infinite', fontSize: '9px', letterSpacing: '0.08em' }}>
            {p1Answered ? 'DONE' : '~ ANSWERING...'}
          </p>
          {/* Answer status bar */}
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: p1Answered ? '100%' : '0%', background: `linear-gradient(90deg, ${pal.p1}, ${pal.p1}88)`, boxShadow: `0 0 6px ${pal.p1}` }}
            />
          </div>
        </div>

        {/* VS column */}
        <div className="flex flex-col items-center justify-center px-3 gap-1 shrink-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: 'rgba(251,191,36,0.15)',
              border: '1.5px solid rgba(251,191,36,0.5)',
              boxShadow: '0 0 12px rgba(251,191,36,0.3)',
            }}
          >
            <Swords className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-amber-400 font-black text-xs" style={{ textShadow: '0 0 8px #fbbf24' }}>VS</span>
          {/* Animated dots indicating active match */}
          <div className="flex gap-0.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: '#fbbf24',
                  animation: 'pulse 1.2s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`,
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
        </div>

        {/* Player 2 */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <div className="relative">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl text-white"
              style={{
                background: `linear-gradient(135deg, ${pal.p2}55, ${pal.p2}33)`,
                border: `2px solid ${pal.p2}99`,
                boxShadow: p2Answered ? `0 0 18px ${pal.p2}` : 'none',
                transition: 'box-shadow 0.3s',
              }}
            >
              {p2.username?.[0]?.toUpperCase()}
            </div>
            {p2Answered && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                style={{ background: '#22c55e', border: '2px solid rgba(10,5,30,0.9)', boxShadow: '0 0 8px #22c55e' }}>
                OK
              </div>
            )}
          </div>
          <p className="text-white font-bold text-xs truncate max-w-full px-1 text-center">{p2.username}</p>
          <p className="text-xs font-semibold" style={{ color: p2Answered ? '#4ade80' : '#fbbf24', textShadow: p2Answered ? '0 0 6px #22c55e' : '0 0 6px #fbbf24', animation: p2Answered ? 'none' : 'pulse 1s ease-in-out infinite', fontSize: '9px', letterSpacing: '0.08em' }}>
            {p2Answered ? 'DONE' : '~ ANSWERING...'}
          </p>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: p2Answered ? '100%' : '0%', background: `linear-gradient(90deg, ${pal.p2}, ${pal.p2}88)`, boxShadow: `0 0 6px ${pal.p2}` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Leaderboard Panel ────────────────────────────────────────────────────────
function LeaderboardPanel({ players }) {
  const sorted = [...players].sort((a, b) => (b.wins || 0) - (a.wins || 0));
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3, 10);

  const podiumColors = [
    { bg: 'linear-gradient(135deg,#fbbf24,#d97706)', border: 'rgba(251,191,36,0.8)', icon: '🥇', size: 'text-2xl', height: 'h-24' },
    { bg: 'linear-gradient(135deg,#9ca3af,#6b7280)', border: 'rgba(156,163,175,0.8)', icon: '🥈', size: 'text-xl', height: 'h-16' },
    { bg: 'linear-gradient(135deg,#b45309,#92400e)', border: 'rgba(180,83,9,0.8)', icon: '🥉', size: 'text-xl', height: 'h-10' },
  ];

  const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd visual order

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(10,5,30,0.8)', border: '1px solid rgba(251,191,36,0.25)', backdropFilter: 'blur(16px)' }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, rgba(217,119,6,0.3), rgba(167,139,250,0.22))', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Trophy className="w-7 h-7 text-amber-400" style={{ filter: 'drop-shadow(0 0 10px rgba(251,191,36,0.7))' }} />
        <span className="text-white uppercase tracking-widest"
          style={{
            fontWeight: 900,
            fontSize: 'clamp(1.1rem, 1.5vw, 1.6rem)',
            textShadow: '0 0 14px rgba(251,191,36,0.55)',
          }}>
          LEADERBOARD
        </span>
        <span className="ml-auto text-amber-200 text-sm font-bold">{sorted.length} players</span>
      </div>

      <div className="p-4">
        {/* Podium — top 3 */}
        {top3.length > 0 && (
          <div className="flex items-end justify-center gap-2 mb-4">
            {podiumOrder.map((rank) => {
              const player = top3[rank];
              if (!player) return <div key={rank} className="flex-1" />;
              const c = podiumColors[rank];
              const isFirst = rank === 0;
              return (
                <div key={rank} className="flex-1 text-center">
                  {isFirst && <Crown className="w-5 h-5 text-amber-400 mx-auto mb-1 animate-bounce" />}
                  <div className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center font-black text-white mb-1"
                    style={{ background: c.bg, border: `2px solid ${c.border}`, boxShadow: isFirst ? `0 0 20px ${c.border}` : 'none' }}>
                    {player.username?.[0]?.toUpperCase()}
                  </div>
                  <p className={`font-black text-xs truncate mb-1 ${isFirst ? 'text-amber-300' : 'text-gray-300'}`}>
                    {player.username}
                  </p>
                  <p className="text-gray-400 text-xs mb-1">{player.wins || 0}W</p>
                  <div className={`rounded-t-lg flex items-end justify-center pb-1 ${c.height}`}
                    style={{ background: `${c.bg.replace('135deg,', '180deg,')}`.replace('0.8)', '0.3)'), border: `1px solid ${c.border}`.replace('0.8', '0.3') }}>
                    <span>{c.icon}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Ranks 4-10 */}
        {rest.length > 0 && (
          <div className="space-y-1.5">
            {rest.map((player, i) => (
              <div key={player.username} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-gray-500 font-bold text-sm w-5 text-right">{i + 4}</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
                  style={{ background: 'rgba(167,139,250,0.25)' }}>
                  {player.username?.[0]?.toUpperCase()}
                </div>
                <span className="text-gray-300 text-xs font-medium flex-1 truncate">{player.username}</span>
                <span className="text-purple-300 font-bold text-xs">{player.wins || 0}W</span>
                {player.stage === 'final' && <Flame className="w-3.5 h-3.5 text-orange-400" />}
              </div>
            ))}
          </div>
        )}

        {sorted.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">Waiting for players...</p>
        )}
      </div>
    </div>
  );
}

// ─── Live Commentary Ticker ───────────────────────────────────────────────────
const TICKER_MESSAGES = [
  '🔥 The competition is heating up!',
  '⚡ Every second counts — one wrong answer and you\'re out!',
  '🏆 Only the sharpest minds will survive to the final!',
  '👀 Who will claim the title today?',
  '💥 No mercy — the tournament runs on pure knowledge!',
  '🎯 Speed AND accuracy — both matter here!',
  '🚀 Top players are pulling ahead — can anyone catch them?',
  '🌟 Stay sharp — the bracket is heating up!',
  '📣 The crowd is watching — give it your best!',
  '⚔️  Battle after battle — who will still be standing?',
];

function LiveTicker() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % TICKER_MESSAGES.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(cycle);
  }, []);

  return (
    <div className="flex items-center gap-4 overflow-hidden"
      style={{
        background: 'rgba(0,0,0,0.45)',
        borderTop: '2px solid rgba(251,191,36,0.35)',
        borderBottom: '2px solid rgba(251,191,36,0.35)',
        padding: '14px 24px',
      }}>
      <div className="flex items-center gap-2 shrink-0">
        <Radio className="w-5 h-5 text-red-400 animate-pulse" />
        <span className="text-red-400 font-black uppercase tracking-widest"
          style={{ fontSize: 'clamp(1rem, 1.4vw, 1.4rem)' }}>LIVE</span>
      </div>
      <div className="w-px h-8 shrink-0" style={{ background: 'rgba(255,255,255,0.25)' }} />
      <p
        className="text-amber-100 flex-1 truncate"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateX(0)' : 'translateX(20px)',
          transition: 'all 0.35s ease',
          fontWeight: 900,
          fontSize: 'clamp(1.25rem, 2vw, 2rem)',
          letterSpacing: '0.01em',
          textShadow: '0 0 14px rgba(251,191,36,0.55)',
        }}
      >
        {TICKER_MESSAGES[idx]}
      </p>
    </div>
  );
}

// ─── Activity Feed (combined evictions + merges + joins) ─────────────────────
function ActivityFeed({ activities }) {
  const [, forceUpdate] = useState(0);

  // Force re-render every second to update "Xs ago" timestamps
  useEffect(() => {
    const t = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (ts) => {
    const secs = Math.floor((Date.now() - ts) / 1000);
    if (secs < 5) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const getIcon = (type) => {
    switch (type) {
      case 'eviction': return { emoji: 'X', bg: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.5)', color: '#fca5a5' };
      case 'merge': return { emoji: 'OK', bg: 'rgba(34,197,94,0.2)', border: 'rgba(34,197,94,0.5)', color: '#86efac' };
      case 'joined': return { emoji: '+', bg: 'rgba(96,165,250,0.2)', border: 'rgba(96,165,250,0.5)', color: '#93c5fd' };
      default: return { emoji: '?', bg: 'rgba(255,255,255,0.1)', border: 'rgba(255,255,255,0.2)', color: '#fff' };
    }
  };

  const getMessage = (act) => {
    switch (act.type) {
      case 'eviction':
        return act.winner
          ? <><span className="text-red-300 font-black">{act.username}</span> evicted by <span className="text-green-300 font-semibold">{act.winner}</span></>
          : <><span className="text-red-300 font-black">{act.username}</span> has been evicted</>;
      case 'merge':
        return <><span className="text-green-300 font-black">{act.p1}</span> and <span className="text-green-300 font-black">{act.p2}</span> both correct!</>;
      case 'joined':
        return <><span className="text-blue-300 font-semibold">{act.username}</span> joined the tournament</>;
      default:
        return 'Unknown event';
    }
  };

  return (
    <div className="w-64 shrink-0 flex flex-col rounded-2xl overflow-hidden"
      style={{ background: 'rgba(10,5,30,0.8)', border: '1px solid rgba(251,191,36,0.2)', backdropFilter: 'blur(16px)', maxHeight: 'calc(100vh - 260px)' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 shrink-0"
        style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.22), rgba(34,197,94,0.18))', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Activity className="w-6 h-6 text-amber-400" style={{ filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.6))' }} />
        <span className="text-white uppercase tracking-widest"
          style={{
            fontWeight: 900,
            fontSize: 'clamp(1rem, 1.3vw, 1.4rem)',
            textShadow: '0 0 12px rgba(251,191,36,0.5)',
          }}>
          Live Activity
        </span>
        <span className="ml-auto text-amber-200 text-sm font-bold">{activities.length}</span>
      </div>

      {/* Scrollable activity list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-xs text-center py-6">Waiting for action...</p>
        ) : (
          activities.map((act) => {
            const icon = getIcon(act.type);
            return (
              <div
                key={act.id}
                className="rounded-xl p-2 transition-all duration-300"
                style={{
                  background: icon.bg,
                  border: `1px solid ${icon.border}`,
                  animation: Date.now() - act.timestamp < 2000 ? 'pulse 0.5s ease-out 1' : 'none',
                }}
              >
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-black shrink-0"
                    style={{ background: icon.border, color: '#000' }}>
                    {icon.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-tight text-gray-200">
                      {getMessage(act)}
                    </p>
                    <p className="text-gray-500 text-[10px] mt-0.5">{formatTime(act.timestamp)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Crowd Hype Burst ─────────────────────────────────────────────────────────
function HypeBurst({ active }) {
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute text-2xl"
          style={{
            left: `${10 + (i * 7) % 80}%`,
            top: `${20 + (i * 11) % 60}%`,
            animation: 'ping 0.8s ease-out 1',
            animationDelay: `${i * 0.06}s`,
            opacity: 0,
            fontSize: `${16 + (i % 3) * 8}px`,
          }}
        >
          {['⭐','🔥','💥','✨','🎉','🏆'][i % 6]}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ViewScreen({ embedded = false }) {
  const [connected, setConnected] = useState(false);
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [lobbyCount, setLobbyCount] = useState(0);
  const [elimQueue, setElimQueue] = useState([]);
  const [mergeQueue, setMergeQueue] = useState([]);
  const [tourneyStart] = useState(() => Date.now());
  const [tourneyElapsed, setTourneyElapsed] = useState(0);
  const [hype, setHype] = useState(false);
  const [totalEvictions, setTotalEvictions] = useState(0);
  const [activityLog, setActivityLog] = useState([]); // Combined activity feed
  const [currentRound, setCurrentRound] = useState({ round: 0, roundLabel: 'Waiting…', matchCount: 0, playerCount: 0 });
  const [championBanner, setChampionBanner] = useState(null); // { username, rewardAmount }
  const [rewardAmount, setRewardAmount] = useState('');
  const [edition, setEdition] = useState('Quiz Arena');
  const [bannerIndex, setBannerIndex] = useState(0);
  const socketRef = useRef(null);
  const nextId = useRef(0);
  const TOURNEY_MAX_SECS = 45 * 60; // 45 minutes

  // Add activity entry with timestamp
  const addActivity = useCallback((type, data) => {
    setActivityLog(prev => [
      { id: nextId.current++, type, ...data, timestamp: Date.now() },
      ...prev.slice(0, 49) // Keep last 50
    ]);
  }, []);

  // Tournament clock tick
  useEffect(() => {
    const t = setInterval(() => setTourneyElapsed(Math.floor((Date.now() - tourneyStart) / 1000)), 1000);
    return () => clearInterval(t);
  }, [tourneyStart]);

  // Fetch the current edition once on mount (covers reloads when no live socket event has fired yet).
  useEffect(() => {
    let cancelled = false;
    fetch(`${SOCKET_URL}/api/tournament/edition`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d && d.edition) setEdition(d.edition); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Quiz Arena rotating announcement banner. Messages change every 6s.
  // Phrasing chosen to be platform-safe (TikTok / Twitch / YouTube / Facebook Live):
  // no gambling, betting, or wagering language — pure competition framing.
  const announcementMessages = (() => {
    const cap = currentRound.playerCount || 400;
    const tag = (edition.split(':')[1] || '').trim() || 'Quiz Arena';
    return [
      `${cap} contestants enter ${edition}. Only one champion remains.`,
      `Tonight, ${cap} players step into the Arena — who will become the champion?`,
      `${tag} — live, skill-based, knowledge-driven. One contestant claims the crown.`,
      `${cap} competitors. One champion. Welcome to ${edition}.`,
      `Knowledge creates champions. Welcome to ${edition}.`,
    ];
  })();

  useEffect(() => {
    const t = setInterval(() => {
      setBannerIndex(i => (i + 1) % announcementMessages.length);
    }, 6000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edition, currentRound.playerCount]);

  const formatTourneyTime = (secs) => {
    const remaining = Math.max(0, TOURNEY_MAX_SECS - secs);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
  const tourneyPct = Math.min(100, (tourneyElapsed / TOURNEY_MAX_SECS) * 100);
  const tourneyExpired = tourneyElapsed >= TOURNEY_MAX_SECS;

  const MAX_QUEUE = 30;
  const addElim = useCallback((username) => {
    setElimQueue(q => {
      const next = [...q, { id: nextId.current++, username }];
      return next.length > MAX_QUEUE ? next.slice(next.length - MAX_QUEUE) : next;
    });
  }, []);

  const addMerge = useCallback((p1, p2) => {
    setMergeQueue(q => {
      const next = [...q, { id: nextId.current++, p1, p2 }];
      return next.length > MAX_QUEUE ? next.slice(next.length - MAX_QUEUE) : next;
    });
  }, []);

  useEffect(() => {
    const sock = io(SOCKET_URL, { transports: ['websocket'], autoConnect: true });
    socketRef.current = sock;

    sock.on('connect', () => {
      setConnected(true);
      sock.emit('spectator_join');
    });
    sock.on('disconnect', () => setConnected(false));

    sock.on('view_state', ({ matches: m, players: p, lobbyCount: lc, registeredCount: rc }) => {
      if (m) setMatches(Object.values(m));
      if (p) setPlayers(p);
      // Use registered count if available (tournament mode), else lobby count
      if (rc !== undefined && rc > 0) setLobbyCount(rc);
      else if (lc !== undefined) setLobbyCount(lc);
    });

    sock.on('match_update', ({ matchId, players: mp }) => {
      setMatches(prev => {
        const idx = prev.findIndex(m => m.matchId === matchId);
        if (idx === -1) return [...prev, { matchId, players: mp }];
        const next = [...prev];
        next[idx] = { ...next[idx], players: mp };
        return next;
      });
    });

    sock.on('match_started', ({ matchId, p1, p2 }) => {
      setMatches(prev => {
        const exists = prev.find(m => m.matchId === matchId);
        if (exists) return prev;
        return [...prev, {
          matchId,
          players: {
            [p1.deviceId]: { ...p1, answer: null },
            [p2.deviceId]: { ...p2, answer: null },
          },
        }];
      });
    });

    sock.on('match_ended', ({ matchId, winner, loser }) => {
      setMatches(prev => prev.filter(m => m.matchId !== matchId));
      if (loser) {
        addElim(loser);
        setTotalEvictions(n => n + 1);
        addActivity('eviction', { username: loser, winner });
        setHype(true);
        setTimeout(() => setHype(false), 1000);
      }
      // Note: wins are updated via leaderboard_update event (avoid double-counting)
    });

    sock.on('both_correct', ({ p1, p2 }) => {
      addMerge(p1, p2);
      addActivity('merge', { p1, p2 });
      setHype(true);
      setTimeout(() => setHype(false), 1000);
    });

    sock.on('player_joined', ({ username, lobbyCount: lc, waitingCount: wc }) => {
      const count = lc ?? wc;
      if (count !== undefined) setLobbyCount(count);
      addActivity('joined', { username });
      setPlayers(prev => {
        if (prev.find(p => p.username === username)) return prev;
        return [...prev, { username, wins: 0, stage: 'lobby' }];
      });
    });

    sock.on('player_eliminated', ({ username }) => {
      addElim(username);
      setTotalEvictions(n => n + 1);
      addActivity('eviction', { username });
    });
    sock.on('lobby_count', ({ count }) => setLobbyCount(count));
    sock.on('leaderboard_update', (data) => {
      if (Array.isArray(data)) setPlayers(data);
    });

    // Big round banner updates
    sock.on('tournament_round_started', ({ round, roundLabel, matchCount, playerCount }) => {
      setCurrentRound({ round, roundLabel: roundLabel || `Round ${round}`, matchCount, playerCount });
      addActivity('round_started', { round, roundLabel, matchCount, playerCount });
    });
    sock.on('round_started', ({ round, roundLabel, matchCount, playerCount }) => {
      setCurrentRound({ round, roundLabel: roundLabel || `Round ${round}`, matchCount, playerCount });
    });
    sock.on('tournament_started', ({ round, roundLabel, playerCount, rewardAmount: r, edition: e }) => {
      setCurrentRound({ round: round || 1, roundLabel: roundLabel || `Round ${round || 1}`, matchCount: 0, playerCount: playerCount || 0 });
      if (typeof r === 'string') setRewardAmount(r);
      if (typeof e === 'string' && e) setEdition(e);
    });
    sock.on('tournament_next_round', ({ round, roundLabel, playerCount }) => {
      setCurrentRound({ round, roundLabel: roundLabel || `Round ${round}`, matchCount: 0, playerCount: playerCount || 0 });
    });
    sock.on('tournament_champion', ({ username, rewardAmount: r, edition: e }) => {
      setChampionBanner({ username, rewardAmount: r || '', edition: e });
      addActivity('champion', { username, rewardAmount: r });
      if (typeof e === 'string' && e) setEdition(e);
    });
    sock.on('tournament_config_updated', ({ rewardAmount: r, edition: e }) => {
      if (typeof r === 'string') setRewardAmount(r);
      if (typeof e === 'string' && e) setEdition(e);
    });

    return () => sock.disconnect();
  }, [addElim, addMerge, addActivity]);

  return (
    <div className={`${embedded ? 'h-full' : 'min-h-screen'} relative overflow-hidden flex flex-col`}
      style={embedded ? { minHeight: '600px' } : undefined}>

      {/* ── Dark gradient background ── */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(160deg, #0a0518 0%, #1e0a3a 50%, #0a0518 100%)' }} />
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 80% 40% at 50% 10%, rgba(217,119,6,0.15) 0%, transparent 60%)' }} />

      {/* Ambient particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute rounded-full animate-ping"
            style={{
              width: `${2 + (i % 3)}px`, height: `${2 + (i % 3)}px`,
              left: `${(i * 37) % 100}%`, top: `${(i * 59) % 100}%`,
              background: i % 3 === 0 ? 'rgba(251,191,36,0.35)' : i % 3 === 1 ? 'rgba(236,72,153,0.3)' : 'rgba(167,139,250,0.3)',
              animationDuration: `${2 + (i % 4) * 0.5}s`,
              animationDelay: `${(i % 6) * 0.25}s`,
            }} />
        ))}
      </div>

      {/* ── Hype burst particles ── */}
      <HypeBurst active={hype} />

      {/* ── Eviction toasts (up to 3 stacked) ── */}
      {elimQueue.slice(0, 3).map((entry, i) => (
        <EvictionToast
          key={entry.id}
          username={entry.username}
          index={i}
          onDone={() => setElimQueue(q => q.filter(x => x.id !== entry.id))}
        />
      ))}
      {/* Overflow badge when there are more queued */}
      {elimQueue.length > 3 && (
        <div className="fixed right-6 z-50 pointer-events-none"
          style={{ top: '8%' }}>
          <span className="text-xs font-black px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(239,68,68,0.25)',
              border: '1px solid rgba(239,68,68,0.6)',
              color: '#fecaca',
              backdropFilter: 'blur(8px)',
            }}>
            +{elimQueue.length - 3} more
          </span>
        </div>
      )}
      {mergeQueue[0] && (
        <MergeToast
          key={mergeQueue[0].id}
          p1={mergeQueue[0].p1}
          p2={mergeQueue[0].p2}
          onDone={() => setMergeQueue(q => q.slice(1))}
        />
      )}

      {/* ── Champion overlay (when champion is declared) ── */}
      {championBanner && (
        <div className="fixed inset-x-0 top-1/4 z-50 flex justify-center px-4 pointer-events-none">
          <div className="px-10 py-6 rounded-3xl text-center"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%)',
              boxShadow: '0 0 80px rgba(251,191,36,0.7), 0 0 160px rgba(251,191,36,0.35)',
              border: '3px solid rgba(254,243,199,0.8)',
            }}>
            <div className="flex items-center justify-center gap-3 mb-2">
              <Crown className="w-10 h-10 text-white" />
              <p className="text-white font-black text-2xl uppercase tracking-widest">CHAMPION!</p>
              <Crown className="w-10 h-10 text-white" />
            </div>
            <p className="text-white font-black text-5xl mb-1" style={{ textShadow: '0 0 24px rgba(0,0,0,0.4)' }}>
              {championBanner.username}
            </p>
            {championBanner.rewardAmount && (
              <p className="text-amber-50 font-bold text-lg">🏆 {championBanner.rewardAmount}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col h-full">

        {/* Header banner — BIG ROUND NAME */}
        <div className="px-6 pt-5 pb-4 text-center"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-center gap-4 mb-1">
            <Crown className="w-10 h-10 text-amber-400" style={{ filter: 'drop-shadow(0 0 14px #fbbf24)' }} />
            <div className="text-center">
              <p className="text-amber-300 text-xs font-bold uppercase tracking-[0.35em] mb-1">{edition} — Live</p>
              <p className="font-black uppercase tracking-tight"
                style={{
                  fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                  lineHeight: '1',
                  background: 'linear-gradient(135deg, #fbbf24, #fde68a, #f59e0b)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 18px rgba(251,191,36,0.8))',
                }}>{currentRound.roundLabel}</p>
              {currentRound.playerCount > 0 && (
                <p className="text-gray-300 font-bold text-sm mt-2">
                  {currentRound.playerCount} players • {currentRound.matchCount || Math.floor(currentRound.playerCount / 2)} live matches
                </p>
              )}
            </div>
            <Crown className="w-10 h-10 text-amber-400" style={{ filter: 'drop-shadow(0 0 14px #fbbf24)' }} />
          </div>
          {rewardAmount && (
            <p className="mt-2 inline-block px-3 py-1 rounded-full text-amber-200 font-bold text-sm"
              style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.4)' }}>
              💰 Grand Prize: {rewardAmount}
            </p>
          )}

          {/* Status bar */}
          <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
            {/* LIVE pill now hosts the rotating Quiz Arena announcement next to it */}
            <div
              className="flex items-center gap-3 px-4 py-1.5 rounded-full overflow-hidden"
              style={{
                background: connected
                  ? 'linear-gradient(90deg, rgba(34,197,94,0.18), rgba(217,119,6,0.18), rgba(236,72,153,0.18))'
                  : 'rgba(239,68,68,0.15)',
                border: `1px solid ${connected ? 'rgba(251,191,36,0.45)' : 'rgba(239,68,68,0.4)'}`,
                boxShadow: connected ? '0 0 18px rgba(251,191,36,0.25)' : 'none',
                maxWidth: 'min(720px, 80vw)',
              }}
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className={`text-xs font-black shrink-0 ${connected ? 'text-green-300' : 'text-red-300'}`}>
                {connected ? '● LIVE' : 'Connecting...'}
              </span>
              {connected && (
                <span
                  key={bannerIndex}
                  className="text-amber-100 font-bold uppercase tracking-wider truncate"
                  style={{
                    fontSize: 'clamp(0.7rem, 1vw, 0.9rem)',
                    animation: 'announce-fade 6s ease-in-out infinite',
                    textShadow: '0 0 12px rgba(251,191,36,0.55)',
                  }}
                >
                  ⚡ {announcementMessages[bannerIndex]}
                </span>
              )}
              <style>{`
                @keyframes announce-fade {
                  0%   { opacity: 0; transform: translateY(4px); }
                  10%  { opacity: 1; transform: translateY(0); }
                  90%  { opacity: 1; transform: translateY(0); }
                  100% { opacity: 0; transform: translateY(-4px); }
                }
              `}</style>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)' }}>
              <Users className="w-3.5 h-3.5 text-purple-300" />
              <span className="text-purple-200 text-xs font-bold">{players.length} players</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{ background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.3)' }}>
              <Swords className="w-3.5 h-3.5 text-pink-300" />
              <span className="text-pink-200 text-xs font-bold">{matches.length} battles</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <Activity className="w-3.5 h-3.5 text-red-400" />
              <span className="text-red-300 text-xs font-bold">{totalEvictions} evicted</span>
            </div>
            {/* Tournament countdown */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{
                background: tourneyExpired ? 'rgba(239,68,68,0.2)' : tourneyPct > 80 ? 'rgba(249,115,22,0.15)' : 'rgba(251,191,36,0.12)',
                border: `1px solid ${tourneyExpired ? 'rgba(239,68,68,0.5)' : tourneyPct > 80 ? 'rgba(249,115,22,0.4)' : 'rgba(251,191,36,0.35)'}`,
              }}>
              <Timer className="w-3.5 h-3.5 text-amber-300" />
              <span className={`text-xs font-black font-mono ${tourneyExpired ? 'text-red-400 animate-pulse' : tourneyPct > 80 ? 'text-orange-400' : 'text-amber-300'}`}>
                {tourneyExpired ? '⏰ TIME UP' : formatTourneyTime(tourneyElapsed)}
              </span>
            </div>
          </div>
          {/* Tournament progress bar */}
          <div className="mt-2.5 mx-auto w-72 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${tourneyPct}%`,
                background: tourneyPct > 80
                  ? 'linear-gradient(90deg, #f97316, #ef4444)'
                  : 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                boxShadow: tourneyPct > 80 ? '0 0 10px #ef4444' : '0 0 8px #fbbf24',
              }}
            />
          </div>
        </div>

        {/* Live commentary ticker */}
        <LiveTicker />

        {/* Body: LEADERBOARD (left) + matches (middle) + ACTIVITY (right) */}
        <div className="flex-1 flex gap-4 p-5 overflow-hidden">

          {/* Left: Leaderboard */}
          <div className="w-64 shrink-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
            <LeaderboardPanel players={players} />
          </div>

          {/* Middle: Match grid (scrollable) */}
          <div className="flex-1 overflow-y-auto min-w-0 pr-2" style={{ maxHeight: 'calc(100vh - 260px)' }}>
            <div className="flex items-center justify-between mb-4 sticky top-0 z-10 pb-2" style={{ background: 'linear-gradient(to bottom, rgba(5,0,20,0.95) 60%, transparent)' }}>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" style={{ filter: 'drop-shadow(0 0 6px #fbbf24)', animation: 'pulse 1s ease-in-out infinite' }} />
                <h2 className="text-white font-black text-base tracking-wide">ACTIVE BATTLES</h2>
              </div>
              {matches.length > 0 && (
                <span className="text-xs font-black px-2.5 py-1 rounded-full animate-pulse"
                  style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5' }}>
                  {matches.length} LIVE
                </span>
              )}
            </div>

            {matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-7xl mb-4" style={{ animation: 'bounce 1s infinite', filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.7))' }}>⚔️</div>
                <p className="text-amber-300 uppercase tracking-wide"
                  style={{
                    fontWeight: 900,
                    fontSize: 'clamp(1.75rem, 3vw, 3rem)',
                    lineHeight: 1.1,
                    textShadow: '0 0 18px rgba(251,191,36,0.6)',
                  }}>
                  {lobbyCount < 2
                    ? 'Waiting for players to join...'
                    : 'Tournament starting...'}
                </p>
                <p className="text-white mt-3"
                  style={{
                    fontWeight: 900,
                    fontSize: 'clamp(1rem, 1.6vw, 1.5rem)',
                    letterSpacing: '0.02em',
                  }}>
                  {lobbyCount} player{lobbyCount !== 1 ? 's' : ''} ready
                </p>
                {/* Lobby player dots */}
                {lobbyCount > 0 && (
                  <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
                    {[...Array(Math.min(lobbyCount, 20))].map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white animate-pulse"
                        style={{ background: 'rgba(167,139,250,0.3)', border: '1px solid rgba(167,139,250,0.5)', animationDelay: `${i * 0.1}s` }}>
                        {players[i]?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {matches.map((match, i) => (
                  <MatchCard key={match.matchId} match={match} index={i} />
                ))}
              </div>
            )}
          </div>

          {/* Right: Activity Feed */}
          <ActivityFeed activities={activityLog} />
        </div>
      </div>
    </div>
  );
}
