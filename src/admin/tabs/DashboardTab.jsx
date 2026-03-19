import { useState } from 'react';
import { useAdmin } from '../AdminContext';
import { Users, BookOpen, Trophy, Settings, TrendingUp, Zap, AlertCircle, CheckCircle, RotateCcw } from 'lucide-react';
import { BASE_URL as API, adminAuthHeaders } from '../../utils/api';

export default function DashboardTab() {
  const { state, dispatch } = useAdmin();
  const [resetting, setResetting] = useState(false);
  const { questions, winners, players, settings } = state;

  const onlinePlayers  = players.filter(p => p.status === 'online').length;
  const activeMatches  = [...new Set(players.filter(p => p.matchId).map(p => p.matchId))].length;
  const pendingClaims  = winners.filter(w => w.status === 'pending').length;
  const paidOut        = winners.filter(w => w.status === 'paid').length;
  const finalPlayers   = players.filter(p => p.stage === 'final').length;

  const stats = [
    { icon: Users,     label: 'Online Players',  value: onlinePlayers,  color: 'from-blue-600 to-blue-700',    glow: 'rgba(59,130,246,0.4)'  },
    { icon: Zap,       label: 'Active Matches',  value: activeMatches,  color: 'from-purple-600 to-purple-700', glow: 'rgba(139,92,246,0.4)' },
    { icon: Trophy,    label: 'Final Stage',     value: finalPlayers,   color: 'from-amber-500 to-amber-600',   glow: 'rgba(245,158,11,0.4)' },
    { icon: AlertCircle, label: 'Pending Claims', value: pendingClaims, color: 'from-rose-600 to-rose-700',     glow: 'rgba(239,68,68,0.4)'  },
    { icon: CheckCircle, label: 'Prizes Paid',   value: paidOut,        color: 'from-green-600 to-green-700',   glow: 'rgba(34,197,94,0.4)'  },
    { icon: BookOpen,  label: 'Questions',       value: questions.length, color: 'from-indigo-600 to-indigo-700', glow: 'rgba(99,102,241,0.4)' },
  ];

  // Recent activity feed — populated by real events
  const activity = [];

  return (
    <div className="space-y-6">
      {/* Game status banner */}
      <div className={`rounded-2xl p-4 flex items-center justify-between border
        ${settings.gameActive && !settings.maintenanceMode
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-red-500/10 border-red-500/30'
        }`}>
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full animate-pulse ${settings.gameActive && !settings.maintenanceMode ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-white font-bold">
            Game Status: {settings.maintenanceMode ? '🔧 Maintenance Mode' : settings.gameActive ? '🟢 Live & Active' : '🔴 Offline'}
          </span>
        </div>
        <div className="text-gray-400 text-sm">
          Timer: {settings.questionTimer}s · Wins to Final: {settings.winsRequired}
        </div>
      </div>

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

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live player list */}
        <div className="glass rounded-2xl p-5 border border-white/5">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" /> Live Players
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {players.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-600 text-sm">No players yet</p>
                <p className="text-gray-700 text-xs mt-1">Players will appear here once the tournament starts</p>
              </div>
            ) : players.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${p.status === 'online' ? 'bg-green-400' : 'bg-gray-600'}`} />
                  <span className="text-white text-sm font-medium">{p.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs">{p.wins}/6 wins</span>
                  <span className={`text-xs px-2 py-0.5 rounded-lg font-medium
                    ${p.stage === 'final'   ? 'bg-amber-500/20 text-amber-400'
                    : p.stage === 'playing' ? 'bg-blue-500/20 text-blue-400'
                    : p.stage === 'lobby'   ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-gray-500/20 text-gray-400'}`}>
                    {p.stage}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="glass rounded-2xl p-5 border border-white/5">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" /> Recent Activity
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {activity.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-600 text-sm">No activity yet</p>
                <p className="text-gray-700 text-xs mt-1">Events will appear here during the tournament</p>
              </div>
            ) : activity.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-lg shrink-0">{a.icon}</span>
                <div className="min-w-0">
                  <p className={`text-sm ${a.color}`}>{a.text}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
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
