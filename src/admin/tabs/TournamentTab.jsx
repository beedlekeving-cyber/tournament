import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../AdminContext';
import { Play, RotateCcw, Users, Swords, Clock, RefreshCw, CalendarClock } from 'lucide-react';
import { BASE_URL as API, adminAuthHeaders } from '../../utils/api';

export default function TournamentTab() {
  const { dispatch } = useAdmin();
  const [config, setConfig] = useState({ scheduledDate: null, tournamentStarted: false, registrationOpen: false });
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('12:00');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/tournament/status`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setConfig({
        scheduledDate: data.scheduledDate,
        tournamentStarted: data.tournamentStarted,
        registrationOpen: data.registrationOpen,
      });
      setPlayers(data.players || []);
      setError('');
    } catch (e) {
      setError('Could not reach server');
    }
  }, []);

  // Poll every 3 seconds
  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, 3000);
    return () => clearInterval(t);
  }, [fetchStatus]);

  const scheduleTournament = async () => {
    if (!dateInput) {
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'error', msg: 'Please select a date' } });
      return;
    }
    setLoading(true);
    try {
      const scheduledDate = new Date(`${dateInput}T${timeInput}`).toISOString();
      const res = await fetch(`${API}/admin/tournament/schedule`, {
        method: 'POST',
        headers: adminAuthHeaders(),
        body: JSON.stringify({ scheduledDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'success', msg: 'Tournament scheduled! Registration is open.' } });
      await fetchStatus();
    } catch (e) {
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'error', msg: e.message } });
    }
    setLoading(false);
  };

  const startTournament = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/tournament/start`, { method: 'POST', headers: adminAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'success', msg: `Tournament started with ${data.playerCount} players!` } });
      await fetchStatus();
    } catch (e) {
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'error', msg: e.message } });
    }
    setLoading(false);
  };

  const resetTournament = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/tournament/reset`, { method: 'POST', headers: adminAuthHeaders() });
      if (!res.ok) throw new Error('Failed');
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'success', msg: 'Tournament reset. Back to normal mode.' } });
      setDateInput('');
      setTimeInput('12:00');
      await fetchStatus();
    } catch (e) {
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'error', msg: e.message } });
    }
    setLoading(false);
  };

  const mode = !config.scheduledDate ? 'normal' : config.tournamentStarted ? 'live' : 'registration';

  const statusConfig = {
    normal:       { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: 'Normal Mode (No Tournament)' },
    registration: { color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: 'Registration Open' },
    live:         { color: 'bg-green-500/20 text-green-300 border-green-500/30', label: 'Tournament LIVE' },
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-black text-white mb-1">Tournament Control</h1>
      <p className="text-gray-500 text-sm mb-7">Set a date to open registration. Start when ready.</p>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Status bar */}
      <div className="glass rounded-2xl p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-gray-400 text-xs mb-1.5 uppercase tracking-widest font-semibold">Mode</p>
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black border ${statusConfig[mode].color}`}>
            {statusConfig[mode].label}
          </span>
          {config.scheduledDate && (
            <p className="text-gray-500 text-xs mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Scheduled: {formatDate(config.scheduledDate)}
            </p>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          {mode === 'registration' && (
            <button
              onClick={startTournament}
              disabled={loading || players.length < 2}
              className="flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-500 rounded-2xl text-white font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50">
              <Play className="w-4 h-4" /> Start Tournament ({players.length} players)
            </button>
          )}
          {config.scheduledDate && (
            <button
              onClick={resetTournament}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-3 bg-red-600/80 hover:bg-red-500 rounded-2xl text-white font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          )}
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-gray-300 font-bold text-sm transition-all disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Schedule form — only show when no tournament is scheduled yet */}
      {mode === 'normal' && (
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="w-5 h-5 text-indigo-400" />
            <h2 className="text-white font-bold">Schedule Tournament</h2>
          </div>
          <p className="text-gray-500 text-sm mb-5">
            Set the tournament date. Registration will open immediately so players can enter their usernames and wait.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="text-gray-400 text-xs font-semibold block mb-1.5">Date</label>
              <input
                type="date"
                value={dateInput}
                onChange={e => setDateInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="w-32">
              <label className="text-gray-400 text-xs font-semibold block mb-1.5">Time</label>
              <input
                type="time"
                value={timeInput}
                onChange={e => setTimeInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <button
              onClick={scheduleTournament}
              disabled={loading || !dateInput}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-white font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50">
              <CalendarClock className="w-4 h-4" /> Schedule & Open Registration
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {[
          { icon: Users,  label: 'Registered Players', value: players.length,  color: 'text-indigo-400' },
          { icon: Swords, label: 'Mode',               value: mode === 'live' ? 'LIVE' : mode === 'registration' ? 'Registering' : 'Normal', color: mode === 'live' ? 'text-green-400' : mode === 'registration' ? 'text-amber-400' : 'text-gray-400' },
          { icon: Clock,  label: 'Scheduled',          value: config.scheduledDate ? formatDate(config.scheduledDate) : 'None', color: config.scheduledDate ? 'text-indigo-400' : 'text-gray-500' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass rounded-2xl p-4 text-center">
            <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
            <p className={`font-black text-lg ${color}`}>{value}</p>
            <p className="text-gray-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Registered players list */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-white font-bold">Registered Players</h2>
          <span className="text-xs text-gray-500">{players.length} total</span>
        </div>
        <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
          {players.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-600 text-sm">
              {mode === 'normal'
                ? 'No tournament scheduled. Set a date above to open registration.'
                : 'No players yet. Share the link and wait for players to join!'}
            </div>
          ) : (
            players.map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-white/3">
                <div className="w-8 h-8 rounded-xl bg-linear-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white text-xs font-black shrink-0">
                  {p.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{p.username}</p>
                  <p className="text-gray-500 text-xs">Joined {new Date(p.joinedAt).toLocaleTimeString()}</p>
                </div>
                <span className="text-xs text-indigo-400 font-mono bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg">
                  #{i + 1}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
