import { useAdmin } from '../AdminContext';
import { useState } from 'react';
import { Save, Timer, Target, Power, Wrench } from 'lucide-react';

export default function SettingsTab() {
  const { state, dispatch } = useAdmin();
  const { settings } = state;
  const [form, setForm] = useState({ ...settings });

  const save = () => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: form });
    dispatch({ type: 'SHOW_TOAST', payload: { type: 'success', msg: 'Settings saved!' } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white font-black text-xl">Game Settings</h2>
        <p className="text-gray-500 text-sm">Configure timers and game availability</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5 border border-white/5 space-y-5">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-400" />Casual mode
          </h3>
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Question Timer (seconds)</label>
            <div className="flex items-center gap-3">
              <Timer className="w-5 h-5 text-purple-400" />
              <input
                type="number"
                min={5} max={60}
                value={form.questionTimer ?? 9}
                onChange={e => setForm(f => ({ ...f, questionTimer: +e.target.value }))}
                className="w-24 bg-white/5 border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2 text-white font-bold text-center outline-none"
              />
              <span className="text-gray-500 text-sm">Default: 9s</span>
            </div>
            <p className="text-gray-500 text-xs mt-2">
              Tournament timings (round length, between-rounds delay) are set on the server in <code className="text-gray-400">TOURNAMENT_PACING</code>.
            </p>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-white/5 space-y-5">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Power className="w-4 h-4 text-green-400" />Game Status
          </h3>
          <div className="flex items-center justify-between p-4 bg-white/3 rounded-xl border border-white/5">
            <div>
              <p className="text-white font-semibold">Game Active</p>
              <p className="text-gray-500 text-xs mt-0.5">Allow new players to join and play</p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, gameActive: !f.gameActive }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.gameActive ? 'bg-green-500' : 'bg-white/10'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.gameActive ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/3 rounded-xl border border-white/5">
            <div>
              <p className="text-white font-semibold flex items-center gap-2">
                <Wrench className="w-4 h-4 text-orange-400" />Maintenance Mode
              </p>
              <p className="text-gray-500 text-xs mt-0.5">Show maintenance notice to all players</p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, maintenanceMode: !f.maintenanceMode }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.maintenanceMode ? 'bg-orange-500' : 'bg-white/10'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.maintenanceMode ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className={`p-3 rounded-xl text-sm font-medium border
            ${form.maintenanceMode ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
            : form.gameActive ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {form.maintenanceMode ? '🔧 Maintenance mode is ON — players see a notice'
            : form.gameActive ? '✅ Game is LIVE — players can join and play'
            : '🔴 Game is OFFLINE — new joins are blocked'}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl transition-all">
          <Save className="w-4 h-4" />
          Save Settings
        </button>
      </div>
    </div>
  );
}
