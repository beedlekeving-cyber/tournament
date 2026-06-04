import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { adminLogin, saveAdminToken, clearAdminToken } from '../utils/api';

const AdminContext = createContext(null);

// ─── Persistent storage via localStorage ─────────────────────────────────────
const STORAGE_KEY = 'quizduel_admin';
const DATA_VERSION = 5; // bumped: dropped specialSession / Bible quiz

function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed._version !== DATA_VERSION) {
        localStorage.removeItem(STORAGE_KEY);
        // Also clean up any legacy keys
        localStorage.removeItem('qd_special_session');
        return null;
      }
      return parsed;
    }
  } catch (_) {}
  return null;
}

function saveStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      _version: DATA_VERSION,
      winners: state.winners,
      players: state.players,
      settings: state.settings,
    }));
  } catch (_) {}
}

// ─── Initial State ────────────────────────────────────────────────────────────
function buildInitialState() {
  const saved = loadStorage();
  return {
    // Auth
    isAuthenticated: false,
    authError: '',
    loginLoading: false,
    adminEmail: '',
    adminToken: null,

    // Active tab
    tab: 'dashboard',

    // Winners / Prize claims
    winners: saved?.winners ?? [],

    // Active players (live data populated as real users join)
    players: saved?.players ?? [],

    // Tournament control
    tournament: {
      status: 'waiting',   // 'waiting' | 'active' | 'finished'
      startTime: null,
      endTime: null,
      totalPlayers: 0,
      activePlayers: 0,
      matchesPlayed: 0,
    },

    // Game settings
    settings: saved?.settings ?? {
      questionTimer: 9,
      winsRequired: 6,
      finalQuestions: 10,
      prizes: [
        { correct: 1, reward: '₦2,000 recharge' },
        { correct: 2, reward: '₦3,000 recharge' },
        { correct: 3, reward: '₦5,000' },
        { correct: 4, reward: '₦10,000' },
        { correct: 6, reward: '₦20,000' },
      ],
      gameActive: true,
      maintenanceMode: false,
    },

    // Tournament reward (mirrored from server) + winner submissions
    tournamentRewardAmount: '',
    winnerSubmissions: [],

    // UI
    toast: null,
    confirmModal: null,
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function adminReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_LOADING':
      return { ...state, loginLoading: true, authError: '' };
    case 'LOGIN':
      return { ...state, isAuthenticated: true, authError: '', loginLoading: false, adminEmail: action.payload.email, adminToken: action.payload.token ?? null };
    case 'LOGIN_FAIL':
      return { ...state, authError: action.payload, loginLoading: false };
    case 'LOGOUT':
      return { ...buildInitialState(), isAuthenticated: false };

    case 'SET_TAB':
      return { ...state, tab: action.payload };

    // Winners
    case 'UPDATE_WINNER_STATUS': {
      const updated = state.winners.map(w =>
        w.id === action.payload.id ? { ...w, status: action.payload.status } : w
      );
      return { ...state, winners: updated, toast: { type: 'success', msg: `Status updated to ${action.payload.status}` } };
    }

    // Players
    case 'BAN_PLAYER': {
      const updated = state.players.filter(p => p.id !== action.payload);
      return { ...state, players: updated, toast: { type: 'success', msg: 'Player removed.' } };
    }
    case 'RESET_PLAYER_WINS': {
      const updated = state.players.map(p => p.id === action.payload ? { ...p, wins: 0, stage: 'join' } : p);
      return { ...state, players: updated, toast: { type: 'success', msg: 'Player wins reset.' } };
    }

    // Settings
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'UPDATE_PRIZE':
      return {
        ...state,
        settings: {
          ...state.settings,
          prizes: state.settings.prizes.map((p, i) =>
            i === action.payload.index ? { ...p, ...action.payload.data } : p
          ),
        },
      };
    case 'SAVE_SETTINGS':
      return { ...state, toast: { type: 'success', msg: 'Settings saved!' } };

    // Tournament control
    case 'START_TOURNAMENT':
      return {
        ...state,
        tournament: {
          ...state.tournament,
          status: 'active',
          startTime: Date.now(),
          endTime: null,
          totalPlayers: state.players.length,
          activePlayers: state.players.filter(p => p.status === 'online').length,
          matchesPlayed: state.tournament.matchesPlayed,
        },
        settings: { ...state.settings, gameActive: true },
        toast: { type: 'success', msg: '🚀 Tournament started!' },
      };
    case 'STOP_TOURNAMENT':
      return {
        ...state,
        tournament: {
          ...state.tournament,
          status: 'finished',
          endTime: Date.now(),
        },
        settings: { ...state.settings, gameActive: false },
        toast: { type: 'success', msg: '🏁 Tournament stopped.' },
      };
    case 'RESET_TOURNAMENT':
      // Free all eliminated devices and release username locks
      localStorage.removeItem('qd_eliminated');
      localStorage.removeItem('qd_usernames');
      return {
        ...state,
        tournament: { status: 'waiting', startTime: null, endTime: null, totalPlayers: 0, activePlayers: 0, matchesPlayed: 0 },
        settings: { ...state.settings, gameActive: false },
        toast: { type: 'success', msg: '♻️ Tournament reset — all players can now rejoin.' },
      };
    case 'INCREMENT_MATCHES':
      return {
        ...state,
        tournament: { ...state.tournament, matchesPlayed: state.tournament.matchesPlayed + 1 },
      };

    // Tournament reward (from server)
    case 'SET_TOURNAMENT_REWARD':
      return { ...state, tournamentRewardAmount: action.payload };

    // Winner submissions (live feed from server admin channel)
    case 'SET_WINNER_SUBMISSIONS':
      return { ...state, winnerSubmissions: Array.isArray(action.payload) ? action.payload : [] };
    case 'ADD_WINNER_SUBMISSION': {
      const sub = action.payload;
      const dedup = state.winnerSubmissions.filter(s => s._id !== sub._id);
      return {
        ...state,
        winnerSubmissions: [sub, ...dedup],
        toast: { type: 'success', msg: `🏆 ${sub.username} sent reward details!` },
      };
    }
    case 'UPDATE_WINNER_SUBMISSION': {
      const { id, paid } = action.payload;
      return {
        ...state,
        winnerSubmissions: state.winnerSubmissions.map(s => s._id === id ? { ...s, paid } : s),
      };
    }

    case 'SHOW_TOAST':
      return { ...state, toast: action.payload };
    case 'CLEAR_TOAST':
      return { ...state, toast: null };
    case 'SET_CONFIRM':
      return { ...state, confirmModal: action.payload };

    default:
      return state;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AdminProvider({ children }) {
  const [state, dispatch] = useReducer(adminReducer, buildInitialState());

  // Auto-save to localStorage
  useEffect(() => {
    if (state.isAuthenticated) saveStorage(state);
  }, [state.winners, state.players, state.settings, state.isAuthenticated]);

  // Auto-dismiss toast
  useEffect(() => {
    if (state.toast) {
      const t = setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 3000);
      return () => clearTimeout(t);
    }
  }, [state.toast]);

  const login = useCallback(async (email, password) => {
    dispatch({ type: 'LOGIN_LOADING' });
    try {
      const data = await adminLogin(email, password);
      saveAdminToken(data.token);
      dispatch({ type: 'LOGIN', payload: { email, token: data.token } });
    } catch (err) {
      dispatch({ type: 'LOGIN_FAIL', payload: err.message || 'Login failed. Try again.' });
    }
  }, []);

  const logout = useCallback(() => {
    clearAdminToken();
    dispatch({ type: 'LOGOUT' });
  }, []);

  return (
    <AdminContext.Provider value={{ state, dispatch, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider');
  return ctx;
}
