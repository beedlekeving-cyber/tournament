import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { getRandomQuestions, getSeededQuestions } from '../data/questions';
import {
  getDeviceId, registerUsername, releaseUsername,
  setDeviceEliminated, clearElimination,
  addCoins, getCoins, getStreak, incrementStreak, resetStreak,
  validateAnswer,
} from '../utils/anticheat';
import socket, { setReconnectContext, onConnectionChange } from '../utils/socket';
import { getOrCreateSessionToken } from '../utils/security';
import { registerUser, fetchUsers, fetchPublicQuestions } from '../utils/api';

// Casual 1v1 client-side question picker. Tournament uses server-provided questions.
function pickQuestions(count, excludeIds, seed) {
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

  // Connection status
  isConnected: false,
  lastSyncTime: null,

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
  maxPlayers: 400,
  tournamentStarted: false,
  scheduledDate: null,
  rewardAmount: '',

  // ── Tournament ──────────────────────────────────────────────────────────────
  tournament: {
    phase: 'idle',           // idle | countdown_warning | waiting_match | in_match | round_won | bye | eliminated | champion | tournament_ended | no_winner | blocked
    countdownWarning: null,  // e.g. '5 minutes to go!'
    round: 1,
    roundLabel: 'Round 1',   // human label sent by server (Round N / Quarter Final / Semi Final / Final)
    matchId: null,           // current match ID
    matchQuestions: [],      // questions for current match (from match_found)
    currentQuestionIndex: 0,
    opponent: null,          // { username, id }
    myAnswer: null,
    roundResult: null,
    playerCount: 0,
    questionsPerMatch: 5,
    totalQuestions: 5,
    bothCorrectFeedback: false,
    rewardAmount: '',        // mirrored at tournament_started / you_are_champion
    tournamentId: null,
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
  TOURNAMENT_BYE: 'TOURNAMENT_BYE',
  TOURNAMENT_FINAL_NOTICE: 'TOURNAMENT_FINAL_NOTICE',
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
      return { ...state, waitingCount: action.payload.count ?? action.payload, maxPlayers: action.payload.max ?? state.maxPlayers };

    case 'REWARD_UPDATED':
      return { ...state, rewardAmount: action.payload.rewardAmount ?? state.rewardAmount };

    case 'CONNECTION_STATUS':
      return { ...state, isConnected: action.payload };

    case 'STATE_SYNC': {
      // Server sent full state sync — merge carefully
      const sync = action.payload;
      return {
        ...state,
        lastSyncTime: Date.now(),
        stage: sync.stage || state.stage,
        matchId: sync.matchId ?? state.matchId,
        opponent: sync.opponent ?? state.opponent,
        waitingCount: sync.waitingCount ?? state.waitingCount,
        tournamentStarted: sync.tournamentStarted ?? state.tournamentStarted,
        scheduledDate: sync.scheduledDate ?? state.scheduledDate,
        // Once we've reached a terminal phase (champion, eliminated, tournament_ended,
        // no_winner), DO NOT let a background state_sync rewind the UI — they should
        // stay on their result screen (e.g. champion chatting with admin).
        tournament: (
          ['champion','eliminated','tournament_ended','no_winner'].includes(state.tournament.phase)
        )
          ? state.tournament
          : (sync.tournament ? { ...state.tournament, ...sync.tournament } : state.tournament),
      };
    }

    case ACTIONS.TOURNAMENT_COUNTDOWN_WARNING:
      // Once the player has reached a terminal state for this tournament
      // (champion, eliminated, tournament_ended, no_winner), a stale countdown
      // banner from the original schedule must NOT bounce them back to a
      // waiting screen.
      if (['champion','eliminated','tournament_ended','no_winner'].includes(state.tournament.phase)) {
        return state;
      }
      // Before the tournament has actually started, do NOT switch to the
      // "Finding your opponent" waiting screen. Just keep the player on the
      // registration screen — the scheduled countdown there is enough.
      if (!state.tournamentStarted) {
        return { ...state, tournament: { ...state.tournament, countdownWarning: action.payload.message } };
      }
      return { ...state, tournament: { ...state.tournament, phase: 'countdown_warning', countdownWarning: action.payload.message } };

    case ACTIONS.TOURNAMENT_STARTED:
      return {
        ...state,
        tournamentStarted: true,
        rewardAmount: action.payload.rewardAmount ?? state.rewardAmount,
        maxPlayers: action.payload.maxPlayers ?? state.maxPlayers,
        tournament: {
          ...state.tournament,
          phase: 'waiting_match',
          playerCount: action.payload.playerCount || 0,
          round: action.payload.round || 1,
          roundLabel: action.payload.roundLabel || `Round ${action.payload.round || 1}`,
          questionsPerMatch: action.payload.questionsPerMatch || 5,
          rewardAmount: action.payload.rewardAmount || state.rewardAmount || '',
          tournamentId: action.payload.tournamentId || state.tournament.tournamentId,
          countdownWarning: null,
        },
      };

    case ACTIONS.TOURNAMENT_MATCH_FOUND:
      // Safety: an eliminated/champion player must never be re-entered into a
      // match. If a stale match_found arrives, ignore it.
      if (['champion','eliminated','tournament_ended','no_winner'].includes(state.tournament.phase)) {
        return state;
      }
      return {
        ...state,
        tournament: {
          ...state.tournament,
          phase: 'pre_match',
          matchId: action.payload.matchId,
          matchQuestions: action.payload.questions || [],
          currentQuestionIndex: 0,
          opponent: action.payload.opponent,
          myAnswer: null,
          roundResult: null,
          round: action.payload.round || state.tournament.round,
          roundLabel: action.payload.roundLabel || state.tournament.roundLabel,
          totalQuestions: action.payload.totalQuestions || action.payload.questions?.length || state.tournament.questionsPerMatch,
          bothCorrectFeedback: false,
          preMatchCountdown: action.payload.preMatchCountdown || 5,
          questionTime: action.payload.questionTime || 15,
        },
      };

    case 'TOURNAMENT_PRE_MATCH_TICK':
      return { 
        ...state, 
        tournament: { 
          ...state.tournament, 
          preMatchCountdown: action.payload.countdown 
        } 
      };

    case 'TOURNAMENT_MATCH_START':
      return { 
        ...state, 
        tournament: { 
          ...state.tournament, 
          phase: 'in_match',
          preMatchCountdown: 0,
        } 
      };

    case ACTIONS.TOURNAMENT_SUBMIT_ANSWER:
      return { ...state, tournament: { ...state.tournament, myAnswer: action.payload.answer } };

    case ACTIONS.TOURNAMENT_ROUND_RESULT:
      return { ...state, tournament: { ...state.tournament, roundResult: action.payload, bothCorrectFeedback: false } };

    case ACTIONS.TOURNAMENT_BYE:
      return { ...state, tournament: { ...state.tournament, phase: 'bye', byeMessage: action.payload.message, round: action.payload.round || state.tournament.round } };

    case ACTIONS.TOURNAMENT_ROUND_WON:
      return { ...state, tournament: { ...state.tournament, phase: 'round_won', round: action.payload.nextRound || state.tournament.round + 1 } };

    case ACTIONS.TOURNAMENT_FINAL_NOTICE:
      return { ...state, tournament: { ...state.tournament, finalNotice: action.payload.message } };

    case ACTIONS.TOURNAMENT_ELIMINATED:
      return { ...state, tournament: { ...state.tournament, phase: 'eliminated' } };

    case ACTIONS.TOURNAMENT_NEXT_ROUND:
      // If THIS player is already done (eliminated / champion / etc), a
      // tournament-wide "next round" broadcast (from a different match still
      // running) must NOT bounce them off their result screen.
      if (['champion','eliminated','tournament_ended','no_winner'].includes(state.tournament.phase)) {
        return state;
      }
      return {
        ...state,
        tournament: {
          ...state.tournament,
          phase: 'waiting_match',
          currentQuestionIndex: 0,
          matchQuestions: [],
          opponent: null,
          myAnswer: null,
          roundResult: null,
          round: action.payload.round || state.tournament.round,
          roundLabel: action.payload.roundLabel || state.tournament.roundLabel,
          questionsPerMatch: action.payload.questionsPerMatch || state.tournament.questionsPerMatch,
          bothCorrectFeedback: false,
        },
      };

    case ACTIONS.TOURNAMENT_CHAMPION:
      // Only fires for the actual champion (you_are_champion)
      return {
        ...state,
        tournament: {
          ...state.tournament,
          phase: 'champion',
          isChampion: true,
          rewardAmount: action.payload?.rewardAmount ?? state.tournament.rewardAmount ?? state.rewardAmount,
          tournamentId: action.payload?.tournamentId ?? state.tournament.tournamentId,
        },
      };

    case 'TOURNAMENT_ENDED':
      // This is broadcast to everyone when a champion is declared
      // Non-champions see this, champions see TOURNAMENT_CHAMPION
      return { ...state, tournament: { ...state.tournament, phase: 'tournament_ended', championUsername: action.payload.username, isChampion: false } };

    case 'TOURNAMENT_NO_WINNER':
      // All players eliminated, no champion.
      // If THIS player is already eliminated, keep them on the Eliminated screen
      // instead of replacing it with a separate "no champion" message.
      if (state.tournament.phase === 'eliminated') return state;
      return { ...state, tournament: { ...state.tournament, phase: 'no_winner', noWinnerMessage: action.payload.message } };

    case 'TOURNAMENT_IN_PROGRESS_BLOCKED':
      // Player tried to join an active tournament they're not part of
      return { ...state, tournament: { ...state.tournament, phase: 'blocked', blockedMessage: action.payload.message } };

    case ACTIONS.TOURNAMENT_NEXT_QUESTION: {
      const { questionIndex, question, totalQuestions, questionTime, isHard } = action.payload;
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
          isHardQuestion: !!isHard,
          // Use the per-question time when the server provides one (e.g. shorter
          // for "hard" after both-correct); otherwise keep the match default.
          questionTime: questionTime || state.tournament.questionTime,
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
  // Track anti-stuck timeout
  const stuckTimeoutRef = useRef(null);

  // Question bank fetched once on mount, used to hydrate `questionIds` from the
  // server into full question objects locally. Server keeps the `correct` field
  // for validation; the client only ever holds id/question/options/category.
  const bankByIdRef = useRef({});
  const hydrateQuestion = useCallback((id) => bankByIdRef.current[id] || null, []);
  const hydrateQuestions = useCallback(
    (ids) => (Array.isArray(ids) ? ids.map(hydrateQuestion).filter(Boolean) : []),
    [hydrateQuestion]
  );

  // Fetch the public bank once on mount. Retries silently if the network is bad.
  useEffect(() => {
    let cancelled = false;
    const load = async (attempt = 0) => {
      try {
        const list = await fetchPublicQuestions();
        if (cancelled) return;
        const map = {};
        for (const q of list) map[q.id] = q;
        bankByIdRef.current = map;
        console.log(`[questions] Loaded ${list.length} questions into local cache`);
      } catch (e) {
        if (cancelled) return;
        if (attempt < 3) {
          setTimeout(() => load(attempt + 1), 1500 * (attempt + 1));
        } else {
          console.warn('[questions] Could not load question bank:', e.message);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Connection status tracking ────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onConnectionChange((connected) => {
      dispatch({ type: 'CONNECTION_STATUS', payload: connected });
    });
    return unsubscribe;
  }, []);

  // ── Socket.io event listeners (mount once) ────────────────────────────────
  useEffect(() => {
    // Connect socket immediately so we can receive reset events
    if (!socket.connected) socket.connect();

    const onMatchFound = ({ matchId, seed, opponent, you, questions }) => {
      // New payload shape: { you: { username, deviceId }, opponent: { username, deviceId } }
      // Fall back to flat opponent field for backwards compatibility
      const resolvedOpponent = opponent ?? you; // 'you' only present in some server versions
      const opponentPlayer = resolvedOpponent ?? {};
      // Store server-provided questions if any (special session)
      if (questions) {
        try { localStorage.setItem('qd_server_questions_' + matchId, JSON.stringify(questions)); } catch (_) {}
      }
      // Clear all lobby timeouts
      if (lobbyTimeoutRef.current) {
        clearTimeout(lobbyTimeoutRef.current);
        lobbyTimeoutRef.current = null;
      }
      if (stuckTimeoutRef.current) {
        clearInterval(stuckTimeoutRef.current);
        stuckTimeoutRef.current = null;
      }
      dispatch({
        type: ACTIONS.MATCH_FOUND,
        payload: {
          opponent: { username: opponentPlayer.username, id: opponentPlayer.deviceId || opponentPlayer.id },
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
      // TournamentScreen handles this with inline UI; log here as a fallback
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
      if (stuckTimeoutRef.current) {
        clearInterval(stuckTimeoutRef.current);
        stuckTimeoutRef.current = null;
      }
      dispatch({ type: 'TOURNAMENT_WAITING', payload: { ...data, activeCount: data.activeCount ?? 0 } });
    };
    const onWaitingCount = (data) => {
      dispatch({ type: 'WAITING_COUNT', payload: data });
    };
    const onTournamentConfig = (data) => {
      dispatch({ type: 'REWARD_UPDATED', payload: { rewardAmount: data.rewardAmount } });
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

    // ── Tournament socket events ──────────────────────────────────────────────
    const onTournamentCountdown = ({ message, secondsRemaining, secondsLeft }) => {
      const secs = secondsRemaining ?? secondsLeft;
      dispatch({ type: ACTIONS.TOURNAMENT_COUNTDOWN_WARNING, payload: { message: message || `Tournament starts in ${secs}s!` } });
    };
    
    // Grace period: we have enough players, waiting a few more seconds for others
    const onTournamentGracePeriod = ({ message, activeCount, secondsRemaining }) => {
      console.log('[TOURNAMENT] grace_period:', { activeCount, secondsRemaining });
      dispatch({ type: ACTIONS.TOURNAMENT_COUNTDOWN_WARNING, payload: { message: message || `${activeCount} players ready! Starting soon...` } });
    };

    const onTournamentStartedFull = ({ playerCount, round, roundLabel, questionsPerMatch, rewardAmount, maxPlayers, tournamentId }) => {
      dispatch({
        type: ACTIONS.TOURNAMENT_STARTED,
        payload: {
          playerCount: playerCount || 0,
          round: round || 1,
          roundLabel: roundLabel || `Round ${round || 1}`,
          questionsPerMatch: questionsPerMatch || 5,
          rewardAmount,
          maxPlayers,
          tournamentId,
        },
      });
      dispatch({ type: 'TOURNAMENT_STARTED' });
    };

    const onTournamentMatchFound = ({ matchId, questionIds, questions: inlineQuestions, opponent, round, roundLabel, totalQuestions, isTournament, preMatchCountdown, questionTime }) => {
      if (!isTournament) return; // handled by the normal match_found listener above
      // Prefer inline questions sent by the server (race-free) over local-bank hydration.
      const hydrated = (Array.isArray(inlineQuestions) && inlineQuestions.length > 0)
        ? inlineQuestions
        : hydrateQuestions(questionIds);
      console.log('[TOURNAMENT] match_found:', { matchId, round, roundLabel, totalQuestions, opponent: opponent?.username, preMatchCountdown, questionTime, questionIdCount: questionIds?.length, inlineCount: inlineQuestions?.length, hydrated: hydrated.length });
      if (questionIds?.length && hydrated.length === 0) {
        console.warn('[TOURNAMENT] match_found: NO questions available — match will render empty');
      }
      const opp = opponent ?? {};
      const countdown = preMatchCountdown || 5;
      dispatch({
        type: ACTIONS.TOURNAMENT_MATCH_FOUND,
        payload: {
          matchId,
          questions: hydrated,
          opponent: { username: opp.username, id: opp.id || opp.deviceId },
          round: round || 1,
          roundLabel,
          totalQuestions: totalQuestions || questionIds?.length || 5,
          preMatchCountdown: countdown,
          questionTime: questionTime || 15,
        },
      });
      
      // Start pre-match countdown
      let count = countdown;
      const tick = setInterval(() => {
        count--;
        dispatch({ type: 'TOURNAMENT_PRE_MATCH_TICK', payload: { countdown: count } });
        if (count <= 0) {
          clearInterval(tick);
          dispatch({ type: 'TOURNAMENT_MATCH_START' });
        }
      }, 1000);
    };

    const onTournamentRoundResult = ({ result, questionIndex, correctAnswer, myAnswer, opponentAnswer, matchOver }) => {
      console.log('[TOURNAMENT] round_result:', { result, questionIndex, correctAnswer, myAnswer, opponentAnswer, matchOver });
      dispatch({ type: ACTIONS.TOURNAMENT_ROUND_RESULT, payload: { result, questionIndex, correctAnswer, myAnswer, opponentAnswer, matchOver } });
    };

    const onTournamentBye = ({ message, username, round, roundLabel }) => {
      console.log('[TOURNAMENT] bye:', { message, username, round, roundLabel });
      dispatch({ type: ACTIONS.TOURNAMENT_BYE, payload: { message, round, roundLabel } });
    };

    const onTournamentRoundWon = ({ nextRound, round, roundLabel }) => {
      console.log('[TOURNAMENT] round_won:', { nextRound, round, roundLabel });
      dispatch({ type: ACTIONS.TOURNAMENT_ROUND_WON, payload: { nextRound: nextRound || round, roundLabel } });
    };

    const onTournamentEliminated = () => {
      console.log('[TOURNAMENT] eliminated');
      dispatch({ type: ACTIONS.TOURNAMENT_ELIMINATED });
    };

    const onTournamentNextRound = ({ round, roundLabel, questionsPerMatch }) => {
      console.log('[TOURNAMENT] next_round:', { round, roundLabel, questionsPerMatch });
      dispatch({ type: ACTIONS.TOURNAMENT_NEXT_ROUND, payload: { round, roundLabel, questionsPerMatch } });
    };

    // next_question: server says both players answered the same — move to next question.
    // Prefer the inline `question` object from the server; fall back to hydrating
    // from the local bank cache by questionId (legacy path).
    // Delay the dispatch by 1.5 s so TournamentMatch can show the answer reveal first.
    const onNextQuestion = ({ questionIndex, questionId, question: inlineQuestion, bothCorrectCount, bothWrongCount, message, totalQuestions, questionTime, isHard }) => {
      console.log('[TOURNAMENT] next_question:', { questionIndex, questionId, hasInline: !!inlineQuestion, bothCorrectCount, bothWrongCount, totalQuestions, questionTime, isHard, message });
      const question = inlineQuestion || hydrateQuestion(questionId);
      const delayMs = bothWrongCount ? 500 : 1500;
      setTimeout(() => {
        dispatch({ type: ACTIONS.TOURNAMENT_NEXT_QUESTION, payload: { questionIndex, question, bothCorrectCount, message, totalQuestions, questionTime, isHard } });
      }, delayMs);
    };

    // tournament_champion: broadcast to EVERYONE. Only the champion gets you_are_champion.
    const onTournamentChampion = ({ username, deviceId, rewardAmount }) => {
      const myDeviceId = localStorage.getItem('qd_deviceId');
      console.log('[TOURNAMENT] tournament_champion:', { username, deviceId, rewardAmount, isMe: deviceId === myDeviceId });
      if (deviceId === myDeviceId) {
        dispatch({ type: ACTIONS.TOURNAMENT_CHAMPION, payload: { rewardAmount } });
      } else {
        dispatch({ type: 'TOURNAMENT_ENDED', payload: { username, deviceId, rewardAmount } });
      }
    };

    const onYouAreChampion = ({ rewardAmount, tournamentId } = {}) => {
      console.log('[TOURNAMENT] you_are_champion!', { rewardAmount, tournamentId });
      dispatch({ type: ACTIONS.TOURNAMENT_CHAMPION, payload: { rewardAmount, tournamentId } });
    };

    socket.on('tournament_countdown',   onTournamentCountdown);
    socket.on('tournament_grace_period', onTournamentGracePeriod);
    socket.on('tournament_started',     onTournamentStartedFull);
    socket.on('match_found',            (data) => { if (data.isTournament) onTournamentMatchFound(data); else onMatchFound(data); });
    socket.on('round_result',           (data) => { if (data.isTournament) onTournamentRoundResult(data); else onRoundResult(data); });
    socket.on('tournament_bye',         onTournamentBye);
    socket.on('tournament_round_won',   onTournamentRoundWon);
    socket.on('tournament_eliminated',  onTournamentEliminated);
    socket.on('tournament_next_round',  onTournamentNextRound);
    socket.on('tournament_final_notice', ({ message, round }) => {
      console.log('[TOURNAMENT] final_notice:', { message, round });
      dispatch({ type: ACTIONS.TOURNAMENT_FINAL_NOTICE, payload: { message } });
    });
    socket.on('tournament_champion',    onTournamentChampion);
    socket.on('you_are_champion',       onYouAreChampion);
    socket.on('next_question',          onNextQuestion);
    
    // Handle case where all players are eliminated (no champion)
    const onTournamentNoWinner = ({ round, message }) => {
      console.log('[TOURNAMENT] no_winner:', { round, message });
      dispatch({ type: 'TOURNAMENT_NO_WINNER', payload: { round, message } });
    };
    socket.on('tournament_no_winner', onTournamentNoWinner);

    socket.on('tournament_waiting',          onTournamentWaiting);
    socket.on('waiting_count',              onWaitingCount);
    socket.on('tournament_reset',           onTournamentReset);
    socket.on('force_reload',               onForceReload);
    socket.on('tournament_config_updated',  onTournamentConfig);

    // State sync from server (after reconnection or visibility change)
    const onStateSync = (data) => {
      dispatch({ type: 'STATE_SYNC', payload: data });
    };
    socket.on('state_sync', onStateSync);
    
    // Match reconnected — player was restored to their active match after disconnect
    const onMatchReconnected = (data) => {
      console.log('[socket] match_reconnected', data);
      if (data.isTournament) {
        dispatch({
          type: ACTIONS.TOURNAMENT_MATCH_FOUND,
          payload: {
            matchId: data.matchId,
            questions: hydrateQuestions(data.questionIds),
            opponent: data.opponent,
            round: data.round,
            totalQuestions: data.totalQuestions,
          }
        });
        // If we had already answered, restore that
        if (data.myAnswer !== null) {
          dispatch({ type: ACTIONS.TOURNAMENT_SUBMIT_ANSWER, payload: { answer: data.myAnswer } });
        }
      }
    };
    socket.on('match_reconnected', onMatchReconnected);
    
    // Opponent reconnected notification
    const onOpponentReconnected = ({ matchId }) => {
      console.log('[socket] opponent reconnected to', matchId);
      // Could show a toast notification here
    };
    socket.on('opponent_reconnected', onOpponentReconnected);
    
    // Tournament state guards - handle late joiners / eliminated players
    const onTournamentInProgress = ({ message }) => {
      console.log('[socket] tournament_in_progress:', message);
      // Set flag to stop reconnect spam and show user a message
      dispatch({ type: 'TOURNAMENT_IN_PROGRESS_BLOCKED', payload: { message } });
    };
    socket.on('tournament_in_progress', onTournamentInProgress);
    
    const onTournamentEndedInfo = ({ message, championUsername }) => {
      console.log('[socket] tournament_ended_info:', championUsername);
      dispatch({ type: 'TOURNAMENT_ENDED', payload: { username: championUsername } });
    };
    socket.on('tournament_ended_info', onTournamentEndedInfo);

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
      socket.off('tournament_grace_period', onTournamentGracePeriod);
      socket.off('tournament_started',    onTournamentStartedFull);
      socket.off('tournament_bye',        onTournamentBye);
      socket.off('tournament_round_won',  onTournamentRoundWon);
      socket.off('tournament_eliminated', onTournamentEliminated);
      socket.off('tournament_next_round', onTournamentNextRound);
      socket.off('tournament_champion',   onTournamentChampion);
      socket.off('you_are_champion',      onYouAreChampion);
      socket.off('next_question',         onNextQuestion);
      socket.off('tournament_no_winner',  onTournamentNoWinner);
      socket.off('tournament_waiting',         onTournamentWaiting);
      socket.off('waiting_count',             onWaitingCount);
      socket.off('tournament_reset',          onTournamentReset);
      socket.off('force_reload',              onForceReload);
      socket.off('tournament_config_updated', onTournamentConfig);
      socket.off('state_sync',                onStateSync);
      socket.off('match_reconnected',         onMatchReconnected);
      socket.off('opponent_reconnected',      onOpponentReconnected);
      socket.off('tournament_in_progress',    onTournamentInProgress);
      socket.off('tournament_ended_info',     onTournamentEndedInfo);
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

    // Set reconnection context so socket can auto-rejoin on reconnect
    setReconnectContext({ deviceId, sessionToken, username });

    socket.emit('register_device', { deviceId, sessionToken });
    socket.emit('join_lobby', { deviceId, username, sessionToken });

    // Anti-stuck: if in lobby for more than 30s without any update, request resync
    stuckTimeoutRef.current = setInterval(() => {
      if (socket.connected) {
        socket.emit('request_state_sync', { deviceId });
      }
    }, 30000);

    // Fallback: if no opponent found within 28 s → bot match
    lobbyTimeoutRef.current = setTimeout(() => {
      clearInterval(specInterval);
      if (stuckTimeoutRef.current) clearInterval(stuckTimeoutRef.current);
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
    console.log('[TOURNAMENT] submitAnswer:', { answer, questionId, matchId, timeLeft, deviceId });
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
