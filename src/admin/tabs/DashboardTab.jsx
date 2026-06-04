import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../AdminContext';
import { Users, Zap, AlertCircle, CheckCircle, RotateCcw, Database, Swords, Gift } from 'lucide-react';
import { BASE_URL as API, adminAuthHeaders, fetchTournamentStatus } from '../../utils/api';
import WinnerChat from '../WinnerChat';

export default function DashboardTab() {
  const { state, dispatch } = useAdmin();
  const [resetting, setResetting] = useState(false);
  const { winners, settings, winnerSubmissions } = state;
  const [status, setStatus] = useState({
    registeredCount: 0,
    activeCount: 0,
    maxPlayers: 400,
    rewardAmount: '',
    questionBankSize: 0,
    tournamentStarted: false,
    currentRound: 1,
    players: [],
  });

  const reload = useCallback(async () => {
    try {
      const data = await fetchTournamentStatus();
      setStatus({
        registeredCount: data.registeredCount ?? 0,
        activeCount: data.activeCount ?? 0,
        maxPlayers: data.maxPlayers ?? 400,
        rewardAmount: data.rewardAmount ?? '',
        questionBankSize: data.questionBankSize ?? 0,
        tournamentStarted: !!data.tournamentStarted,
        currentRound: data.currentRound ?? 1,
        players: data.players ?? [],
      });
    } catch (_) {
      // server may be down — leave defaults
    }
  }, []);

  useEffect(() => {
    reload();
    const t = setInterval(reload, 3000);
    return () => clearInterval(t);
  }, [reload]);

  const pendingClaims = (winnerSubmissions || winners || []).filter(w => !w.paid).length;
  const paidOut       = (winnerSubmissions || winners || []).filter(w =>  w.paid).length;
  const onlineCount   = status.activeCount;

  const stats = [
    { icon: Users,       label: 'Registered Players', value: `${status.registeredCount} / ${status.maxPlayers}`, color: 'from-blue-600 to-blue-700',     glow: 'rgba(59,130,246,0.4)'  },
    { icon: Zap,         label: 'Online Now',         value: onlineCount,           color: 'from-purple-600 to-purple-700', glow: 'rgba(139,92,246,0.4)' },
    { icon: Swords,      label: 'Current Round',      value: status.tournamentStarted ? status.currentRound : '—', color: 'from-pink-600 to-pink-700',     glow: 'rgba(236,72,153,0.4)' },
    { icon: Database,    label: 'Questions in Bank',  value: status.questionBankSize, color: 'from-indigo-600 to-indigo-700', glow: 'rgba(99,102,241,0.4)' },
    { icon: AlertCircle, label: 'Pending Payouts',    value: pendingClaims,         color: 'from-rose-600 to-rose-700',     glow: 'rgba(239,68,68,0.4)'  },
    { icon: CheckCircle, label: 'Rewards Paid',       value: paidOut,               color: 'from-green-600 to-green-700',   glow: 'rgba(34,197,94,0.4)'  },
  ];

  return (
    <div className="space-y-6">
      {/* Game status banner */}
      <div className={`rounded-2xl p-4 flex items-center justify-between border
        ${status.tournamentStarted ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full animate-pulse ${status.tournamentStarted ? 'bg-green-400' : 'bg-amber-400'}`} />
          <span className="text-white font-bold">
            {status.tournamentStarted
              ? `🟢 Tournament LIVE — Round ${status.currentRound}`
              : `🟡 Registration open — ${status.registeredCount}/${status.maxPlayers} joined`}
          </span>
        </div>
        <div className="text-gray-400 text-sm flex items-center gap-3">
          {status.rewardAmount && (
            <span className="flex items-center gap-1 text-amber-300 font-bold">
              <Gift className="w-3.5 h-3.5" /> {status.rewardAmount}
            </span>
          )}
          <span>Timer: {settings?.questionTimer ?? 9}s</span>
        </div>
      </div>

      {/* Question bank warning */}
      {status.questionBankSize === 0 && (
        <div className="rounded-2xl p-4 bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          ⚠️ No questions in the bank. Seed MongoDB via <code className="text-red-200">npm run seed:questions</code> or open <strong>Tournament</strong> tab → Reload from DB.
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(({ icon: Icon, label, value, color, glow }) => (
          <div
            key={label}
            className="glass rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all"
            style={{ boxShadow: `0 0 20px ${glow}` }}
          >
            <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-3xl font-black text-white">{value}</div>
            <div className="text-gray-400 text-sm mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Winner chat (admin ↔ champion) */}
      <WinnerChat />

      {/* Live player list */}
      <div className="glass rounded-2xl p-5 border border-white/5">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" /> Registered Players
          <span className="ml-auto text-xs text-gray-500 font-mono">{status.players.length}</span>
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {status.players.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-600 text-sm">No players yet</p>
              <p className="text-gray-700 text-xs mt-1">Players will appear here as they join the tournament.</p>
            </div>
          ) : status.players.map((p, i) => (
            <div key={p.username + i} className="flex items-center justify-between py-2 border-b border-white/5">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${p.isOnline ? 'bg-green-400' : 'bg-gray-600'}`} />
                <span className="text-white text-sm font-medium">{p.username}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-lg font-medium
                ${p.status === 'champion'   ? 'bg-amber-500/20 text-amber-400'
                : p.status === 'playing'    ? 'bg-blue-500/20 text-blue-400'
                : p.status === 'eliminated' ? 'bg-red-500/20 text-red-400'
                : 'bg-purple-500/20 text-purple-400'}`}>
                {p.status || 'waiting'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reset All Section */}
      <div className="glass rounded-2xl p-5 border border-red-500/20 bg-red-500/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-red-400" /> Reset Everything
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Clears all matches, players, leaderboard, and tournament data. Use for fresh start.
            </p>
          </div>
          <button
            onClick={async () => {
              if (!confirm('Are you sure? This will clear ALL game data including leaderboard, matches, and registered players.')) return;
              setResetting(true);
              try {
                const res = await fetch(`${API}/admin/reset-all`, { method: 'POST', headers: adminAuthHeaders() });
                if (res.ok) {
                  dispatch({ type: 'SHOW_TOAST', payload: { type: 'success', msg: 'Game fully reset!' } });
                  await reload();
                } else {
                  throw new Error('Failed');
                }
              } catch (e) {
                dispatch({ type: 'SHOW_TOAST', payload: { type: 'error', msg: 'Reset failed' } });
              }
              setResetting(false);
            }}
            disabled={resetting}
            className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-500 rounded-2xl text-white font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
            {resetting ? 'Resetting...' : 'Reset All'}
          </button>
        </div>
      </div>
    </div>
  );
}
