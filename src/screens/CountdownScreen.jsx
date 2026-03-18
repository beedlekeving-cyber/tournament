import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { Swords } from 'lucide-react';
import { playCountdown } from '../utils/sounds';

export default function CountdownScreen() {
  const { state } = useGame();
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setScale(1.4);
    playCountdown(state.matchCountdown);
    const t = setTimeout(() => setScale(1), 300);
    return () => clearTimeout(t);
  }, [state.matchCountdown]);

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-blue-900/20" />

      <div className="relative z-10 w-full max-w-sm text-center">
        {/* VS banner */}
        <div className="glass rounded-3xl p-6 mb-8 border border-purple-500/30">
          {/* Big username vs username text */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <span
              className="font-black text-xl truncate max-w-[110px] text-right"
              style={{ color: '#c084fc' }}
            >
              {state.username}
            </span>
            <span className="bg-amber-500/20 border border-amber-500/50 rounded-lg px-2.5 py-1 text-amber-400 font-black text-sm tracking-widest shrink-0">
              VS
            </span>
            <span
              className="font-black text-xl truncate max-w-[110px]"
              style={{ color: '#f87171' }}
            >
              {state.opponent?.username}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            {/* Player */}
            <div className="flex-1 text-center">
              <div
                className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-2xl font-black text-white mb-2"
                style={{ boxShadow: '0 0 20px rgba(139,92,246,0.6)' }}
              >
                {state.username?.[0]?.toUpperCase() || '?'}
              </div>
              <p className="text-purple-300 font-black truncate">{state.username}</p>
              <p className="text-purple-400 text-xs mt-0.5">Player 🎮</p>
            </div>

            {/* VS icon */}
            <div className="flex flex-col items-center shrink-0">
              <Swords className="w-9 h-9 text-amber-400" />
            </div>

            {/* Opponent */}
            <div className="flex-1 text-center">
              <div
                className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-2xl font-black text-white mb-2"
                style={{ boxShadow: '0 0 20px rgba(239,68,68,0.6)' }}
              >
                {state.opponent?.username?.[0]?.toUpperCase() || '?'}
              </div>
              <p className="text-red-300 font-black truncate">{state.opponent?.username}</p>
              <p className="text-red-400 text-xs mt-0.5">Player 🎮</p>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <p className="text-gray-400 text-lg mb-4">Match starting in</p>
        <div
          className="text-9xl font-black text-white transition-transform duration-300"
          style={{ transform: `scale(${scale})` }}
        >
          <span className="shimmer-text">{state.matchCountdown}</span>
        </div>
        <p className="text-gray-500 mt-6 text-sm">Get ready to answer fast!</p>

        {/* Rules reminder */}
        <div className="mt-8 glass rounded-2xl p-4 text-left space-y-2">
          {[
            ['✅', 'Only you correct → You win'],
            ['❌', 'Both wrong → Both lose'],
            ['⚡', 'Both correct → Next question (fastest wins after 3)'],
          ].map(([icon, rule]) => (
            <div key={rule} className="flex gap-2 text-sm text-gray-400">
              <span>{icon}</span>
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
