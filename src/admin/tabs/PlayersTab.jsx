import { useAdmin } from '../AdminContext';
import { Search, UserX, RotateCcw, Flame } from 'lucide-react';
import { useState } from 'react';

export default function PlayersTab() {
  const { state, dispatch } = useAdmin();
  const { players } = state;
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(null); // { type: 'ban'|'reset', player }

  const filtered = players.filter(p =>
    !search || p.username.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirm = () => {
    if (confirm.type === 'ban')   dispatch({ type: 'BAN_PLAYER',         payload: confirm.player.id });
    if (confirm.type === 'reset') dispatch({ type: 'RESET_PLAYER_WINS',  payload: confirm.player.id });
    setConfirm(null);
  };

  return (
    <div className="space-y-5">
      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f0f20] border border-red-500/30 rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="text-4xl mb-3">{confirm.type === 'ban' ? '🚫' : '🔄'}</div>
            <h3 className="text-white font-bold text-lg mb-2">
              {confirm.type === 'ban' ? 'Remove Player?' : 'Reset Wins?'}
            </h3>
            <p className="text-gray-400 text-sm mb-5">
              Player: <span className="text-white font-bold">{confirm.player.username}</span>
              <br />
              {confirm.type === 'ban' ? 'This will remove them from the game.' : 'This will reset their wins to 0.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-medium hover:bg-white/10">Cancel</button>
              <button onClick={handleConfirm} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-white font-black text-xl">Players</h2>
          <p className="text-gray-500 text-sm">{players.filter(p => p.status === 'online').length} online · {players.length} total</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search players..."
            className="bg-white/5 border border-white/10 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2 text-white text-sm outline-none"
          />
        </div>
      </div>

      {/* Player cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-2 glass rounded-2xl p-10 text-center text-gray-600">No players found</div>
        )}
        {filtered.map(p => (
          <div key={p.id} className="glass rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white
                  ${p.stage === 'final' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-purple-600 to-blue-700'}`}>
                  {p.username[0].toUpperCase()}
                </div>
                <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a1a]
                  ${p.status === 'online' ? 'bg-green-400' : 'bg-gray-600'}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-black">{p.username}</p>
                  {p.stage === 'final' && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold">
                      <Flame className="w-3 h-3" />FINAL
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs font-mono mt-0.5">{p.id}</p>

                {/* Win progress */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className={`w-3 h-3 rounded-sm ${i < p.wins ? 'bg-amber-400' : 'bg-white/10'}`} />
                    ))}
                  </div>
                  <span className="text-gray-500 text-xs">{p.wins}/6 wins</span>
                </div>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-lg capitalize
                    ${p.status === 'online' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-500'}`}>
                    {p.status}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-lg
                    ${p.stage === 'final'   ? 'bg-amber-500/20 text-amber-400'
                    : p.stage === 'playing' ? 'bg-blue-500/20 text-blue-400'
                    : p.stage === 'lobby'   ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-gray-500/20 text-gray-500'}`}>
                    {p.stage}
                  </span>
                  {p.matchId && (
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-white/5 text-gray-400 font-mono">
                      {p.matchId}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => setConfirm({ type: 'reset', player: p })}
                  className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                  title="Reset wins">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirm({ type: 'ban', player: p })}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                  title="Remove player">
                  <UserX className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
