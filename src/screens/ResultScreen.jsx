import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, RotateCcw, BarChart2, AlertTriangle, Clock } from 'lucide-react';
import { playWin, playLose, playClick } from '../utils/sounds';

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2,'0')}s` : `${s}s`;
}

export default function ResultScreen() {
  const { state, joinLobby, goToLeaderboard, resetGame } = useGame();
  const { matchResult, wins, username, opponent, totalMatchTime } = state;

  const [animIn, setAnimIn] = useState(false);

  const isWin = matchResult === 'win';
  const isDraw = matchResult === 'draw';
  const isGameOver = matchResult === 'gameover';
  const isLose = matchResult === 'lose';

  useEffect(() => {
    const t = setTimeout(() => setAnimIn(true), 100);
    const s = setTimeout(() => { if (isWin || isDraw) playWin(); else playLose(); }, 300);
    return () => { clearTimeout(t); clearTimeout(s); };
  }, []);

  // Auto-rejoin lobby immediately after win — server will pair instantly
  useEffect(() => {
    if (!isWin) return;
    const t = setTimeout(() => joinLobby(username), 1500);
    return () => clearTimeout(t);
  }, [isWin, joinLobby, username]);

  return (
    <div className="min-h-screen bg-[#0a0a1a] bg-grid flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className={`absolute inset-0 ${isWin ? 'bg-green-900/10' : isDraw ? 'bg-amber-900/10' : 'bg-red-900/10'} transition-all duration-1000`} />
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl opacity-30 ${isWin ? 'bg-green-500' : isDraw ? 'bg-amber-500' : 'bg-red-500'}`} />

      {isWin && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`, top: `-5%`,
                background: ['#f59e0b','#8b5cf6','#3b82f6','#10b981','#ef4444'][i % 5],
                animation: `confetti-fall ${2 + Math.random() * 3}s linear ${Math.random() * 2}s infinite`,
              }} />
          ))}
        </div>
      )}

      <div
        className="relative z-10 w-full max-w-sm transition-all duration-700"
        style={{ opacity: animIn ? 1 : 0, transform: animIn ? 'translateY(0)' : 'translateY(30px)' }}
      >
        {/* Result icon */}
        <div className="text-center mb-8">
          <div className="text-8xl mb-4 float-animation">
            {isWin ? '🎉' : isGameOver ? '💀' : isDraw ? '🤝' : '😤'}
          </div>
          <h1 className={`text-5xl font-black mb-2 ${isWin ? 'text-green-400' : isGameOver ? 'text-red-500' : isDraw ? 'text-amber-400' : 'text-red-400'}`}>
            {isWin ? 'YOU WON!' : isGameOver ? 'GAME OVER!' : isDraw ? 'DRAW!' : 'YOU LOST!'}
          </h1>
          <p className="text-gray-400 text-lg">
            {isWin
              ? `You defeated ${opponent?.username || 'the other player'}!`
              : isGameOver
              ? 'Both players got it wrong — evicted!'
              : isDraw
              ? 'Both players answered wrong'
              : `${opponent?.username || 'Your opponent'} won this round. Better luck next tournament!`
            }
          </p>
        </div>

        {/* Win progress */}
        <div className="glass rounded-3xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-center">
              <div className="text-4xl font-black text-white">{wins}</div>
              <div className="text-gray-400 text-sm">Total Wins</div>
            </div>
            <div className="flex-1 mx-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{wins}/10 wins</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${Math.min((wins / 10) * 100, 100)}%`,
                    background: 'linear-gradient(to right, #a855f7, #f59e0b)',
                  }}
                />
              </div>
              <div className="flex gap-0.5 mt-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i}
                    className={`flex-1 h-5 rounded flex items-center justify-center text-xs font-bold transition-all duration-500
                      ${i < wins ? 'bg-amber-400 text-black' : 'bg-white/5 text-gray-600'}`}
                  >
                    {i < wins ? '✓' : i + 1}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-amber-400">{Math.max(0, 10 - wins)}</div>
              <div className="text-gray-400 text-sm">To Win</div>
            </div>
          </div>

          {/* Time used so far */}
          {isWin && totalMatchTime > 0 && (
            <div className="flex items-center justify-center gap-2 mt-2 p-2 rounded-xl bg-white/5">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-blue-300 text-sm font-semibold">Total time used: {formatTime(totalMatchTime)}</span>
              <span className="text-gray-500 text-xs">(lower = better rank)</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {isGameOver ? (
            <>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
                <div>
                  <p className="text-red-300 text-sm font-bold mb-0.5">Both players got it wrong</p>
                  <p className="text-gray-400 text-xs">You are both evicted. Your device is locked until the next tournament.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={goToLeaderboard}
                  className="glass py-3 rounded-2xl text-gray-300 hover:text-white font-medium flex items-center justify-center gap-2 transition-all hover:bg-white/10">
                  <BarChart2 className="w-4 h-4" /> Leaderboard
                </button>
                <button onClick={() => { playClick(); resetGame(); }}
                  className="glass py-3 rounded-2xl text-gray-300 hover:text-white font-medium flex items-center justify-center gap-2 transition-all hover:bg-white/10">
                  <RotateCcw className="w-4 h-4" /> Exit
                </button>
              </div>
            </>
          ) : isLose ? (
            <>
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30">
                <Clock className="w-6 h-6 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-orange-300 text-sm font-bold mb-1">Tournament Over for You</p>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    You lost this match. Your run ends here.
                    Wait for the <span className="text-white font-semibold">next tournament</span> to play again.
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-gray-400 text-xs mb-1">Your final record this tournament</p>
                <p className="text-white font-black text-2xl">{wins} {wins === 1 ? 'win' : 'wins'}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {wins >= 8 ? 'So close! One more next time 🔥' :
                   wins >= 5 ? 'Great run! Keep practising 💪' :
                   wins >= 1 ? 'Keep going — you\'ll get there! ⚡' :
                   'First tournament down. Next one is yours! 🎯'}
                </p>
              </div>
              <button onClick={goToLeaderboard}
                className="w-full glass py-3 rounded-2xl text-gray-300 hover:text-white font-medium flex items-center justify-center gap-2 transition-all hover:bg-white/10">
                <BarChart2 className="w-4 h-4" /> Leaderboard
              </button>
            </>
          ) : (
            <>
              {/* Auto-pairing — no action needed from user */}
              <div className="w-full py-4 rounded-2xl text-center"
                style={{ background: 'rgba(22,163,74,0.15)', border: '1.5px solid rgba(74,222,128,0.3)' }}>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-green-400/30 border-t-green-400 animate-spin shrink-0" />
                  <p className="text-green-300 font-bold">Entering next match…</p>
                </div>
              </div>
              <button onClick={goToLeaderboard}
                className="w-full glass py-3 rounded-2xl text-gray-300 hover:text-white font-medium flex items-center justify-center gap-2 transition-all hover:bg-white/10">
                <BarChart2 className="w-4 h-4" /> Leaderboard
              </button>
            </>
          )}
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
