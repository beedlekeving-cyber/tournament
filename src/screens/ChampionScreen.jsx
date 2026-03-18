import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, Clock, BarChart2 } from 'lucide-react';
import { playWin, playClick } from '../utils/sounds';

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

export default function ChampionScreen() {
  const { state, goToLeaderboard, resetGame } = useGame();
  const { username, wins, totalMatchTime } = state;
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimIn(true), 100);
    const s = setTimeout(() => playWin(), 300);
    return () => { clearTimeout(t); clearTimeout(s); };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-amber-900/10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-125 h-125 rounded-full blur-3xl opacity-25"
        style={{ background: 'radial-gradient(circle, #f59e0b, #ec4899, transparent)' }} />

      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="absolute rounded-full"
            style={{
              width: `${3 + (i % 5)}px`,
              height: `${3 + (i % 5)}px`,
              left: `${(i * 37) % 100}%`,
              top: '-5%',
              background: ['#f59e0b', '#ec4899', '#a78bfa', '#10b981', '#3b82f6'][i % 5],
              animation: `confetti-fall ${2.5 + (i % 4) * 0.5}s linear ${(i % 6) * 0.3}s infinite`,
            }} />
        ))}
      </div>

      <div
        className="relative z-10 w-full max-w-sm text-center transition-all duration-700"
        style={{ opacity: animIn ? 1 : 0, transform: animIn ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.95)' }}
      >
        {/* Trophy */}
        <div className="text-9xl mb-2 float-animation">🏆</div>
        <div className="flex justify-center gap-1 mb-4">
          {['🥇', '🎉', '👑'].map((e, i) => (
            <span key={i} className="text-3xl" style={{ animationDelay: `${i * 0.2}s` }}>{e}</span>
          ))}
        </div>

        <h1 className="text-4xl font-black mb-1 leading-tight"
          style={{
            background: 'linear-gradient(135deg, #fbbf24, #fde68a, #f59e0b)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.8))',
          }}>
          CHAMPION!
        </h1>
        <p className="text-white text-lg font-semibold mb-1">
          Congratulations, <span className="text-amber-400 font-black">{username}</span>!
        </p>
        <p className="text-gray-400 text-sm mb-8">
          You won all 10 duels and are among the top winners.
        </p>

        {/* Stats card */}
        <div className="rounded-3xl p-6 mb-6 text-left"
          style={{
            background: 'rgba(15,10,30,0.85)',
            border: '1px solid rgba(251,191,36,0.35)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 0 60px rgba(251,191,36,0.15)',
          }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-2xl" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-gray-400 text-xs">Wins</span>
              </div>
              <div className="text-4xl font-black text-amber-400">{wins}</div>
              <div className="text-amber-300 text-xs font-semibold">10/10 ✓</div>
            </div>
            <div className="text-center p-3 rounded-2xl" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-gray-400 text-xs">Total Time</span>
              </div>
              <div className="text-2xl font-black text-blue-300">{formatTime(totalMatchTime)}</div>
              <div className="text-blue-400 text-xs font-semibold">lower = higher rank</div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-2xl text-center" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)' }}>
            <p className="text-purple-300 text-xs font-semibold mb-0.5">Your Ranking</p>
            <p className="text-white text-sm">
              Your position is determined by your <span className="text-amber-400 font-bold">number of wins</span> (10 wins)
              and <span className="text-blue-300 font-bold">total time used</span> — the faster you answered, the higher your rank!
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => { playClick(); goToLeaderboard(); }}
            className="w-full py-4 rounded-2xl font-bold text-lg text-black transition-all duration-300 transform hover:scale-[1.02] active:scale-95 shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              boxShadow: '0 0 30px rgba(251,191,36,0.4)',
            }}>
            <BarChart2 className="inline w-5 h-5 mr-2" />
            View Leaderboard
          </button>
          <button
            onClick={() => { playClick(); resetGame(); }}
            className="w-full py-3 rounded-2xl font-semibold text-gray-300 hover:text-white transition-all hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            🏠 Back to Home
          </button>
        </div>
      </div>

      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
