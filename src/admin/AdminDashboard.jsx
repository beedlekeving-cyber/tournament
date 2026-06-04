import { useAdmin } from './AdminContext';
import DashboardTab from './tabs/DashboardTab';
import WinnersTab from './tabs/WinnersTab';
import PlayersTab from './tabs/PlayersTab';
import SettingsTab from './tabs/SettingsTab';
import TournamentTab from './tabs/TournamentTab';
import ViewScreen from '../screens/ViewScreen';

// Wrapper so the view screen fills the admin tab area
function ViewScreenTab() {
  return (
    <div className="-m-5 overflow-hidden rounded-2xl" style={{ minHeight: '620px' }}>
      <ViewScreen embedded={true} />
    </div>
  );
}

import {
  LayoutDashboard, Trophy, Users, Settings,
  LogOut, Zap, X, CheckCircle, AlertCircle, Swords, Monitor,
} from 'lucide-react';

const TABS = [
  { id: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { id: 'tournament', label: 'Tournament', icon: Swords           },
  { id: 'winners',    label: 'Winners',    icon: Trophy           },
  { id: 'players',    label: 'Players',    icon: Users            },
  { id: 'settings',   label: 'Settings',   icon: Settings         },
  { id: 'viewscreen', label: 'View Screen', icon: Monitor         },
];

const TAB_COMPONENTS = {
  dashboard:  DashboardTab,
  tournament: TournamentTab,
  winners:    WinnersTab,
  players:    PlayersTab,
  settings:   SettingsTab,
  viewscreen: ViewScreenTab,
};

export default function AdminDashboard() {
  const { state, dispatch } = useAdmin();
  const { tab, toast } = state;

  const ActiveTab = TAB_COMPONENTS[tab] || DashboardTab;

  // ── Fullscreen View Screen ──────────────────────────────────────────────
  if (tab === 'viewscreen') {
    return (
      <div className="fixed inset-0 z-50">
        <ViewScreen embedded={false} />

        {/* Floating close button */}
        <button
          onClick={() => dispatch({ type: 'SET_TAB', payload: 'dashboard' })}
          title="Exit fullscreen"
          className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'rgba(0,0,0,0.65)',
            border: '1px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          }}>
          <X className="w-4 h-4" />
          <span>Exit</span>
        </button>

        {/* Toast (still visible in fullscreen) */}
        {toast && (
          <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl font-semibold text-sm
            ${toast.type === 'success'
              ? 'bg-green-950 border-green-500/40 text-green-300'
              : 'bg-red-950 border-red-500/40 text-red-300'}`}>
            {toast.type === 'success'
              ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
              : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {toast.msg}
            <button onClick={() => dispatch({ type: 'CLEAR_TOAST' })} className="ml-2 opacity-50 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }
  // ───────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#060610] flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-[#0a0a1a] border-r border-white/5 shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm leading-tight">QuizDuel</p>
              <p className="text-indigo-400 text-xs font-medium">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => dispatch({ type: 'SET_TAB', payload: id })}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${tab === id
                  ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 text-white border border-indigo-500/30'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'}`}>
              <Icon className={`w-4 h-4 ${tab === id ? 'text-indigo-400' : ''}`} />
              {label}
              {id === 'winners' && state.winners?.filter(w => w.status === 'pending').length > 0 && (
                <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-1.5 py-0.5 font-bold">
                  {state.winners.filter(w => w.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/5">
          <button
            onClick={() => dispatch({ type: 'LOGOUT' })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar */}
        <header className="bg-[#0a0a1a] border-b border-white/5 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile logo */}
            <div className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-white font-black text-sm">QuizDuel Admin</p>
            </div>
            <h1 className="hidden md:block text-white font-black text-lg capitalize">{tab}</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg font-bold">
              ADMIN
            </span>
            {/* Mobile logout */}
            <button
              onClick={() => dispatch({ type: 'LOGOUT' })}
              className="md:hidden p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile tab bar */}
        <div className="md:hidden flex border-b border-white/5 bg-[#0a0a1a] overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => dispatch({ type: 'SET_TAB', payload: id })}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-all
                ${tab === id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          <ActiveTab />
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl font-semibold text-sm
          ${toast.type === 'success'
            ? 'bg-green-950 border-green-500/40 text-green-300'
            : 'bg-red-950 border-red-500/40 text-red-300'}`}>
          {toast.type === 'success'
            ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
          {toast.msg}
          <button onClick={() => dispatch({ type: 'CLEAR_TOAST' })} className="ml-2 opacity-50 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
