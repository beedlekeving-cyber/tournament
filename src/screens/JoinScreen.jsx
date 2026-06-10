import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, Zap, Users, Star, Eye, ShieldCheck } from 'lucide-react';
import { playClick } from '../utils/sounds';
import {
  isUsernameTaken, isDeviceEliminated, getEliminationInfo,
  getCoins, getStreak, getStreakBonus,
} from '../utils/anticheat';

export default function JoinScreen() {
  const { joinLobby, state } = useGame();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const [coins, setCoins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [eliminated, setEliminated] = useState(false);
  const [elimInfo, setElimInfo] = useState(null);
  const [showShop, setShowShop] = useState(false);

  useEffect(() => {
    setCoins(getCoins());
    setStreak(getStreak());
    const stillEliminated = isDeviceEliminated();
    const info = getEliminationInfo();
    if (stillEliminated && info) {
      setEliminated(true);
      setElimInfo(info);
    } else {
      setEliminated(false);
      setElimInfo(null);
    }
  }, []);

  const streakBonus = getStreakBonus(streak);

  const getTimeLeft = () => {
    if (!elimInfo) return '';
    const ms = 3600000 - (Date.now() - elimInfo.time);
    if (ms <= 0) return '';
    return `(${Math.floor(ms / 60000)} min remaining)`;
  };

  const handleJoin = () => {
    const trimmed = username.trim();
    if (!trimmed) { setError('Please enter a username'); return; }
    if (trimmed.length < 3) { setError('Username must be at least 3 characters'); return; }
    if (trimmed.length > 20) { setError('Username must be 20 characters or less'); return; }
    if (isDeviceEliminated()) { setError('⛔ Your device is evicted. Wait for the cooldown or clear below.'); return; }
    if (isUsernameTaken(trimmed)) { setError('Username already taken — choose another.'); return; }
    playClick();
    joinLobby(trimmed);
  };

  const handleKey = (e) => { if (e.key === 'Enter') handleJoin(); };

  const shopItems = [
    { id: 'extra_life', name: 'Extra Life',    desc: 'Rejoin after elimination once', cost: 50, emoji: '❤️' },
    { id: 'hint',       name: 'Hint Shield',   desc: 'Eliminate one wrong option',    cost: 30, emoji: '🛡️' },
    { id: 'time_boost', name: '+3s Time Boost', desc: 'Extra 3 seconds this round',   cost: 20, emoji: '⚡' },
  ];

  const stats = [
    { icon: Users, label: 'Players',  value: '1,200+' },
    { icon: Trophy, label: 'Winners', value: '1,203' },
    { icon: Zap,   label: 'Matches',  value: '4,500+' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a1a] bg-grid flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-[40%] right-[10%] w-64 h-64 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

      {/* ── Coin Shop Modal ── */}
      {showShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f0f20] border border-amber-500/30 rounded-3xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-black text-xl">🪙 Coin Shop</h2>
              <button onClick={() => setShowShop(false)} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="flex items-center gap-2 mb-5 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <span className="text-2xl">🪙</span>
              <span className="text-amber-400 font-black text-xl">{coins} Coins</span>
            </div>
            <div className="space-y-3">
              {shopItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-3xl">{item.emoji}</span>
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm">{item.name}</p>
                    <p className="text-gray-400 text-xs">{item.desc}</p>
                  </div>
                  <button disabled={coins < item.cost}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${coins >= item.cost ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-white/10 text-gray-600 cursor-not-allowed'}`}>
                    🪙{item.cost}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-gray-600 text-xs text-center mt-4">Earn coins by winning matches</p>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-md">

        {/* ── Top bar: coins | streak | spectators ── */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setShowShop(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/15 border border-amber-500/30 rounded-xl hover:bg-amber-500/25 transition-all">
            <span className="text-lg">🪙</span>
            <span className="text-amber-400 font-black text-sm">{coins}</span>
          </button>
          {streakBonus ? (
            <span className={`text-xs font-black px-3 py-1.5 rounded-xl bg-orange-500/20 border border-orange-500/30 ${streakBonus.color}`}>
              {streakBonus.label}
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
            <Eye className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-purple-300 font-bold text-xs">{(state.spectators || 148)} watching</span>
          </div>
        </div>

        {/* ── Logo / Hero ── */}
        <div className="text-center mb-8">
          <div className="float-animation inline-block mb-4">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center neon-purple shadow-2xl">
              <Trophy className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-black mb-2">
            <span className="shimmer-text">QUIZ</span>
            <span className="text-white"> TOURNAMENT</span>
          </h1>
          <p className="text-gray-400 text-lg">1v1 Live Tournament</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-sm font-medium">Live Now</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 text-xs font-medium">Anti-Cheat Active</span>
            </div>
          </div>
        </div>

        {/* ── Elimination banner ── */}
        {eliminated && (
          <div className="mb-5 p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⛔</span>
              <p className="text-red-400 font-bold text-sm">Evicted {getTimeLeft()}</p>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              {elimInfo?.username ? `"${elimInfo.username}" was evicted. ` : ''}
              Both players answered wrong. You cannot rejoin until the admin opens the next tournament.
            </p>
            <p className="text-gray-600 text-xs mt-2 italic">⏳ Please wait for the next tournament to begin.</p>
          </div>
        )}

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass rounded-2xl p-3 text-center">
              <Icon className="w-5 h-5 mx-auto mb-1 text-purple-400" />
              <div className="text-white font-bold text-lg">{value}</div>
              <div className="text-gray-500 text-xs">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Join Card ── */}
        <div className="glass rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Enter the Arena</h2>
          <div className="relative mb-4">
            <input
              type="text"
              value={username}
              disabled={eliminated}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              onKeyDown={handleKey}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Choose your username"
              maxLength={20}
              className={`w-full bg-white/5 border-2 rounded-2xl px-5 py-4 text-white text-lg outline-none transition-all duration-300 placeholder-gray-600
                ${focused ? 'border-purple-500 shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'border-white/10'}
                ${error ? 'border-red-500' : ''}
                ${eliminated ? 'opacity-40 cursor-not-allowed' : ''}`}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 text-sm">{username.length}/20</div>
          </div>

          {error && (
            <p className="text-red-400 text-sm mb-4 flex items-center gap-2"><span>⚠️</span>{error}</p>
          )}

          <button
            onClick={handleJoin}
            disabled={eliminated}
            className={`w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-95 neon-purple shadow-xl
              ${eliminated
                ? 'opacity-40 cursor-not-allowed bg-gray-700'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500'}`}
          >
            ⚔️ Join Match Now
          </button>

          <button
            onClick={() => window.location.href = '/tournament'}
            className="w-full mt-3 py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-95 shadow-xl bg-gradient-to-r from-yellow-600 via-amber-600 to-yellow-700 hover:from-yellow-500 hover:via-amber-500 hover:to-yellow-600"
          >
            🏆 Enter Quiz Arena
          </button>

          <div className="mt-6 rounded-2xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-semibold text-sm">Grand Prize</span>
            </div>
            <p className="text-white font-bold text-xl">Win up to ₦20,000 🏆</p>
            <p className="text-gray-400 text-sm mt-1">Beat 6 opponents → Enter Final Stage</p>
          </div>
        </div>

        {/* ── How to play ── */}
        <div className="mt-6 glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-3 text-center">How to Play</h3>
          <div className="space-y-2">
            {[
              ['⚔️', 'Face 1-vs-1 opponents'],
              ['⏱️', '9 seconds to answer each question'],
              ['🏆', 'Win 6 duels to reach Final Stage'],
              ['💰', 'Answer 10 questions to claim your prize'],
              ['🔥', 'Win streaks earn bonus coins'],
              ['🛡️', 'Anti-cheat: one device per match'],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-3 text-gray-300 text-sm">
                <span className="text-lg">{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
