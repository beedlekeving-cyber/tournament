import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { Users } from 'lucide-react';
import { playMatchFound } from '../utils/sounds';
import socket from '../utils/socket';

const tips = [
  '⚡ Read questions fast — 9 seconds go quick!',
  '🧠 Trust your first instinct — it\'s usually right.',
  '🏆 Win 10 duels to become a Champion!',
  '💡 Both wrong = both evicted. Think before clicking!',
  '🎯 Speed matters when both players answer correctly.',
  '🔥 Stay calm under pressure — champions always do.',
];

export default function LobbyScreen() {
  const { state } = useGame();
  const [tipIndex, setTipIndex] = useState(0);
  const [dotCount, setDotCount] = useState(1);
  const [lobbyCount, setLobbyCount] = useState(0);

  useEffect(() => {
    const onCount = ({ count }) => setLobbyCount(count);
    socket.on('lobby_count', onCount);
    return () => socket.off('lobby_count', onCount);
  }, []);

  useEffect(() => {
    const tipTimer = setInterval(() => {
      setTipIndex(i => (i + 1) % tips.length);
    }, 3000);
    return () => clearInterval(tipTimer);
  }, []);

  useEffect(() => {
    if (state.stage === 'countdown') playMatchFound();
  }, [state.stage]);

  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDotCount(d => (d % 3) + 1);
    }, 500);
    return () => clearInterval(dotTimer);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a1a] bg-grid flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-blue-600/15 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-sm text-center">
        {/* Pulsing radar */}
        <div className="relative w-40 h-40 mx-auto mb-8">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="absolute inset-0 rounded-full border-2 border-purple-500/40"
              style={{
                animation: `ping ${1.5 + i * 0.5}s cubic-bezier(0,0,0.2,1) infinite`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center neon-purple shadow-2xl">
              <Users className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>

        {/* Status */}
        <h1 className="text-3xl font-black text-white mb-2">
          Finding Opponent{'.'.repeat(dotCount)}
        </h1>
        <p className="text-gray-400 mb-2">
          Hey <span className="text-purple-400 font-bold">{state.username}</span>, searching for a worthy challenger
        </p>

        {/* Loading bar */}
        <div className="w-full bg-white/5 rounded-full h-2 mb-8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full"
            style={{
              width: '60%',
              animation: 'loading-bar 2s ease-in-out infinite alternate',
            }}
          />
        </div>

        {/* Stats */}
        <div className="glass rounded-2xl p-5 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-black text-white">{state.wins}</div>
              <div className="text-gray-400 text-sm">Your Wins</div>
              <div className="mt-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span
                    key={i}
                    className={`inline-block w-2 h-2 rounded-full mx-0.5 ${i < state.wins ? 'bg-amber-400' : 'bg-white/10'}`}
                  />
                ))}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-purple-300">{lobbyCount}</div>
              <div className="text-gray-400 text-sm">In Lobby</div>
              <div className="text-xs text-purple-300 mt-1">players waiting</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-amber-400">{Math.max(0, 10 - state.wins)}</div>
              <div className="text-gray-400 text-sm">Wins to Final</div>
              <div className="text-xs text-amber-400 mt-1">
                {state.wins >= 10 ? '🔥 Qualified!' : `Need ${10 - state.wins} more`}
              </div>
            </div>
          </div>
        </div>

        {/* Tip ticker */}
        <div className="glass rounded-2xl p-4">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Pro Tip</div>
          <p className="text-gray-300 text-sm transition-all duration-500 min-h-[2.5rem] flex items-center justify-center">
            {tips[tipIndex]}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes loading-bar {
          0% { width: 10%; }
          100% { width: 90%; }
        }
      `}</style>
    </div>
  );
}
