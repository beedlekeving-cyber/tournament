import { useState } from 'react';
import { useAdmin } from '../AdminContext';
import { Trophy, Copy, CheckCheck, Phone, Calendar, Filter } from 'lucide-react';

const STATUS_COLORS = {
  pending:  'bg-amber-500/20 border-amber-500/40 text-amber-400',
  paid:     'bg-green-500/20 border-green-500/40 text-green-400',
  rejected: 'bg-red-500/20 border-red-500/40 text-red-400',
};

const PRIZE_COLORS = {
  '₦20,000': 'text-amber-400',
  '₦10,000': 'text-yellow-300',
  '₦5,000':  'text-green-400',
  '₦3,000':  'text-blue-400',
  '₦2,000':  'text-purple-400',
};

function formatClaimDate(dateStr) {
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
  const { winners } = state;
  const [filter, setFilter] = useState('all');
  const [copied, setCopied] = useState(null);

  const filtered = filter === 'all' ? winners : winners.filter(w => w.status === filter);

  const copyId = (id) => {
    navigator.clipboard.writeText(id).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const updateStatus = (id, status) => {
    dispatch({ type: 'UPDATE_WINNER_STATUS', payload: { id, status } });
  };

  const totalPending = winners.filter(w => w.status === 'pending').length;
  const totalPaid    = winners.filter(w => w.status === 'paid').length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Claims',    value: winners.length,  color: 'from-blue-600 to-blue-700' },
          { label: 'Pending Payment', value: totalPending,    color: 'from-amber-500 to-amber-600' },
          { label: 'Prizes Paid',     value: totalPaid,       color: 'from-green-600 to-green-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-2xl p-4 text-center border border-white/5">
            <div className={`text-3xl font-black bg-linear-to-r ${color} bg-clip-text text-transparent`}>{value}</div>
            <div className="text-gray-400 text-sm mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-500" />
        {['all', 'pending', 'paid', 'rejected'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium capitalize transition-all
              ${filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-white/5 text-gray-400 hover:text-white'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Winners list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center text-gray-600">No claims found</div>
        )}
        {filtered.map(w => (
          <div key={w.id} className="glass rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Avatar + name */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xl font-black text-white shrink-0"
                  style={{ boxShadow: '0 0 15px rgba(245,158,11,0.4)' }}>
                  {w.username[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-black text-base truncate">{w.username}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-gray-400 text-xs flex items-center gap-1">
                      <Trophy className="w-3 h-3" />{w.wins} wins
                    </span>
                    <span className="text-gray-400 text-xs">
                      Final: <span className="text-white font-bold">{w.finalScore}/10</span>
                    </span>
                    <span className="text-gray-400 text-xs flex items-center gap-1">
                      <Phone className="w-3 h-3" />{w.phone}
                    </span>
                    <span className="text-gray-400 text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{formatClaimDate(w.date)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Prize + claim ID */}
              <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                <span className={`text-xl font-black ${PRIZE_COLORS[w.prize] || 'text-white'}`}>
                  {w.prize}
                </span>

                {/* Claim ID with copy */}
                <button
                  onClick={() => copyId(w.claimId)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <span className="font-mono text-xs text-gray-400 group-hover:text-white">{w.claimId}</span>
                  {copied === w.claimId
                    ? <CheckCheck className="w-3.5 h-3.5 text-green-400" />
                    : <Copy className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
                  }
                </button>

                {/* Status badge + actions */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-3 py-1 rounded-lg border font-medium ${STATUS_COLORS[w.status]}`}>
                    {w.status.toUpperCase()}
                  </span>
                  {w.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateStatus(w.id, 'paid')}
                        className="text-xs px-3 py-1 rounded-lg bg-green-600/20 border border-green-600/40 text-green-400 hover:bg-green-600/30 transition-colors font-medium">
                        ✓ Mark Paid
                      </button>
                      <button
                        onClick={() => updateStatus(w.id, 'rejected')}
                        className="text-xs px-3 py-1 rounded-lg bg-red-600/20 border border-red-600/40 text-red-400 hover:bg-red-600/30 transition-colors font-medium">
                        ✗ Reject
                      </button>
                    </>
                  )}
                  {w.status === 'rejected' && (
                    <button
                      onClick={() => updateStatus(w.id, 'pending')}
                      className="text-xs px-3 py-1 rounded-lg bg-amber-600/20 border border-amber-600/40 text-amber-400 hover:bg-amber-600/30 transition-colors font-medium">
                      ↩ Restore
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
