import { useEffect, useState, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { Users, Clock, Trophy, Wifi } from 'lucide-react';
import socket from '../utils/socket';
import { getDeviceId } from '../utils/anticheat';
import { getOrCreateSessionToken } from '../utils/security';

export default function WaitingScreen() {
  const { state, joinLobby } = useGame();
  const { username, waitingCount, tournamentStarted, scheduledDate } = state;
  const [dotCount, setDotCount] = useState(1);
  const [pulse, setPulse] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [countdown, setCountdown] = useState('');

  const messages = [
    'Hang tight, the arena is being prepared...',
    'More players are joining every minute!',
    'The admin will start the tournament soon...',
    'Get your game face on!',
    'Champions are made in moments like these.',
    'Study up — every second counts in the arena!',
  ];

  // Animate dots
  useEffect(() => {
    const t = setInterval(() => setDotCount(d => (d % 3) + 1), 600);
    return () => clearInterval(t);
  }, []);

  // Rotate motivational messages
  useEffect(() => {
    const t = setInterval(() => setMessageIndex(i => (i + 1) % messages.length), 4000);
    return () => clearInterval(t);
  }, []);

  // Pulse effect on new player count
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 400);
    return () => clearTimeout(t);
  }, [waitingCount]);

  // Countdown to scheduled date
  useEffect(() => {
    if (!scheduledDate) { setCountdown(''); return; }
    const update = () => {
      const diff = new Date(scheduledDate).getTime() - Date.now();
      if (diff <= 0) { setCountdown('Starting soon!'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const parts = [];
      if (d > 0) parts.push(`${d}d`);
      if (h > 0) parts.push(`${h}h`);
      parts.push(`${m}m`);
      parts.push(`${s}s`);
      setCountdown(parts.join(' '));
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [scheduledDate]);

  // When tournament starts, auto-rejoin lobby so pairing can happen
  useEffect(() => {
    if (!tournamentStarted) return;
    const deviceId = getDeviceId();
    const sessionToken = getOrCreateSessionToken();
    if (!socket.connected) socket.connect();
    socket.emit('register_device', { deviceId, sessionToken });
    socket.emit('join_lobby', { deviceId, username, sessionToken });
  }, [tournamentStarted, username]);

  return (
    <div className="min-h-screen bg-[#0a0a1a] bg-grid flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-[20%] left-[15%] w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[20%] right-[15%] w-80 h-80 bg-purple-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-[50%] left-[60%] w-48 h-48 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} />

      <div className="relative z-10 w-full max-w-md text-center">

        {/* Animated waiting ring */}
        <div className="relative w-44 h-44 mx-auto mb-8">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="absolute inset-0 rounded-full border-2 border-indigo-500/30"
              style={{
                animation: `waitRing ${2 + i * 0.6}s ease-in-out infinite`,
                animationDelay: `${i * 0.4}s`,
              }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-3xl bg-linear-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-2xl"
              style={{ boxShadow: '0 0 40px rgba(99,102,241,0.4)' }}>
              <Clock className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-black text-white mb-2">
          Waiting for Tournament{'.'.repeat(dotCount)}
        </h1>
        <p className="text-gray-400 mb-4">
          Welcome, <span className="text-indigo-400 font-bold">{username}</span>! You're registered.
        </p>

        {/* Scheduled date & countdown */}
        {scheduledDate && (
          <div className="glass rounded-2xl p-5 mb-6 border border-indigo-500/20">
            <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-2">Tournament Date</p>
            <p className="text-white font-bold text-lg mb-1">
              {new Date(scheduledDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="text-indigo-300 text-sm mb-3">
              {new Date(scheduledDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </p>
            {countdown && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/15 rounded-xl border border-indigo-500/25">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span className="text-indigo-300 font-black text-lg font-mono">{countdown}</span>
              </div>
            )}
          </div>
        )}

        {/* Player count card */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Users className={`w-6 h-6 text-indigo-400 transition-transform duration-300 ${pulse ? 'scale-125' : 'scale-100'}`} />
            <span className={`text-5xl font-black text-white transition-transform duration-300 ${pulse ? 'scale-110' : 'scale-100'}`}>
              {waitingCount}
            </span>
          </div>
          <p className="text-gray-400 text-sm">players waiting to compete</p>

          {/* Player dots visualization */}
          <div className="flex flex-wrap justify-center gap-1.5 mt-4 max-w-xs mx-auto">
            {Array.from({ length: Math.min(waitingCount, 40) }).map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-linear-to-br from-indigo-500 to-purple-500"
                style={{
                  animation: 'dotPop 0.3s ease-out both',
                  animationDelay: `${i * 50}ms`,
                  opacity: 0.5 + Math.random() * 0.5,
                }}
              />
            ))}
            {waitingCount > 40 && (
              <span className="text-indigo-400 text-xs font-bold self-center ml-1">+{waitingCount - 40}</span>
            )}
          </div>
        </div>

        {/* Connection status */}
        <div className="glass rounded-2xl p-4 mb-6 flex items-center justify-center gap-3">
          <Wifi className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-sm font-medium">Connected & Registered</span>
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        </div>

        {/* Motivational message ticker */}
        <div className="glass rounded-2xl p-4 mb-6">
          <p className="text-gray-300 text-sm transition-all duration-500 min-h-10 flex items-center justify-center">
            {messages[messageIndex]}
          </p>
        </div>

        {/* Prize reminder */}
        <div className="glass rounded-2xl p-4 bg-linear-to-r from-amber-500/5 to-yellow-500/5 border border-amber-500/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-amber-400 font-bold text-sm">Grand Prize</span>
          </div>
          <p className="text-white font-bold text-lg">Win up to ₦20,000</p>
          <p className="text-gray-500 text-xs mt-1">Tournament starts when the admin is ready</p>
        </div>
      </div>

      <style>{`
        @keyframes waitRing {
          0% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.8); opacity: 0; }
          100% { transform: scale(0.9); opacity: 0; }
        }
        @keyframes dotPop {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
