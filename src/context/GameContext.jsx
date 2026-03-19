import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { getRandomQuestions, getSeededQuestions } from '../data/questions';
import {
  getDeviceId, registerUsername, releaseUsername,
  setDeviceEliminated, clearElimination,
  addCoins, getCoins, getStreak, incrementStreak, resetStreak,
  validateAnswer,
} from '../utils/anticheat';
import socket from '../utils/socket';
import { getOrCreateSessionToken } from '../utils/security';
import { registerUser, fetchUsers, BASE_URL } from '../utils/api';

// ─── Question Source (normal or special session) ────────────────────────────
function pickQuestions(count, excludeIds, seed) {
  try {
    const ss = JSON.parse(localStorage.getItem('qd_special_session') || 'null');
    if (ss?.active && ss.questions.length > 0) {
      // Special session: always use the full pool (recycle if needed)
      // so the game never goes blank regardless of how many questions are in the set
      const pool = ss.questions.length >= count
        ? ss.questions  // enough questions — use all
        : [...ss.questions, ...ss.questions, ...ss.questions].slice(0, count * 3); // repeat pool to fill
      const h = String(seed || 'default');
      let s = 0x811c9dc5;
      for (let i = 0; i < h.length; i++) { s ^= h.charCodeAt(i); s = (s * 0x01000193) >>> 0; }
      let sv = s;
      const rng = () => { sv += 0x6d2b79f5; let t = Math.imul(sv ^ (sv >>> 15), 1 | sv); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const shuffled = [...pool].sort(() => rng() - 0.5);
      // deduplicate by id while preserving order
      const seen = new Set();
      const deduped = shuffled.filter(q => { if (seen.has(q.id)) return false; seen.add(q.id); return true; });
      // if still not enough after dedup, allow repeats
      const result = deduped.length >= count ? deduped.slice(0, count) : shuffled.slice(0, count);
      return result;
    }
  } catch (_) {}
  return seed ? getSeededQuestions(count, excludeIds, seed) : getRandomQuestions(count, excludeIds);
}

const GameContext = createContext(null);

// ─── State Shape ──────────────────────────────────────────────────────────────
const initialState = {
  // Player info
  playerId: null,
  deviceId: null,
  username: '',
  wins: 0,
  stage: 'join',          // join | lobby | match | result | final | leaderboard
  questionsSeen: [],

  // Anti-cheat / meta
  coins: 0,
  streak: 0,
  spectators: Math.floor(Math.random() * 300) + 50, // simulated live spectators
  totalMatchTime: 0,  // total seconds used across all 10 winning matches

  // Match info
  matchId: null,
  matchSeed: null,
  matchStartTime: null,
  opponent: null,
  isBot: false,
  currentQuestion: null,
  questionIndex: 0,
  matchQuestions: [],
  roundWins: 0,           // wins within one "best of 3" scenario
  myAnswer: null,
  opponentAnswer: null,
  opponentHasAnswered: false,
  myAnswerTime: null,
  matchResult: null,      // 'win' | 'lose' | 'draw'
  bothCorrectCount: 0,

  // Final stage
  finalQuestions: [],
  finalQuestionIndex: 0,
  finalAnswers: [],
  finalScore: 0,
  prizeWon: null,

  // Leaderboard
  leaderboard: [],

  // Tournament waiting
  waitingCount: 0,
  tournamentStarted: false,
  scheduledDate: null,

  // Special session (Bible quiz)
  specialSessionActive: false,

  // ── Tournament ──────────────────────────────────────────────────────────────
  tournament: {
    phase: 'idle',           // idle | countdown_warning | waiting_match | in_match | round_won | eliminated | champion
    countdownWarning: null,  // e.g. '5 minutes to go!'
    round: 1,
    matchId: null,           // current match ID (needed for submit_answer)
    bibleQuestions: [],      // full bank sent by server on tournament_started
    matchQuestions: [],      // questions for current match (from match_found)
    currentQuestionIndex: 0,
    opponent: null,          // { username, id }
    myAnswer: null,
    roundResult: null,       // { correct, correctAnswer, opponentAnswer, won }
    playerCount: 0,
    questionsPerMatch: 5,    // how many questions per match (from server)
    totalQuestions: 5,       // totalQuestions field from match_found
    bothCorrectFeedback: false, // true briefly when server says both correct
  },

  // UI
  loading: false,
  error: null,
  matchCountdown: 3,
};

// ─── Actions ──────────────────────────────────────────────────────────────────
const ACTIONS = {
  SET_USERNAME: 'SET_USERNAME',
  JOIN_LOBBY: 'JOIN_LOBBY',
  MATCH_FOUND: 'MATCH_FOUND',
  MATCH_COUNTDOWN_TICK: 'MATCH_COUNTDOWN_TICK',
  MATCH_START: 'MATCH_START',
  SUBMIT_ANSWER: 'SUBMIT_ANSWER',
  OPPONENT_ANSWERED: 'OPPONENT_ANSWERED',
  EVALUATE_ROUND: 'EVALUATE_ROUND',
  NEXT_QUESTION: 'NEXT_QUESTION',
  MATCH_OVER: 'MATCH_OVER',
  ENTER_FINAL: 'ENTER_FINAL',
  FINAL_ANSWER: 'FINAL_ANSWER',
  FINAL_OVER: 'FINAL_OVER',
  SET_LEADERBOARD: 'SET_LEADERBOARD',
  RESET_GAME: 'RESET_GAME',
  SET_STAGE: 'SET_STAGE',
  SET_LOADING: 'SET_LOADING',
  // Tournament
  TOURNAMENT_COUNTDOWN_WARNING: 'TOURNAMENT_COUNTDOWN_WARNING',
  TOURNAMENT_STARTED: 'TOURNAMENT_STARTED_ACTION',
  TOURNAMENT_MATCH_FOUND: 'TOURNAMENT_MATCH_FOUND',
  TOURNAMENT_SUBMIT_ANSWER: 'TOURNAMENT_SUBMIT_ANSWER',
  TOURNAMENT_ROUND_RESULT: 'TOURNAMENT_ROUND_RESULT',
  TOURNAMENT_ROUND_WON: 'TOURNAMENT_ROUND_WON',
  TOURNAMENT_ELIMINATED: 'TOURNAMENT_ELIMINATED',
  TOURNAMENT_NEXT_ROUND: 'TOURNAMENT_NEXT_ROUND',
  TOURNAMENT_CHAMPION: 'TOURNAMENT_CHAMPION',
  TOURNAMENT_NEXT_QUESTION: 'TOURNAMENT_NEXT_QUESTION',
};

function gameReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_USERNAME:
      return {
        ...state,
        username: action.payload,
        playerId: 'player_' + Date.now(),
      };

    case ACTIONS.JOIN_LOBBY:
      return { ...state, stage: 'lobby', loading: true };

    case ACTIONS.MATCH_FOUND:
      return {
        ...state,
        opponent: action.payload.opponent,
        matchId: action.payload.matchId,
        matchSeed: action.payload.matchSeed,
        isBot: action.payload.opponent?.id === 'bot',
        stage: 'countdown',
        matchCountdown: 3,
        loading: false,
      };

    case ACTIONS.MATCH_COUNTDOWN_TICK:
      return { ...state, matchCountdown: state.matchCountdown - 1 };

    case ACTIONS.MATCH_START: {
      const questions = pickQuestions(5, state.questionsSeen, state.matchSeed || state.matchId);
      const seenIds = questions.map(q => q.id);
      const matchStartTime = Date.now();
      return {
        ...state,
        stage: 'match',
        matchQuestions: questions,
        currentQuestion: questions[0],
        questionIndex: 0,
        matchStartTime,
        myAnswer: null,
        opponentAnswer: null,
        opponentHasAnswered: false,
        myAnswerTime: null,
        bothCorrectCount: 0,
        questionsSeen: [...state.questionsSeen, ...seenIds],
      };
    }

    case ACTIONS.SUBMIT_ANSWER:
      return {
        ...state,
        myAnswer: action.payload.answer,
        myAnswerTime: action.payload.time,
      };

    case 'OPPONENT_HAS_ANSWERED':
      return { ...state, opponentHasAnswered: true };

    case ACTIONS.OPPONENT_ANSWERED:
      return {
        ...state,
        opponentAnswer: action.payload.answer,
        opponentHasAnswered: true,
      };

    case ACTIONS.NEXT_QUESTION: {
      const nextIndex = state.questionIndex + 1;
      const nextQ = state.matchQuestions[nextIndex];
      // Guard: no more questions left — declare win
      if (nextQ === undefined || nextQ === null) {
        const newWins = state.wins + 1;
        const isChampion = newWins >= 10;
        return {
          ...state,
          stage: isChampion ? 'champion' : 'result',
          matchResult: 'win',
          wins: newWins,
          streak: state.streak + 1,
          coins: state.coins + 10,
          coinsEarned: 10,
          opponent: null,
          matchId: null,
          matchQuestions: [],
          questionIndex: 0,
          currentQuestion: null,
        };
      }
      return {
        ...state,
        questionIndex: nextIndex,
        currentQuestion: nextQ,
        myAnswer: null,
        opponentAnswer: null,
        opponentHasAnswered: false,
        myAnswerTime: null,
        bothCorrectCount: state.bothCorrectCount + 1,
      };
    }

    case ACTIONS.MATCH_OVER: {
      const result = action.payload.result;
      const won = result === 'win';
      const newStreak = won ? state.streak + 1 : 0;
      const coinsEarned = won ? (10 + newStreak * 5) : 0;
      const timeUsed = action.payload.timeUsed || 0; // seconds used this match
      const newWins = won ? state.wins + 1 : state.wins;
      const newTotalTime = won ? state.totalMatchTime + timeUsed : state.totalMatchTime;
      const isChampion = won && newWins >= 10;
      return {
        ...state,
        stage: isChampion ? 'champion' : 'result',
        matchResult: result,
        wins: newWins,
        totalMatchTime: newTotalTime,
        streak: newStreak,
        coins: state.coins + coinsEarned,
        coinsEarned,
        opponent: null,
        matchId: null,
        matchQuestions: [],
        questionIndex: 0,
        currentQuestion: null,
      };
    }

    case ACTIONS.ENTER_FINAL: {
      const finalQs = pickQuestions(10, state.questionsSeen);
      return {
        ...state,
        stage: 'final',
        finalQuestions: finalQs,
        finalQuestionIndex: 0,
        finalAnswers: [],
        finalScore: 0,
        prizeWon: null,
        questionsSeen: [...state.questionsSeen, ...finalQs.map(q => q.id)],
      };
    }

    case ACTIONS.FINAL_ANSWER: {
      const q = state.finalQuestions[state.finalQuestionIndex];
      if (!q) return state; // guard: no question available, do nothing
      const correct = action.payload.answer === q.correct;
      const newScore = correct ? state.finalScore + 1 : state.finalScore;
      const nextIndex = state.finalQuestionIndex + 1;
      const done = nextIndex >= state.finalQuestions.length;

      let prize = null;
      if (done) {
        if (newScore >= 6) prize = '₦20,000 GRAND WIN! 🏆';
        else if (newScore >= 4) prize = '₦10,000 💰';
        else if (newScore >= 3) prize = '₦5,000 💵';
        else if (newScore >= 2) prize = '₦3,000 recharge 📱';
        else if (newScore >= 1) prize = '₦2,000 recharge 📱';
        else prize = 'No reward — better luck next time!';
      }

      return {
        ...state,
        finalScore: newScore,
        finalAnswers: [...state.finalAnswers, { questionId: q.id, answer: action.payload.answer, correct }],
        finalQuestionIndex: done ? nextIndex : nextIndex,
        stage: done ? 'finalover' : 'final',
        prizeWon: prize,
      };
    }

    case ACTIONS.SET_LEADERBOARD:
      return { ...state, leaderboard: action.payload };

    case 'SET_DEVICE':
      return { ...state, deviceId: action.payload.deviceId, coins: action.payload.coins, streak: action.payload.streak };

    case ACTIONS.SET_STAGE:
      return { ...state, stage: action.payload };

    case ACTIONS.RESET_GAME: {
      // Release the username slot so others can use it
      releaseUsername(state.username);
      return {
        ...initialState,
        leaderboard: state.leaderboard,
        coins: getCoins(),   // reload from localStorage (source of truth)
        streak: getStreak(), // reload from localStorage
        deviceId: state.deviceId,
        spectators: state.spectators,
      };
    }

    case 'SET_SPECTATORS':
      return { ...state, spectators: action.payload };

    case 'TOURNAMENT_WAITING':
      return { ...state, stage: 'waiting', loading: false, waitingCount: action.payload.waitingCount || 0, scheduledDate: action.payload.scheduledDate || state.scheduledDate };

    case 'TOURNAMENT_STARTED':
      return { ...state, tournamentStarted: true };

    case 'WAITING_COUNT':
      return { ...state, waitingCount: action.payload };

    case 'SPECIAL_SESSION_UPDATED':
      return { ...state, specialSessionActive: action.payload.active };

    case ACTIONS.TOURNAMENT_COUNTDOWN_WARNING:
      return { ...state, tournament: { ...state.tournament, phase: 'countdown_warning', countdownWarning: action.payload.message } };

    case ACTIONS.TOURNAMENT_STARTED:
      return { ...state, tournamentStarted: true, tournament: { ...state.tournament, phase: 'waiting_match', bibleQuestions: action.payload.bibleQuestions || [], playerCount: action.payload.playerCount || 0, round: action.payload.round || 1, questionsPerMatch: action.payload.questionsPerMatch || 5, countdownWarning: null } };

    case ACTIONS.TOURNAMENT_MATCH_FOUND:
      return { ...state, tournament: { ...state.tournament, phase: 'in_match', matchId: action.payload.matchId, matchQuestions: action.payload.questions || [], currentQuestionIndex: 0, opponent: action.payload.opponent, myAnswer: null, roundResult: null, round: action.payload.round || state.tournament.round, totalQuestions: action.payload.totalQuestions || action.payload.questions?.length || state.tournament.questionsPerMatch, bothCorrectFeedback: false } };

    case ACTIONS.TOURNAMENT_SUBMIT_ANSWER:
      return { ...state, tournament: { ...state.tournament, myAnswer: action.payload.answer } };

    case ACTIONS.TOURNAMENT_ROUND_RESULT:
      return { ...state, tournament: { ...state.tournament, roundResult: action.payload, bothCorrectFeedback: false } };

    case ACTIONS.TOURNAMENT_ROUND_WON:
      return { ...state, tournament: { ...state.tournament, phase: 'round_won', round: action.payload.nextRound || state.tournament.round + 1 } };

    case ACTIONS.TOURNAMENT_ELIMINATED:
      return { ...state, tournament: { ...state.tournament, phase: 'eliminated' } };

    case ACTIONS.TOURNAMENT_NEXT_ROUND:
      return { ...state, tournament: { ...state.tournament, phase: 'waiting_match', currentQuestionIndex: 0, matchQuestions: [], opponent: null, myAnswer: null, roundResult: null, round: action.payload.round || state.tournament.round, questionsPerMatch: action.payload.questionsPerMatch || state.tournament.questionsPerMatch, bothCorrectFeedback: false } };

    case ACTIONS.TOURNAMENT_CHAMPION:
      return { ...state, tournament: { ...state.tournament, phase: 'champion' } };

    case ACTIONS.TOURNAMENT_NEXT_QUESTION: {
      const { questionIndex, question, totalQuestions } = action.payload;
      // Replace or append the server-provided question at the given index
      const updatedQuestions = [...state.tournament.matchQuestions];
      if (question) updatedQuestions[questionIndex] = question;
      return {
        ...state,
        tournament: {
          ...state.tournament,
          currentQuestionIndex: questionIndex,
          matchQuestions: updatedQuestions,
          myAnswer: null,
          roundResult: null,
          bothCorrectFeedback: true,
          // Update totalQuestions if server provides a revised count
          totalQuestions: totalQuestions || state.tournament.totalQuestions,
        },
      };
    }

    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    default:
      return state;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Track lobby timeout handle so we can cancel it on cleanup
  const lobbyTimeoutRef = useRef(null);

  // ── Socket.io event listeners (mount once) ────────────────────────────────
  useEffect(() => {
    // Connect socket immediately so we can receive reset events
    if (!socket.connected) socket.connect();

    const onMatchFound = ({ matchId, seed, opponent, questions }) => {
      // Store server-provided questions if any (special session)
      if (questions) {
        try { localStorage.setItem('qd_server_questions_' + matchId, JSON.stringify(questions)); } catch (_) {}
      }
      if (lobbyTimeoutRef.current) {
        clearTimeout(lobbyTimeoutRef.current);
        lobbyTimeoutRef.current = null;
      }
      dispatch({
        type: ACTIONS.MATCH_FOUND,
        payload: {
          opponent: { username: opponent.username, id: opponent.deviceId },
          matchId,
          matchSeed: seed,
        },
      });
      let count = 3;
      const tick = setInterval(() => {
        count--;
        dispatch({ type: ACTIONS.MATCH_COUNTDOWN_TICK });
        if (count <= 0) {
          clearInterval(tick);
          dispatch({ type: ACTIONS.MATCH_START });
        }
      }, 1000);
    };

    const onOpponentAnswered = () => {
      // Just signal that opponent has submitted — don't reveal their answer yet
      dispatch({ type: 'OPPONENT_HAS_ANSWERED' });
    };

    const onRoundResult = ({ correctAnswer, opponentAnswer }) => {
      // Server sends real opponent answer — store it so MatchScreen can evaluate
      dispatch({ type: ACTIONS.OPPONENT_ANSWERED, payload: { answer: opponentAnswer } });
    };

    const onRoundAnswers = ({ answers, deviceId }) => {
      // Client-side evaluation path: find opponent answer from the answers map
      if (!deviceId) return;
      const oppAnswer = Object.entries(answers).find(([id]) => id !== deviceId)?.[1];
      if (oppAnswer !== undefined) {
        dispatch({ type: ACTIONS.OPPONENT_ANSWERED, payload: { answer: oppAnswer } });
      }
    };

    socket.on('opponent_answered', onOpponentAnswered);
    socket.on('round_answers',     onRoundAnswers);

    // Security events from server
    const onSecurityViolation = ({ reason, count }) => {
      console.warn('[Security] Violation:', reason, 'count:', count);
    };
    const onSecurityBan = ({ reason }) => {
      alert('🔴 ' + reason);
    };
    const onDuplicateSession = ({ message }) => {
      alert('⚠️ ' + message);
    };
    const onRegistrationError = ({ error, code }) => {
      // SpecialScreen handles this with inline UI; log here as a fallback
      console.warn('[Registration] Error:', code, error);
    };
    const onMatchOverForfeit = ({ result }) => {
      dispatch({ type: ACTIONS.MATCH_OVER, payload: { result } });
    };

    // Tournament events
    const onTournamentWaiting = (data) => {
      // Cancel bot match fallback — we're in tournament registration mode
      if (lobbyTimeoutRef.current) {
        clearTimeout(lobbyTimeoutRef.current);
        lobbyTimeoutRef.current = null;
      }
      dispatch({ type: 'TOURNAMENT_WAITING', payload: data });
    };
    const onWaitingCount = ({ count }) => {
      dispatch({ type: 'WAITING_COUNT', payload: count });
    };
    const onTournamentReset = () => {
      dispatch({ type: ACTIONS.RESET_GAME });
    };
    const onForceReload = () => {
      // Full reset back to join screen
      dispatch({ type: ACTIONS.RESET_GAME });
    };

    socket.on('security_violation',          onSecurityViolation);
    socket.on('security_ban',                onSecurityBan);
    socket.on('security_duplicate_session',  onDuplicateSession);
    socket.on('registration_error',          onRegistrationError);
    socket.on('match_over_forfeit',          onMatchOverForfeit);
    const onSpecialSessionUpdated = (data) => {
      dispatch({ type: 'SPECIAL_SESSION_UPDATED', payload: data });
      // Store in localStorage so SpecialScreen can check it
      try {
        localStorage.setItem('qd_special_session', JSON.stringify(data));
      } catch (_) {}
    };

    // ── Tournament socket events ──────────────────────────────────────────────
    const onTournamentCountdown = ({ message, secondsRemaining, secondsLeft }) => {
      const secs = secondsRemaining ?? secondsLeft;
      dispatch({ type: ACTIONS.TOURNAMENT_COUNTDOWN_WARNING, payload: { message: message || `Tournament starts in ${secs}s!` } });
    };

    const onTournamentStartedFull = ({ bibleQuestions, playerCount, round, questionsPerMatch }) => {
      dispatch({ type: ACTIONS.TOURNAMENT_STARTED, payload: { bibleQuestions: bibleQuestions || [], playerCount: playerCount || 0, round: round || 1, questionsPerMatch: questionsPerMatch || 5 } });
      // Also mark global tournament started flag
      dispatch({ type: 'TOURNAMENT_STARTED' });
    };

    const onTournamentMatchFound = ({ matchId, questions, opponent, round, totalQuestions, isTournament }) => {
      if (!isTournament) return; // handled by the normal match_found listener above
      dispatch({ type: ACTIONS.TOURNAMENT_MATCH_FOUND, payload: { matchId, questions: questions || [], opponent: { username: opponent?.username, id: opponent?.id || opponent?.deviceId }, round: round || 1, totalQuestions: totalQuestions || questions?.length || 5 } });
    };

    const onTournamentRoundResult = ({ result, questionIndex, correctAnswer, myAnswer, opponentAnswer, matchOver }) => {
      dispatch({ type: ACTIONS.TOURNAMENT_ROUND_RESULT, payload: { result, questionIndex, correctAnswer, myAnswer, opponentAnswer, matchOver } });
    };

    const onTournamentRoundWon = ({ nextRound, round }) => {
      dispatch({ type: ACTIONS.TOURNAMENT_ROUND_WON, payload: { nextRound: nextRound || round } });
    };

    const onTournamentEliminated = () => {
      dispatch({ type: ACTIONS.TOURNAMENT_ELIMINATED });
    };

    const onTournamentNextRound = ({ round, questionsPerMatch }) => {
      dispatch({ type: ACTIONS.TOURNAMENT_NEXT_ROUND, payload: { round, questionsPerMatch } });
    };

    // next_question: server says both players answered correctly — move to next question.
    // Delay the dispatch by 1.5 s so TournamentMatch can show the answer reveal first.
    const onNextQuestion = ({ questionIndex, question, bothCorrectCount, message, totalQuestions }) => {
      setTimeout(() => {
        dispatch({ type: ACTIONS.TOURNAMENT_NEXT_QUESTION, payload: { questionIndex, question, bothCorrectCount, message, totalQuestions } });
      }, 1500);
    };

    const onTournamentChampion = () => {
      dispatch({ type: ACTIONS.TOURNAMENT_CHAMPION });
    };

    const onYouAreChampion = () => {
      dispatch({ type: ACTIONS.TOURNAMENT_CHAMPION });
    };

    socket.on('tournament_countdown',   onTournamentCountdown);
    socket.on('tournament_started',     onTournamentStartedFull);
    socket.on('match_found',            (data) => { if (data.isTournament) onTournamentMatchFound(data); else onMatchFound(data); });
    socket.on('round_result',           (data) => { if (data.isTournament) onTournamentRoundResult(data); else onRoundResult(data); });
    socket.on('tournament_round_won',   onTournamentRoundWon);
    socket.on('tournament_eliminated',  onTournamentEliminated);
    socket.on('tournament_next_round',  onTournamentNextRound);
    socket.on('tournament_champion',    onTournamentChampion);
    socket.on('you_are_champion',       onYouAreChampion);
    socket.on('next_question',          onNextQuestion);

    socket.on('tournament_waiting',          onTournamentWaiting);
    socket.on('waiting_count',              onWaitingCount);
    socket.on('tournament_reset',           onTournamentReset);
    socket.on('force_reload',               onForceReload);
    socket.on('special_session_updated',    onSpecialSessionUpdated);

    // Fetch initial special session state
    fetch(`${BASE_URL}/admin/special-session`)
      .then(res => res.json())
      .then(data => {
        dispatch({ type: 'SPECIAL_SESSION_UPDATED', payload: data });
        localStorage.setItem('qd_special_session', JSON.stringify(data));
      })
      .catch(() => {});

    return () => {
      socket.off('match_found');
      socket.off('opponent_answered', onOpponentAnswered);
      socket.off('round_result');
      socket.off('round_answers',     onRoundAnswers);
      socket.off('security_violation',         onSecurityViolation);
      socket.off('security_ban',               onSecurityBan);
      socket.off('security_duplicate_session', onDuplicateSession);
      socket.off('registration_error',         onRegistrationError);
      socket.off('match_over_forfeit',         onMatchOverForfeit);
      socket.off('tournament_countdown',  onTournamentCountdown);
      socket.off('tournament_started',    onTournamentStartedFull);
      socket.off('tournament_round_won',  onTournamentRoundWon);
      socket.off('tournament_eliminated', onTournamentEliminated);
      socket.off('tournament_next_round', onTournamentNextRound);
      socket.off('tournament_champion',   onTournamentChampion);
      socket.off('you_are_champion',      onYouAreChampion);
      socket.off('next_question',         onNextQuestion);
      socket.off('tournament_waiting',         onTournamentWaiting);
      socket.off('waiting_count',             onWaitingCount);
      socket.off('tournament_reset',          onTournamentReset);
      socket.off('force_reload',              onForceReload);
      socket.off('special_session_updated',   onSpecialSessionUpdated);
    };
  }, []);

  // ── joinLobby — connect socket + emit join_lobby ──────────────────────────
  const joinLobby = useCallback((username) => {
    const deviceId = getDeviceId();
    registerUsername(username);
    dispatch({ type: ACTIONS.SET_USERNAME, payload: username });
    dispatch({ type: 'SET_DEVICE', payload: { deviceId, coins: getCoins(), streak: getStreak() } });
    dispatch({ type: ACTIONS.JOIN_LOBBY });

    // Register user on the backend (fire-and-forget — don't block the game flow)
    registerUser(username, deviceId).catch(() => {});

    // Spectator counter (cosmetic)
    const specInterval = setInterval(() => {
      dispatch({ type: 'SET_SPECTATORS', payload: Math.floor(Math.random() * 300) + 50 });
    }, 8000);

    // Connect & register
    if (!socket.connected) socket.connect();
    const sessionToken = getOrCreateSessionToken();
    // Check if this is Bible quiz (special session) AND if it's activated by admin
    const isOnSpecialRoute = window.location.pathname.includes('/special') || 
                             window.location.pathname.includes('/bible') ||
                             window.location.hash.includes('special') ||
                             window.location.hash.includes('bible');
    // Only set isSpecialSession if admin has activated it
    let specialActive = false;
    try {
      const ss = JSON.parse(localStorage.getItem('qd_special_session') || 'null');
      specialActive = ss?.active || false;
    } catch (_) {}
    const isSpecialSession = isOnSpecialRoute && specialActive;
    socket.emit('register_device', { deviceId, sessionToken });
    socket.emit('join_lobby', { deviceId, username, sessionToken, isSpecialSession });

    // Fallback: if no opponent found within 28 s → bot match
    lobbyTimeoutRef.current = setTimeout(() => {
      clearInterval(specInterval);
      // Only trigger fallback if still in lobby stage
      dispatch((getState) => {
        // We can't read state directly in useCallback without stale closure,
        // so we dispatch a thunk-style action using SET_STAGE guard below
        return null;
      });

      const fallbackMatchId = 'match_' + deviceId + '_' + Date.now();
      dispatch({
        type: ACTIONS.MATCH_FOUND,
        payload: {
          opponent: {
            username: ['Player_Alpha','Player_Beta','Player_Gamma','Player_Delta',
                       'Player_Omega','Player_Sigma','Player_Zeta','Player_Nova']
                      [Math.floor(Math.random() * 8)],
            id: 'bot',
          },
          matchId: fallbackMatchId,
          matchSeed: fallbackMatchId,
        },
      });
      let count = 3;
      const tick = setInterval(() => {
        count--;
        dispatch({ type: ACTIONS.MATCH_COUNTDOWN_TICK });
        if (count <= 0) {
          clearInterval(tick);
          dispatch({ type: ACTIONS.MATCH_START });
        }
      }, 1000);
    }, 28000);

    // Clear spec interval when match is found (handled inside onMatchFound above)
    socket.once('match_found', () => clearInterval(specInterval));
  }, []);

  // Simulate opponent answering (random delay 1-8s)
  const simulateOpponentAnswer = useCallback((question) => {
    const delay = 1000 + Math.random() * 7000;
    setTimeout(() => {
      const isCorrect = Math.random() < 0.65;
      const wrongOptions = ['A', 'B', 'C', 'D'].filter(o => o !== question.correct);
      const answer = isCorrect
        ? question.correct
        : wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
      dispatch({ type: ACTIONS.OPPONENT_ANSWERED, payload: { answer } });
    }, delay);
  }, []);

  const submitAnswer = useCallback((answer, timeLeft) => {
    // Anti-cheat: validate timing
    const timeElapsed = 9 - timeLeft;
    if (answer !== null) {
      // Would send to server for real validation in production
      validateAnswer(answer, {}, timeElapsed);
    }
    dispatch({ type: ACTIONS.SUBMIT_ANSWER, payload: { answer, time: timeElapsed } });
  }, []);

  const evaluateRound = useCallback((myAnswer, opponentAnswer, question, bothCorrectCount, username, timeUsed) => {
    const myCorrect = myAnswer === question.correct;
    const oppCorrect = opponentAnswer === question.correct;

    if (myCorrect && oppCorrect) {
      if (bothCorrectCount >= 2) {
        incrementStreak();
        addCoins(15); // speed bonus
        dispatch({ type: ACTIONS.MATCH_OVER, payload: { result: 'win', timeUsed: timeUsed || 0 } });
      } else {
        dispatch({ type: ACTIONS.NEXT_QUESTION });
      }
    } else if (myCorrect && !oppCorrect) {
      incrementStreak();
      dispatch({ type: ACTIONS.MATCH_OVER, payload: { result: 'win', timeUsed: timeUsed || 0 } });
    } else if (!myCorrect && oppCorrect) {
      resetStreak();
      dispatch({ type: ACTIONS.MATCH_OVER, payload: { result: 'lose', timeUsed: 0 } });
    } else {
      // Both wrong → game over + eliminated
      resetStreak();
      if (username) setDeviceEliminated(username);
      dispatch({ type: ACTIONS.MATCH_OVER, payload: { result: 'gameover', timeUsed: 0 } });
    }
  }, []);

  const enterFinal = useCallback(() => {
    dispatch({ type: ACTIONS.ENTER_FINAL });
  }, []);

  const submitFinalAnswer = useCallback((answer) => {
    dispatch({ type: ACTIONS.FINAL_ANSWER, payload: { answer } });
  }, []);

  const goToLeaderboard = useCallback(async () => {
    // Always navigate immediately so the button feels responsive
    dispatch({ type: ACTIONS.SET_STAGE, payload: 'leaderboard' });
    try {
      const data = await fetchUsers();
      // Map backend user shape → leaderboard entry shape
      const users = (Array.isArray(data) ? data : data.users ?? []).map(u => ({
        username: u.username,
        wins: u.wins ?? 0,
        totalTime: u.totalTime ?? u.total_time ?? 0,
        stage: (u.wins ?? 0) >= 10 ? 'champion' : 'playing',
      }));
      // Merge: ensure current player is always present and up-to-date
      const me = { username: state.username || 'You', wins: state.wins, totalTime: state.totalMatchTime, stage: state.wins >= 10 ? 'champion' : 'playing' };
      const withoutMe = users.filter(p => p.username !== me.username);
      dispatch({ type: ACTIONS.SET_LEADERBOARD, payload: [me, ...withoutMe] });
    } catch {
      // Fallback: just show the current player
      const fallback = [{ username: state.username || 'You', wins: state.wins, totalTime: state.totalMatchTime, stage: state.wins >= 10 ? 'champion' : 'playing' }];
      dispatch({ type: ACTIONS.SET_LEADERBOARD, payload: fallback });
    }
  }, [state.username, state.wins, state.totalMatchTime]);

  const submitTournamentAnswer = useCallback((answer, questionId, matchId, timeLeft) => {
    const deviceId = getDeviceId();
    dispatch({ type: ACTIONS.TOURNAMENT_SUBMIT_ANSWER, payload: { answer } });
    socket.emit('submit_answer', {
      answer,
      questionId,
      matchId,
      deviceId,
      timeLeft: timeLeft ?? 0,
      clientTimestamp: Date.now(),
      isTournament: true,
    });
  }, []);

  const resetGame = useCallback(() => {
    // Read username from current state via the reducer payload
    dispatch({ type: ACTIONS.RESET_GAME });
  }, []);

  const setStage = useCallback((stage) => {
    dispatch({ type: ACTIONS.SET_STAGE, payload: stage });
  }, []);

  return (
    <GameContext.Provider value={{
      state,
      dispatch,
      joinLobby,
      simulateOpponentAnswer,
      submitAnswer,
      submitTournamentAnswer,
      evaluateRound,
      enterFinal,
      submitFinalAnswer,
      goToLeaderboard,
      resetGame,
      setStage,
      ACTIONS,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
