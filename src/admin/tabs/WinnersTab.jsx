import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '../AdminContext';
import { Trophy, Copy, CheckCheck, Calendar, Filter, RefreshCw, CheckCircle2 } from 'lucide-react';
import { fetchWinnerSubmissions, markWinnerPaid, getAdminToken, BASE_URL } from '../../utils/api';
import { io } from 'socket.io-client';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ${diffMins % 60}m ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function WinnersTab() {
  const { state, dispatch } = useAdmin();
  const submissions = state.winnerSubmissions || [];
  const [filter, setFilter] = useState('all');
  const [copied, setCopied] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adminSocket, setAdminSocket] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWinnerSubmissions();
      dispatch({ type: 'SET_WINNER_SUBMISSIONS', payload: data.submissions || [] });
    } catch (e) {
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'error', msg: e.message } });
    }
    setLoading(false);
  }, [dispatch]);

  // Initial load
  useEffect(() => { reload(); }, [reload]);

  // Live socket → push new submissions instantly
  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    const sock = io(BASE_URL, { transports: ['websocket'], autoConnect: true });
    setAdminSocket(sock);
    sock.on('connect', () => sock.emit('admin_join', { token }));
    sock.on('winner_submission', ({ submission }) => {
      if (submission) dispatch({ type: 'ADD_WINNER_SUBMISSION', payload: submission });
    });
    sock.on('winner_submission_updated', ({ id, paid }) => {
      dispatch({ type: 'UPDATE_WINNER_SUBMISSION', payload: { id, paid } });
    });
    return () => sock.disconnect();
  }, [dispatch]);

  const filtered = filter === 'all'
    ? submissions
    : filter === 'pending'
      ? submissions.filter(s => !s.paid)
      : submissions.filter(s => s.paid);

  const copy = (val) => {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopied(val);
    setTimeout(() => setCopied(null), 2000);
  };

  const markPaid = async (id) => {
    try {
      await markWinnerPaid(id);
      dispatch({ type: 'UPDATE_WINNER_SUBMISSION', payload: { id, paid: true } });
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'success', msg: 'Marked as paid.' } });
    } catch (e) {
      dispatch({ type: 'SHOW_TOAST', payload: { type: 'error', msg: e.message } });
    }
  };

  const pending = submissions.filter(s => !s.paid).length;
  const paid    = submissions.filter(s =>  s.paid).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-black text-xl">Tournament Winners</h2>
          <p className="text-gray-500 text-sm">Account details submitted by champions for reward payout.</p>
        </div>
        <button onClick={reload} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold text-sm disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Submissions', value: submissions.length, color: 'from-blue-600 to-blue-700' },
          { label: 'Pending Payment',   value: pending,            color: 'from-amber-500 to-amber-600' },
          { label: 'Paid',              value: paid,               color: 'from-green-600 to-green-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-2xl p-4 text-center border border-white/5">
            <div className={`text-3xl font-black bg-linear-to-r ${color} bg-clip-text text-transparent`}>{value}</div>
            <div className="text-gray-400 text-sm mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-500" />
        {['all', 'pending', 'paid'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium capitalize transition-all
              ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
            {f}
          </button>
        ))}
        {adminSocket && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400">
            ● Live
          </span>
        )}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center text-gray-600">No submissions yet</div>
        )}
        {filtered.map(s => (
          <div key={s._id} className="glass rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xl font-black text-white shrink-0"
                  style={{ boxShadow: '0 0 15px rgba(245,158,11,0.4)' }}>
                  {(s.username?.[0] || '?').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-black text-base truncate flex items-center gap-2">
                    {s.username}
                    <Trophy className="w-4 h-4 text-amber-400" />
                  </p>
                  <p className="text-amber-300 text-sm font-bold">{s.rewardAmount || '—'}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
                    <div>
                      <span className="text-gray-500 text-xs">Account: </span>
                      <button onClick={() => copy(s.accountNumber)}
                        className="text-white font-mono font-bold text-sm hover:text-amber-300 inline-flex items-center gap-1">
                        {s.accountNumber}
                        {copied === s.accountNumber
                          ? <CheckCheck className="w-3.5 h-3.5 text-green-400" />
                          : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                      </button>
                    </div>
                    {s.accountName && (
                      <div>
                        <span className="text-gray-500 text-xs">Name: </span>
                        <span className="text-white font-bold text-sm">{s.accountName}</span>
                      </div>
                    )}
                    {s.bankName && (
                      <div>
                        <span className="text-gray-500 text-xs">Bank: </span>
                        <span className="text-white font-bold text-sm">{s.bankName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                      <Calendar className="w-3 h-3" />{formatDate(s.createdAt)}
                    </div>
                  </div>
                  {s.message && (
                    <p className="text-gray-300 text-sm mt-2 italic">"{s.message}"</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {s.paid ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> PAID
                  </span>
                ) : (
                  <button onClick={() => markPaid(s._id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-600/40 text-green-400 hover:bg-green-600/30 font-bold">
                    ✓ Mark Paid
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
