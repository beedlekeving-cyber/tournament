import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../AdminContext';
import { Play, RotateCcw, Users, Swords, Clock, RefreshCw, CalendarClock, Gift, Save, Database, HelpCircle, Award } from 'lucide-react';
import {
  BASE_URL as API, adminAuthHeaders,
  setTournamentReward, refreshQuestionBankFromDB, fetchTournamentStatus,
} from '../../utils/api';

const ARENA_EDITIONS = [
  'Quiz Arena: General Knowledge Edition',
  'Quiz Arena: Football Edition',
  'Quiz Arena: World Cup Edition',
  'Quiz Arena: Movie Quiz Edition',
  'Quiz Arena: Tech Quiz Edition',
  'Quiz Arena: Music Edition',
];

export default function TournamentTab() {
  const { dispatch } = useAdmin();
  const [status, setStatus] = useState({
    scheduledDate: null,
    tournamentStarted: false,
    registrationOpen: false,
    registeredCount: 0,
    activeCount: 0,
    maxPlayers: 400,
    rewardAmount: '',
    edition: ARENA_EDITIONS[0],
    questionBankSize: 0,
    players: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('12:00');
  const [rewardInput, setRewardInput] = useState('');
  const [savingEdition, setSavingEdition] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await fetchTournamentStatus();
      setStatus({
        scheduledDate: data.scheduledDate,
        tournamentStarted: data.tournamentStarted,
        registrationOpen: data.registrationOpen,
        registeredCount: data.registeredCount ?? 0,
        activeCount: data.activeCount ?? 0,
        maxPlayers: data.maxPlayers ?? 400,
        rewardAmount: data.rewardAmount ?? '',
        edition: data.edition || ARENA_EDITIONS[0],
        questionBankSize: data.questionBankSize ?? 0,
        players: data.players || [],
      });
      if (typeof data.rewardAmount === 'string') {
        dispatch({ type: 'SET_TOURNAMENT_REWARD', payload: data.rewardAmount });
        if (!rewardInput) setRewardInput(data.rewardAmount);
      }
      setError('');
    } catch (_) {
      setError('Could not reach server');
    }
  }, [dispatch, rewardInput]);

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

  const forceStart = async () => {
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
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'success', msg: 'Tournament reset.' } });
      setDateInput('');
      setTimeInput('12:00');
      await fetchStatus();
    } catch (e) {
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'error', msg: e.message } });
    }
    setLoading(false);
  };

  const saveReward = async () => {
    setLoading(true);
    try {
      await setTournamentReward(rewardInput);
      dispatch({ type: 'SET_TOURNAMENT_REWARD', payload: rewardInput });
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'success', msg: 'Reward amount saved.' } });
      await fetchStatus();
    } catch (e) {
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'error', msg: e.message } });
    }
    setLoading(false);
  };

  const saveEdition = async (edition) => {
    setSavingEdition(true);
    try {
      const res = await fetch(`${API}/admin/tournament/edition`, {
        method: 'POST',
        headers: adminAuthHeaders(),
        body: JSON.stringify({ edition }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error: ${res.status}`);
      }
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'success', msg: `Edition set to ${edition}` } });
      await fetchStatus();
    } catch (e) {
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'error', msg: e.message } });
    }
    setSavingEdition(false);
  };

  const reloadQuestions = async () => {
    setLoading(true);
    try {
      const res = await refreshQuestionBankFromDB();
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'success', msg: `Loaded ${res.count} questions from MongoDB.` } });
      await fetchStatus();
    } catch (e) {
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'error', msg: e.message } });
    }
    setLoading(false);
  };

  const mode = !status.scheduledDate ? 'normal' : status.tournamentStarted ? 'live' : 'registration';
  const isFull = status.registeredCount >= status.maxPlayers;
  const fillPct = Math.min(100, Math.round((status.registeredCount / Math.max(1, status.maxPlayers)) * 100));

  const statusConfig = {
    normal:       { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: 'No tournament scheduled' },
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
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-black text-white mb-1">Tournament Control</h1>
      <p className="text-gray-500 text-sm mb-7">Configure the prize, push questions, schedule + start.</p>

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
          {status.scheduledDate && (
            <p className="text-gray-500 text-xs mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Scheduled: {formatDate(status.scheduledDate)}
            </p>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          {mode === 'registration' && (
            <button
              onClick={forceStart}
              disabled={loading || status.registeredCount < 2 || status.questionBankSize === 0}
              title={status.questionBankSize === 0 ? 'Push the question bank first' : ''}
              className="flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-500 rounded-2xl text-white font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50">
              <Play className="w-4 h-4" /> Force-start ({status.registeredCount} players)
            </button>
          )}
          {status.scheduledDate && (
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

      {/* Cap progress bar */}
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" /> Registration capacity
          </h3>
          <span className="text-white font-mono font-black">
            {status.registeredCount} / {status.maxPlayers}
          </span>
        </div>
        <div className="h-3 rounded-full overflow-hidden bg-white/5">
          <div className="h-full transition-all"
            style={{ width: `${fillPct}%`, background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)' }} />
        </div>
        <p className="text-gray-500 text-xs mt-2">
          {isFull
            ? '🚀 At capacity — tournament auto-starts now.'
            : `Auto-starts when ${status.maxPlayers} have registered.`}
        </p>
      </div>

      {/* Edition selector */}
      <div className="glass rounded-2xl p-5 mb-6">
        <h3 className="text-white font-bold flex items-center gap-2 mb-3">
          <Award className="w-4 h-4 text-amber-400" /> Quiz Arena Edition
        </h3>
        <p className="text-gray-500 text-xs mb-3">
          Pick the edition for the current tournament. Shown everywhere players see — registration, champion screen, ViewScreen banner.
        </p>
        <select
          value={status.edition || ARENA_EDITIONS[0]}
          disabled={savingEdition || loading}
          onChange={(e) => saveEdition(e.target.value)}
          className="w-full bg-white/5 border border-white/10 focus:border-amber-500 rounded-xl px-3 py-2.5 text-white outline-none"
        >
          {ARENA_EDITIONS.map(e => (
            <option key={e} value={e} className="bg-[#0a0518] text-white">{e}</option>
          ))}
        </select>
        <p className="text-amber-300 text-xs mt-2">Active: <span className="font-bold">{status.edition || ARENA_EDITIONS[0]}</span></p>
      </div>

      {/* Reward + question bank */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-bold flex items-center gap-2 mb-3">
            <Gift className="w-4 h-4 text-amber-400" /> Reward amount
          </h3>
          <p className="text-gray-500 text-xs mb-3">
            Displayed to all players (registration screen + view screen) and to the champion.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={rewardInput}
              onChange={(e) => setRewardInput(e.target.value)}
              placeholder="e.g. ₦20,000"
              className="flex-1 bg-white/5 border border-white/10 focus:border-amber-500 rounded-xl px-3 py-2.5 text-white outline-none"
            />
            <button
              onClick={saveReward}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 rounded-xl text-white font-black text-sm disabled:opacity-50">
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
          {status.rewardAmount && (
            <p className="text-amber-300 text-xs mt-2">Currently broadcast: <span className="font-bold">{status.rewardAmount}</span></p>
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-bold flex items-center gap-2 mb-3">
            <HelpCircle className="w-4 h-4 text-indigo-400" /> Question bank
          </h3>
          <p className="text-gray-500 text-xs mb-3">
            Questions live in MongoDB. They are loaded into memory when the server starts.
            Seed via <code className="text-gray-400">npm run seed:questions ./questions.json</code> or insert directly with mongosh / Compass,
            then hit Reload to refresh the cache without restarting.
          </p>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-300">
                In memory: <span className={`font-bold ${status.questionBankSize > 0 ? 'text-green-400' : 'text-red-400'}`}>{status.questionBankSize}</span>
              </p>
              <p className="text-gray-500 text-xs">Used by every match — zero DB hits during gameplay.</p>
            </div>
            <button
              onClick={reloadQuestions}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-black text-sm disabled:opacity-50">
              <Database className="w-4 h-4" /> Reload from DB
            </button>
          </div>
        </div>
      </div>

      {/* Schedule form */}
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
          { icon: Users,  label: 'Registered Players', value: status.registeredCount, color: 'text-indigo-400' },
          { icon: Swords, label: 'Online now',         value: status.activeCount,     color: 'text-pink-400' },
          { icon: Clock,  label: 'Mode',               value: mode === 'live' ? 'LIVE' : mode === 'registration' ? 'Registering' : 'Idle',
            color: mode === 'live' ? 'text-green-400' : mode === 'registration' ? 'text-amber-400' : 'text-gray-400' },
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
          <span className="text-xs text-gray-500">{status.players.length} total</span>
        </div>
        <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
          {status.players.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-600 text-sm">
              {mode === 'normal'
                ? 'No tournament scheduled. Set a date above to open registration.'
                : 'No players yet. Share the link and wait for players to join!'}
            </div>
          ) : (
            status.players.map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-white/3">
                <div className="w-8 h-8 rounded-xl bg-linear-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white text-xs font-black shrink-0">
                  {p.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{p.username}</p>
                  <p className="text-gray-500 text-xs">
                    {p.isOnline ? '🟢 Online' : '⚫ Offline'} · {p.status || 'waiting'}
                  </p>
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
