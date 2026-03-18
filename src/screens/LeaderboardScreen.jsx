import { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, Flame, Clock } from 'lucide-react';

const MEDALS = ['🥇', '🥈', '🥉'];

function formatTime(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2,'0')}s` : `${s}s`;
}

export default function LeaderboardScreen() {
  const { state, goToLeaderboard } = useGame();

  // Sort: most wins first; ties broken by lowest totalTime
  const sorted = [...(state.leaderboard || [])].sort((a, b) =>
    b.wins !== a.wins ? b.wins - a.wins : (a.totalTime || 0) - (b.totalTime || 0)
  );

  useEffect(() => {
    if ((state.leaderboard || []).length === 0) goToLeaderboard();
  }, [state.leaderboard?.length, goToLeaderboard]);

  return (
    <div className="min-h-screen bg-[#0a0a1a] bg-grid flex flex-col p-4 pb-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-60 bg-gradient-to-b from-purple-900/20 to-transparent" />

      <div className="relative z-10 w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between pt-2 mb-8">
          <div className="w-10" />
          <div className="text-center">
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              Leaderboard
            </h1>
            <p className="text-gray-400 text-sm">Live rankings</p>
          </div>
          <div className="w-10" />
        </div>

        {/* Top 3 podium */}
        {sorted.length >= 3 && (
          <div className="flex items-end justify-center gap-3 mb-8">
            {/* 2nd place */}
            <div className="flex-1 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-xl font-black text-white mb-2 shadow-lg">
                {sorted[1]?.username?.[0]?.toUpperCase()}
              </div>
              <p className="text-gray-300 text-xs font-bold truncate">{sorted[1]?.username}</p>
              <p className="text-gray-400 text-xs">{sorted[1]?.wins} wins</p>
              <p className="text-blue-400 text-xs flex items-center justify-center gap-0.5">
                <Clock className="w-3 h-3" />{formatTime(sorted[1]?.totalTime)}
              </p>
              <div className="mt-2 bg-gray-500/30 rounded-t-xl h-16 flex items-center justify-center">
                <span className="text-3xl">🥈</span>
              </div>
            </div>

            {/* 1st place */}
            <div className="flex-1 text-center">
              <div className="relative">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-2xl font-black text-black mb-2 shadow-xl neon-gold">
                  {sorted[0]?.username?.[0]?.toUpperCase()}
                </div>
                {sorted[0]?.stage === 'champion' && (
                  <div className="absolute -top-2 -right-2">
                    <Flame className="w-5 h-5 text-orange-400 animate-bounce" />
                  </div>
                )}
              </div>
              <p className="text-amber-400 text-sm font-black truncate">{sorted[0]?.username}</p>
              <p className="text-amber-300 text-xs">{sorted[0]?.wins} wins</p>
              <p className="text-blue-300 text-xs flex items-center justify-center gap-0.5">
                <Clock className="w-3 h-3" />{formatTime(sorted[0]?.totalTime)}
              </p>
              <div className="mt-2 bg-amber-500/20 border border-amber-500/30 rounded-t-xl h-24 flex items-center justify-center">
                <span className="text-4xl">🥇</span>
              </div>
            </div>

            {/* 3rd place */}
            <div className="flex-1 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center text-xl font-black text-white mb-2 shadow-lg">
                {sorted[2]?.username?.[0]?.toUpperCase()}
              </div>
              <p className="text-gray-300 text-xs font-bold truncate">{sorted[2]?.username}</p>
              <p className="text-gray-400 text-xs">{sorted[2]?.wins} wins</p>
              <p className="text-blue-400 text-xs flex items-center justify-center gap-0.5">
                <Clock className="w-3 h-3" />{formatTime(sorted[2]?.totalTime)}
              </p>
              <div className="mt-2 bg-amber-800/20 rounded-t-xl h-10 flex items-center justify-center">
                <span className="text-2xl">🥉</span>
              </div>
            </div>
          </div>
        )}

        {/* Full list */}
        <div className="space-y-3">
          {sorted.map((player, index) => {
            const isMe = player.username === state.username;
            const isChampion = player.wins >= 10;
            return (
              <div
                key={player.username + index}
                className={`flex items-center gap-4 rounded-2xl p-4 transition-all
                  ${isMe
                    ? 'bg-purple-500/20 border border-purple-500/50 neon-purple'
                    : 'glass hover:bg-white/5'
                  }`}
              >
                {/* Rank */}
                <div className="w-8 text-center">
                  {index < 3
                    ? <span className="text-xl">{MEDALS[index]}</span>
                    : <span className="text-gray-500 font-bold text-lg">{index + 1}</span>
                  }
                </div>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white shrink-0
                  ${isChampion ? 'bg-linear-to-br from-amber-400 to-orange-500' : 'bg-linear-to-br from-purple-600 to-blue-700'}`}>
                  {player.username?.[0]?.toUpperCase()}
                </div>

                {/* Name + badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-sm truncate ${isMe ? 'text-purple-400' : 'text-white'}`}>
                      {player.username} {isMe && '(You)'}
                    </p>
                    {isChampion && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold">
                        🏆 CHAMPION
                      </span>
                    )}
                  </div>
                  {/* Player ID tag */}
                  <p className="text-gray-600 text-xs font-mono">#{String(index + 1).padStart(3, '0')}</p>
                  {/* Win dots */}
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i}
                        className={`w-2 h-2 rounded-full ${i < player.wins ? 'bg-amber-400' : 'bg-white/10'}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Wins + time */}
                <div className="text-right shrink-0">
                  <span className="text-white font-black text-lg">{player.wins}</span>
                  <p className="text-gray-500 text-xs">wins</p>
                  {player.totalTime > 0 && (
                    <p className="text-blue-400 text-xs flex items-center gap-0.5 justify-end">
                      <Clock className="w-3 h-3" />{formatTime(player.totalTime)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Wait for next tournament notice */}
        <div className="mt-8">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30">
            <Clock className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-300 text-sm font-bold mb-0.5">Wait for the Next Tournament</p>
              <p className="text-gray-400 text-xs leading-relaxed">
                This tournament is still in progress. You cannot start a new game until the admin opens the next tournament.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
