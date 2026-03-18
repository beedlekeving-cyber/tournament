import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../AdminContext';
import { Plus, Pencil, Trash2, X, CheckCircle, FlaskConical, ToggleLeft, ToggleRight, AlertTriangle, Clock, Play, Square, Loader, Users, Rocket, RotateCcw } from 'lucide-react';
import babaapete from '../../assets/babaapete.jpeg';

const SOCKET_URL = 'http://localhost:4000';

const CORRECT_OPTIONS = ['A', 'B', 'C', 'D'];

export default function SpecialSessionTab() {
  const { state, dispatch } = useAdmin();
  const { specialSession, editingSpecialQuestion } = state;
  const [confirmClear, setConfirmClear] = useState(false);
  const [scheduleInput, setScheduleInput] = useState(
    specialSession.scheduledStart
      ? new Date(specialSession.scheduledStart).toISOString().slice(0, 16)
      : ''
  );

  const saveSchedule = () => {
    if (!scheduleInput) return;
    dispatch({ type: 'SET_SCHEDULE_START', payload: new Date(scheduleInput).toISOString() });
  };
  const clearSchedule = () => {
    setScheduleInput('');
    dispatch({ type: 'SET_SCHEDULE_START', payload: null });
  };

  const [demoCount, setDemoCount] = useState(10);
  const [demoActive, setDemoActive] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const startDemo = async () => {
    setDemoLoading(true);
    try {
      await fetch(`${SOCKET_URL}/admin/demo/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: demoCount }),
      });
      setDemoActive(true);
    } catch (e) { console.error(e); }
    setDemoLoading(false);
  };

  const stopDemo = async () => {
    setDemoLoading(true);
    try {
      await fetch(`${SOCKET_URL}/admin/demo/stop`, { method: 'POST' });
      setDemoActive(false);
    } catch (e) { console.error(e); }
    setDemoLoading(false);
  };

  // Tournament state
  const [tournamentPlayers, setTournamentPlayers] = useState([]);
  const [tournamentConfig, setTournamentConfig] = useState({ scheduledDate: null, tournamentStarted: false });
  const [tournamentLoading, setTournamentLoading] = useState(false);

  const fetchTournamentStatus = useCallback(async () => {
    try {
      const res = await fetch(`${SOCKET_URL}/admin/tournament/players`);
      if (!res.ok) return;
      const data = await res.json();
      setTournamentPlayers(data.players || []);
      setTournamentConfig(data.config || {});
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchTournamentStatus();
    const t = setInterval(fetchTournamentStatus, 3000);
    return () => clearInterval(t);
  }, [fetchTournamentStatus]);

  const scheduleTournament = async () => {
    if (!scheduleInput) return;
    setTournamentLoading(true);
    try {
      const scheduledDate = new Date(scheduleInput).toISOString();
      const res = await fetch(`${SOCKET_URL}/admin/tournament/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate }),
      });
      if (res.ok) {
        dispatch({ type: 'SET_SCHEDULE_START', payload: scheduledDate });
        await fetchTournamentStatus();
      }
    } catch (_) {}
    setTournamentLoading(false);
  };

  const startTournament = async () => {
    setTournamentLoading(true);
    try {
      const res = await fetch(`${SOCKET_URL}/admin/tournament/start`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        dispatch({ type: 'SHOW_TOAST', payload: { type: 'success', msg: `🚀 Tournament started! ${data.playerCount} players paired into ${data.matches?.length || 0} matches!` } });
      } else {
        dispatch({ type: 'SHOW_TOAST', payload: { type: 'error', msg: data.error || 'Failed to start' } });
      }
      await fetchTournamentStatus();
    } catch (_) {
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'error', msg: 'Could not reach server' } });
    }
    setTournamentLoading(false);
  };

  const resetTournament = async () => {
    setTournamentLoading(true);
    try {
      await fetch(`${SOCKET_URL}/admin/tournament/reset`, { method: 'POST' });
      setScheduleInput('');
      dispatch({ type: 'SET_SCHEDULE_START', payload: null });
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'success', msg: 'Tournament reset!' } });
      await fetchTournamentStatus();
    } catch (_) {}
    setTournamentLoading(false);
  };

  const openNew = () => dispatch({ type: 'OPEN_NEW_SPECIAL_QUESTION' });
  const openEdit = (q) => dispatch({ type: 'OPEN_EDIT_SPECIAL_QUESTION', payload: q });
  const closeModal = () => dispatch({ type: 'CLOSE_SPECIAL_MODAL' });
  const deleteQ = (id) => dispatch({ type: 'DELETE_SPECIAL_QUESTION', payload: id });
  const toggle = async () => {
    const newActive = !specialSession.active;
    dispatch({ type: 'TOGGLE_SPECIAL_SESSION' });
    // Sync to server
    try {
      await fetch(`${SOCKET_URL}/admin/special-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newActive }),
      });
    } catch (_) {}
  };

  const handleSave = () => {
    const q = editingSpecialQuestion;
    if (!q.question.trim()) return;
    if (!q.options.A.trim() || !q.options.B.trim() || !q.options.C.trim() || !q.options.D.trim()) return;
    dispatch({ type: 'SAVE_SPECIAL_QUESTION', payload: q });
  };

  const canActivate = specialSession.questions.length > 0;

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <img
            src={babaapete}
            alt="Special Session"
            className="w-20 h-20 rounded-3xl object-cover shadow-xl border-2 border-pink-500/40 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-white">Special Session</h1>
              {specialSession.active && (
                <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-pink-500/20 border border-pink-500/40 text-pink-300 animate-pulse">
                  🎯 ACTIVE
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm">
              Create a custom question set that <span className="text-white font-semibold">replaces all 130 standard questions</span> when activated.
              Players will only see these questions.
            </p>
          </div>
        </div>
      </div>

      {/* Status card */}
      <div className={`rounded-2xl p-5 mb-6 border flex items-center justify-between gap-4 transition-all
        ${specialSession.active
          ? 'bg-pink-500/10 border-pink-500/30'
          : 'bg-white/3 border-white/10'}`}>
        <div>
          <p className="text-white font-bold mb-0.5">
            {specialSession.active ? '🎯 Special Session is LIVE' : '⏸ Special Session is Off'}
          </p>
          <p className="text-gray-400 text-xs">
            {specialSession.active
              ? `Players are receiving only your ${specialSession.questions.length} custom question(s).`
              : canActivate
              ? `${specialSession.questions.length} question(s) ready. Toggle on to activate.`
              : 'Add at least 1 question before activating.'}
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={!canActivate && !specialSession.active}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm transition-all hover:scale-105 active:scale-95 shrink-0
            ${specialSession.active
              ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-lg'
              : canActivate
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-white/5 text-gray-600 cursor-not-allowed'}`}>
          {specialSession.active
            ? <><ToggleRight className="w-4 h-4" /> Deactivate</>
            : <><ToggleLeft className="w-4 h-4" /> Activate</>}
        </button>
      </div>

      {/* Warning when active */}
      {specialSession.active && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-6">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-amber-300 text-sm">
            <span className="font-bold">Special session is active.</span> All players currently in matches are using these questions.
            The standard 130-question bank is fully bypassed until you deactivate.
          </p>
        </div>
      )}

      {/* Tournament Controls */}
      <div className="rounded-2xl p-5 mb-6 border bg-white/3 border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="w-4 h-4 text-indigo-400" />
          <h3 className="text-white font-bold text-sm">Tournament Control</h3>
          {tournamentConfig.scheduledDate && !tournamentConfig.tournamentStarted && (
            <span className="text-xs px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold">
              REGISTRATION OPEN
            </span>
          )}
          {tournamentConfig.tournamentStarted && (
            <span className="text-xs px-2 py-0.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 font-semibold animate-pulse">
              🔴 LIVE
            </span>
          )}
        </div>

        {/* Players count */}
        {tournamentConfig.scheduledDate && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Users className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-white font-bold text-sm">{tournamentPlayers.length} player{tournamentPlayers.length !== 1 ? 's' : ''} registered</p>
              <p className="text-gray-400 text-xs">{tournamentPlayers.map(p => p.username).join(', ') || 'No one yet'}</p>
            </div>
          </div>
        )}

        {tournamentConfig.scheduledDate ? (
          <div>
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <div>
                <p className="text-indigo-300 font-black text-base">
                  📅 {new Date(tournamentConfig.scheduledDate).toLocaleString('en-US', {
                    weekday: 'short', year: 'numeric', month: 'short',
                    day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {tournamentConfig.tournamentStarted
                    ? 'Tournament is LIVE — players are matched and playing!'
                    : 'Players can join now. Tournament will auto-start at this time.'}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              {!tournamentConfig.tournamentStarted && (
                <button
                  onClick={startTournament}
                  disabled={tournamentLoading || tournamentPlayers.length < 2}
                  className="flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-white font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                  {tournamentLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Start Now ({tournamentPlayers.length} players)
                </button>
              )}
              <button
                onClick={resetTournament}
                disabled={tournamentLoading}
                className="flex items-center gap-2 px-4 py-3 bg-red-600/80 hover:bg-red-500 rounded-xl text-white font-bold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                <RotateCcw className="w-4 h-4" /> Reset Tournament
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-gray-500 text-xs mb-3">
              Set a date &amp; time — players can join immediately. Tournament will auto-start at this time, or you can start manually.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="datetime-local"
                value={scheduleInput}
                onChange={e => setScheduleInput(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/60 scheme-dark"
              />
              <button
                onClick={scheduleTournament}
                disabled={!scheduleInput || tournamentLoading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shrink-0">
                {tournamentLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4 inline mr-1" />}
                Schedule & Open Registration
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Demo Players ── */}
      <div className="rounded-2xl p-5 mb-6 border bg-white/3 border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Play className="w-4 h-4 text-emerald-400" />
          <h3 className="text-white font-bold text-sm">Demo Mode</h3>
          {demoActive && (
            <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold animate-pulse">
              LIVE
            </span>
          )}
        </div>
        <p className="text-gray-500 text-xs mb-4">
          Inject fake players into the <span className="text-white font-semibold">View Screen</span> to preview how it looks.
          Demo players are not real — they won’t affect the actual game.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-gray-400 text-xs">Players:</label>
            <input
              type="number"
              min={2} max={20}
              value={demoCount}
              onChange={e => setDemoCount(Math.min(20, Math.max(2, parseInt(e.target.value) || 2)))}
              disabled={demoActive}
              className="w-16 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm text-center focus:outline-none focus:border-emerald-500/60 disabled:opacity-40"
            />
          </div>
          {!demoActive ? (
            <button
              onClick={startDemo}
              disabled={demoLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition-all hover:scale-105 active:scale-95">
              {demoLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Start Demo
            </button>
          ) : (
            <button
              onClick={stopDemo}
              disabled={demoLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-sm transition-all hover:scale-105 active:scale-95">
              {demoLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
              Stop Demo
            </button>
          )}
          {demoActive && (
            <p className="text-emerald-400 text-xs">
              ✓ {demoCount} demo players active — open View Screen to preview
            </p>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold">
          Questions <span className="text-gray-500 font-normal text-sm ml-1">({specialSession.questions.length})</span>
        </h2>
        <div className="flex gap-2">
          {specialSession.questions.length > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 border border-red-500/20 text-xs font-semibold transition-all">
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          )}
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-xl text-white font-bold text-sm transition-all hover:scale-105 active:scale-95">
            <Plus className="w-4 h-4" /> Add Question
          </button>
        </div>
      </div>

      {/* Confirm clear */}
      {confirmClear && (
        <div className="mb-5 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-4">
          <p className="text-red-300 text-sm font-semibold">Clear all {specialSession.questions.length} special questions?</p>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setConfirmClear(false)} className="px-3 py-1.5 rounded-xl bg-white/10 text-gray-300 text-xs font-bold hover:bg-white/15">Cancel</button>
            <button onClick={() => { dispatch({ type: 'CLEAR_SPECIAL_SESSION' }); setConfirmClear(false); }}
              className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500">Clear All</button>
          </div>
        </div>
      )}

      {/* Question list */}
      {specialSession.questions.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center border border-dashed border-white/10">
          <FlaskConical className="w-10 h-10 mx-auto text-gray-700 mb-3" />
          <p className="text-gray-500 font-semibold">No special questions yet</p>
          <p className="text-gray-700 text-xs mt-1 mb-4">Add questions to create your custom session</p>
          <button onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-xl text-white font-bold text-sm transition-all">
            <Plus className="w-4 h-4" /> Add First Question
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {specialSession.questions.map((q, idx) => (
            <div key={q.id} className="glass rounded-2xl p-5 border border-white/5 hover:border-pink-500/20 transition-all group">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-xl bg-pink-500/20 text-pink-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm mb-3 leading-relaxed">{q.question}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CORRECT_OPTIONS.map(opt => (
                      <div key={opt}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition-all
                          ${q.correct === opt
                            ? 'bg-green-500/15 border-green-500/40 text-green-300'
                            : 'bg-white/3 border-white/8 text-gray-400'}`}>
                        <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-black text-xs shrink-0
                          ${q.correct === opt ? 'bg-green-500 text-black' : 'bg-white/10 text-gray-500'}`}>
                          {opt}
                        </span>
                        <span className="truncate">{q.options[opt]}</span>
                        {q.correct === opt && <CheckCircle className="w-3.5 h-3.5 ml-auto shrink-0 text-green-400" />}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => openEdit(q)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteQ(q.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {editingSpecialQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f0f20] border border-pink-500/30 rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-pink-400" />
                <h2 className="text-white font-black text-lg">
                  {state.isNewSpecialQuestion ? 'Add Special Question' : 'Edit Question'}
                </h2>
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-white text-2xl leading-none transition-colors">×</button>
            </div>

            {/* Question text */}
            <div className="mb-4">
              <label className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2 block">Question</label>
              <textarea
                rows={3}
                value={editingSpecialQuestion.question}
                onChange={e => dispatch({ type: 'UPDATE_EDITING_SPECIAL_QUESTION', payload: { question: e.target.value } })}
                placeholder="Type your question here..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-pink-500 focus:shadow-[0_0_15px_rgba(236,72,153,0.2)] transition-all resize-none placeholder-gray-600"
              />
            </div>

            {/* Options */}
            <div className="mb-5">
              <label className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2 block">Answer Options</label>
              <div className="space-y-2">
                {CORRECT_OPTIONS.map(opt => (
                  <div key={opt} className="flex items-center gap-3">
                    <button
                      onClick={() => dispatch({ type: 'UPDATE_EDITING_SPECIAL_QUESTION', payload: { correct: opt } })}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-all
                        ${editingSpecialQuestion.correct === opt
                          ? 'bg-green-500 text-black scale-110 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                          : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}>
                      {opt}
                    </button>
                    <input
                      type="text"
                      value={editingSpecialQuestion.options[opt]}
                      onChange={e => dispatch({ type: 'UPDATE_EDITING_SPECIAL_OPTION', payload: { key: opt, value: e.target.value } })}
                      placeholder={`Option ${opt}`}
                      className={`flex-1 bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm outline-none transition-all placeholder-gray-600
                        ${editingSpecialQuestion.correct === opt
                          ? 'border-green-500/50 focus:border-green-400'
                          : 'border-white/10 focus:border-pink-500'}`}
                    />
                    {editingSpecialQuestion.correct === opt && (
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-gray-600 text-xs mt-2">Click a letter button (A/B/C/D) to mark it as the correct answer</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={closeModal}
                className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-300 font-semibold hover:bg-white/10 transition-all">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!editingSpecialQuestion.question.trim() || !editingSpecialQuestion.options.A.trim() || !editingSpecialQuestion.options.B.trim() || !editingSpecialQuestion.options.C.trim() || !editingSpecialQuestion.options.D.trim()}
                className="flex-1 py-3 rounded-2xl bg-pink-600 hover:bg-pink-500 text-white font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95">
                {state.isNewSpecialQuestion ? '+ Add Question' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
