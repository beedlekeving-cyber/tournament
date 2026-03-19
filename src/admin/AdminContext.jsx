import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { QUESTIONS_DB } from '../data/questions';
import { adminLogin, saveAdminToken, clearAdminToken } from '../utils/api';

const AdminContext = createContext(null);

// ─── Mock persistent storage via localStorage ─────────────────────────────────
const STORAGE_KEY = 'quizduel_admin';
const DATA_VERSION = 4; // bumped: reload full 130-question bank

function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Discard data saved by older versions (contained mock test users)
      if (parsed._version !== DATA_VERSION) {
        localStorage.removeItem(STORAGE_KEY);
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
      questions: state.questions,
      winners: state.winners,
      players: state.players,
      settings: state.settings,
      specialSession: state.specialSession,
    }));
  } catch (_) {}

  // Mirror special session to a standalone key so GameContext can read it
  try {
    localStorage.setItem('qd_special_session', JSON.stringify(state.specialSession));
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

    // Questions
    questions: saved?.questions ?? QUESTIONS_DB,
    questionFilter: '',
    questionCategoryFilter: 'All',

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

    // Question editor modal
    editingQuestion: null,   // null | question object
    isNewQuestion: false,

    // Special Session
    specialSession: saved?.specialSession ?? {
      active: false,           // when true, game uses ONLY these questions
      questions: [],           // array of custom question objects
      scheduledStart: null,    // ISO string — null = no schedule
    },
    editingSpecialQuestion: null,  // null | question object being edited
    isNewSpecialQuestion: false,

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

    // Questions
    case 'SET_Q_FILTER':
      return { ...state, questionFilter: action.payload };
    case 'SET_Q_CAT_FILTER':
      return { ...state, questionCategoryFilter: action.payload };
    case 'OPEN_NEW_QUESTION':
      return {
        ...state,
        isNewQuestion: true,
        editingQuestion: { id: '', question: '', options: { A: '', B: '', C: '', D: '' }, correct: 'A', category: 'General' },
      };
    case 'OPEN_EDIT_QUESTION':
      return { ...state, isNewQuestion: false, editingQuestion: { ...action.payload } };
    case 'CLOSE_QUESTION_MODAL':
      return { ...state, editingQuestion: null };
    case 'UPDATE_EDITING_QUESTION':
      return { ...state, editingQuestion: { ...state.editingQuestion, ...action.payload } };
    case 'UPDATE_EDITING_OPTION':
      return {
        ...state,
        editingQuestion: {
          ...state.editingQuestion,
          options: { ...state.editingQuestion.options, [action.payload.key]: action.payload.value },
        },
      };
    case 'SAVE_QUESTION': {
      const q = action.payload;
      const exists = state.questions.find(x => x.id === q.id);
      const updated = exists
        ? state.questions.map(x => x.id === q.id ? q : x)
        : [...state.questions, q];
      return { ...state, questions: updated, editingQuestion: null, toast: { type: 'success', msg: exists ? 'Question updated!' : 'Question added!' } };
    }
    case 'DELETE_QUESTION':
      return {
        ...state,
        questions: state.questions.filter(q => q.id !== action.payload),
        toast: { type: 'success', msg: 'Question deleted.' },
      };

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

    // Special Session
    case 'TOGGLE_SPECIAL_SESSION':
      return {
        ...state,
        specialSession: { ...state.specialSession, active: !state.specialSession.active },
        toast: { type: 'success', msg: !state.specialSession.active ? '🎯 Special Session ACTIVATED' : '⏹️ Special Session deactivated' },
      };
    case 'OPEN_NEW_SPECIAL_QUESTION':
      return {
        ...state,
        isNewSpecialQuestion: true,
        editingSpecialQuestion: { id: 'sq_' + Date.now(), question: '', options: { A: '', B: '', C: '', D: '' }, correct: 'A' },
      };
    case 'OPEN_EDIT_SPECIAL_QUESTION':
      return { ...state, isNewSpecialQuestion: false, editingSpecialQuestion: { ...action.payload } };
    case 'CLOSE_SPECIAL_MODAL':
      return { ...state, editingSpecialQuestion: null };
    case 'UPDATE_EDITING_SPECIAL_QUESTION':
      return { ...state, editingSpecialQuestion: { ...state.editingSpecialQuestion, ...action.payload } };
    case 'UPDATE_EDITING_SPECIAL_OPTION':
      return {
        ...state,
        editingSpecialQuestion: {
          ...state.editingSpecialQuestion,
          options: { ...state.editingSpecialQuestion.options, [action.payload.key]: action.payload.value },
        },
      };
    case 'SAVE_SPECIAL_QUESTION': {
      const sq = action.payload;
      const exists = state.specialSession.questions.find(x => x.id === sq.id);
      const updated = exists
        ? state.specialSession.questions.map(x => x.id === sq.id ? sq : x)
        : [...state.specialSession.questions, sq];
      return {
        ...state,
        specialSession: { ...state.specialSession, questions: updated },
        editingSpecialQuestion: null,
        toast: { type: 'success', msg: exists ? 'Question updated!' : 'Question added to special session!' },
      };
    }
    case 'DELETE_SPECIAL_QUESTION':
      return {
        ...state,
        specialSession: {
          ...state.specialSession,
          questions: state.specialSession.questions.filter(q => q.id !== action.payload),
        },
        toast: { type: 'success', msg: 'Question removed from special session.' },
      };
    case 'SET_SCHEDULE_START':
      return {
        ...state,
        specialSession: { ...state.specialSession, scheduledStart: action.payload },
        toast: { type: 'success', msg: action.payload ? `⏰ Scheduled for ${new Date(action.payload).toLocaleString()}` : 'Schedule cleared.' },
      };
    case 'CLEAR_SPECIAL_SESSION':
      return {
        ...state,
        specialSession: { active: false, questions: [], scheduledStart: null },
        toast: { type: 'success', msg: 'Special session cleared.' },
      };

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
  }, [state.questions, state.winners, state.players, state.settings, state.specialSession, state.isAuthenticated]);

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
