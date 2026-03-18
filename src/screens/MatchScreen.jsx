import { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { Clock, Zap, Eye, Flame } from 'lucide-react';
import { getStreak, getStreakBonus } from '../utils/anticheat';
import { playTick, playUrgentTick, playCorrect, playWrong, playTimeUp, playClick } from '../utils/sounds';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const OPTION_COLORS = [
  'from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-blue-500/40',
  'from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 border-purple-500/40',
  'from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 border-amber-500/40',
  'from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 border-rose-500/40',
];
const OPTION_COLORS_CORRECT = 'from-green-500 to-green-600 border-green-400';
const OPTION_COLORS_WRONG = 'from-red-600 to-red-700 border-red-500 opacity-70';

export default function MatchScreen() {
  const { state, submitAnswer, simulateOpponentAnswer, evaluateRound } = useGame();
  const { currentQuestion, questionIndex, matchQuestions, username, opponent, bothCorrectCount, myAnswer, opponentAnswer, opponentHasAnswered, matchStartTime, isBot } = state;

  // Compute how many seconds remain based on wall-clock so both devices are in sync
  const getInitialTime = () => {
    if (!matchStartTime) return 9;
    const elapsed = Math.floor((Date.now() - matchStartTime) / 1000) % 9;
    return Math.max(1, 9 - elapsed);
  };

  const [timeLeft, setTimeLeft] = useState(getInitialTime);
  const [answered, setAnswered] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [opponentStatus, setOpponentStatus] = useState('thinking'); // thinking | answered | timeout
  const streak = getStreak();
  const streakBonus = getStreakBonus(streak);
  const timerRef = useRef(null);
  const evaluatedRef = useRef(false);
  const myAnswerRef = useRef(null); // tracks answer immediately, no stale closure
  const matchTimeUsedRef = useRef(0); // cumulative seconds used this match

  // Reset on new question — sync timer to wall clock so both devices tick together
  useEffect(() => {
    const elapsed = matchStartTime
      ? Math.floor((Date.now() - matchStartTime) / 1000) - (questionIndex * 9)
      : 0;
    setTimeLeft(Math.max(1, 9 - Math.max(0, elapsed)));
    setAnswered(false);
    setShowResult(false);
    setOpponentStatus('thinking');
    evaluatedRef.current = false;
    myAnswerRef.current = null;
    // don't reset matchTimeUsedRef here — it accumulates across questions
  }, [questionIndex, matchStartTime]);

  // Start opponent simulation ONLY for bot matches
  useEffect(() => {
    if (!currentQuestion || answered || !isBot) return;
    simulateOpponentAnswer(currentQuestion);
  }, [currentQuestion, simulateOpponentAnswer, answered, isBot]);

  // Opponent answered notification
  useEffect(() => {
    if (opponentHasAnswered && !showResult) {
      setOpponentStatus('answered');
    }
  }, [opponentHasAnswered, showResult]);

  // Countdown timer — keep running even after player answers so the clock stays in sync
  const answeredRef = useRef(false);
  useEffect(() => { answeredRef.current = answered; }, [answered]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!answeredRef.current) {
            playTimeUp();
            myAnswerRef.current = null;
            setAnswered(true);
            submitAnswer(null, 0);
          }
          return 0;
        }
        if (prev <= 4) playUrgentTick(); else playTick();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [submitAnswer, questionIndex]);

  // Evaluate when both have answered or timeout
  const tryEvaluate = useCallback((myAns, oppAns) => {
    if (evaluatedRef.current) return;
    if (myAns === undefined || oppAns === undefined) return;
    evaluatedRef.current = true;
    setShowResult(true);
    setTimeout(() => {
      evaluateRound(myAns, oppAns, currentQuestion, bothCorrectCount, state.username, matchTimeUsedRef.current);
    }, 1800);
  }, [evaluateRound, currentQuestion, bothCorrectCount, state.username]);

  useEffect(() => {
    // Only evaluate once we have a real answer (not null/undefined/pending)
    if (answered && opponentHasAnswered && state.opponentAnswer !== '__pending__') {
      tryEvaluate(myAnswerRef.current, state.opponentAnswer);
    }
  }, [answered, opponentHasAnswered, state.opponentAnswer, tryEvaluate]);

  useEffect(() => {
    if (timeLeft === 0) {
      setOpponentStatus(prev => prev === 'thinking' ? 'timeout' : prev);
      // Use real opponent answer if available, otherwise null (timed out)
      const oppAns = (state.opponentAnswer !== '__pending__' && state.opponentAnswer !== undefined)
        ? state.opponentAnswer
        : null;
      tryEvaluate(myAnswerRef.current, oppAns);
    }
  }, [timeLeft, tryEvaluate, state.opponentAnswer]);

  const handleAnswer = (option) => {
    if (answered) return;
    // DO NOT clearInterval — timer must keep running for the opponent
    const secondsUsed = 9 - timeLeft;
    matchTimeUsedRef.current += secondsUsed;
    myAnswerRef.current = option;
    setAnswered(true);
    if (option === currentQuestion?.correct) playCorrect(); else playWrong();
    submitAnswer(option, timeLeft);
  };

  if (!currentQuestion) return null;

  const timerPercent = (timeLeft / 9) * 100;
  const timerColor = timeLeft > 5 ? '#22c55e' : timeLeft > 2 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 44;
  const strokeOffset = circumference - (timerPercent / 100) * circumference;

  const getOptionStyle = (opt) => {
    if (!showResult) {
      if (answered && state.myAnswer === opt) {
        return 'from-white/20 to-white/10 border-white/40 ring-2 ring-white/50';
      }
      const idx = OPTION_LABELS.indexOf(opt);
      return OPTION_COLORS[idx] + (answered ? ' opacity-60 cursor-not-allowed' : ' cursor-pointer');
    }
    if (opt === currentQuestion.correct) return OPTION_COLORS_CORRECT + ' ring-2 ring-green-400';
    if (opt === state.myAnswer && opt !== currentQuestion.correct) return OPTION_COLORS_WRONG;
    const idx = OPTION_LABELS.indexOf(opt);
    return OPTION_COLORS[idx] + ' opacity-40';
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] bg-grid flex flex-col p-4 pb-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-40 bg-linear-to-b from-purple-900/20 to-transparent" />

      <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col gap-4">

        {/* ── Spectator bar ── */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl">
            <Eye className="w-3 h-3 text-purple-400" />
            <span className="text-purple-300 text-xs font-bold">{(state.spectators || 0) + 50} watching</span>
          </div>
          {streak >= 2 && streakBonus && (
            <span className={`flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-xl bg-orange-500/20 border border-orange-500/30 ${streakBonus.color}`}>
              <Flame className="w-3 h-3" />{streakBonus.label}
            </span>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-yellow-400 text-xs font-bold">Q{questionIndex + 1}/{matchQuestions?.length || 3}</span>
          </div>
        </div>

        {/* ── Username VS Username ── */}
        <div className="pt-2">
          {/* Full name banner */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-purple-300 font-black text-lg truncate max-w-30 text-right">{username}</span>
            <span className="bg-amber-500/20 border border-amber-500/50 rounded-xl px-3 py-1 text-amber-400 font-black text-sm tracking-widest">VS</span>
            <span className="text-red-300 font-black text-lg truncate max-w-30">{opponent?.username}</span>
          </div>

          {/* Player cards + timer */}
          <div className="flex items-center justify-between gap-2">
            {/* My card */}
            <div className="flex items-center gap-2 glass rounded-2xl px-3 py-2.5 flex-1 min-w-0 border border-purple-500/30">
              <div
                className="w-10 h-10 rounded-xl bg-linear-to-br from-purple-600 to-blue-600 flex items-center justify-center text-base font-black text-white shrink-0"
                style={{ boxShadow: '0 0 14px rgba(139,92,246,0.7)' }}
              >
                {username?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white font-black text-sm truncate leading-tight">{username}</p>
                <p className="text-purple-400 text-xs">{state.wins} wins 🏆</p>
              </div>
            </div>

            {/* Timer circle */}
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="44" fill="none"
                  stroke={timerColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-1000"
                  style={{ filter: `drop-shadow(0 0 10px ${timerColor})` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-white leading-none">{timeLeft}</span>
                <Clock className="w-2.5 h-2.5 text-gray-400" />
              </div>
            </div>

            {/* Opponent card */}
            <div className="flex items-center gap-2 glass rounded-2xl px-3 py-2.5 flex-1 min-w-0 justify-end border border-red-500/30">
              <div className="min-w-0 text-right">
                <p className="text-white font-black text-sm truncate leading-tight">{opponent?.username}</p>
                <div className="flex items-center justify-end gap-1">
                  {opponentStatus === 'thinking' && (
                    <span className="text-amber-400 text-xs animate-pulse">answering...</span>
                  )}
                  {opponentStatus === 'answered' && (
                    <span className="text-green-400 text-xs flex items-center gap-1">
                      <Zap className="w-3 h-3" />answered
                    </span>
                  )}
                  {opponentStatus === 'timeout' && (
                    <span className="text-red-400 text-xs">time up</span>
                  )}
                </div>
              </div>
              <div
                className="w-10 h-10 rounded-xl bg-linear-to-br from-red-600 to-rose-700 flex items-center justify-center text-base font-black text-white shrink-0"
                style={{ boxShadow: '0 0 14px rgba(239,68,68,0.7)' }}
              >
                {opponent?.username?.[0]?.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Question progress */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs whitespace-nowrap">Round {questionIndex + 1}/{matchQuestions.length}</span>
          <div className="flex-1 flex gap-1">
            {matchQuestions.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-all duration-500
                  ${i < questionIndex ? 'bg-green-500' : i === questionIndex ? 'bg-purple-500' : 'bg-white/10'}`}
              />
            ))}
          </div>
          {bothCorrectCount > 0 && (
            <span className="text-amber-400 text-xs whitespace-nowrap">🔥 {bothCorrectCount} tied</span>
          )}
        </div>

        {/* Question card */}
        <div className="glass rounded-3xl p-6 border border-purple-500/20">
          <div className="flex items-start gap-3 mb-2">
            <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium">
              {currentQuestion.category}
            </span>
          </div>
          <p className="text-white text-xl font-bold leading-relaxed">
            {currentQuestion.question}
          </p>
        </div>

        {/* Answer options */}
        <div className="grid grid-cols-1 gap-3">
          {OPTION_LABELS.map((opt) => (
            <button
              key={opt}
              onClick={() => handleAnswer(opt)}
              disabled={answered}
              className={`relative w-full bg-linear-to-r ${getOptionStyle(opt)} border rounded-2xl p-4 text-left flex items-center gap-4 transition-all duration-200 group`}
            >
              <div className="w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center font-black text-white text-lg shrink-0">
                {opt}
              </div>
              <span className="text-white font-medium text-base">
                {currentQuestion.options[opt]}
              </span>
              {showResult && opt === currentQuestion.correct && (
                <span className="ml-auto text-green-300 font-bold text-lg">✓</span>
              )}
              {showResult && state.myAnswer === opt && opt !== currentQuestion.correct && (
                <span className="ml-auto text-red-300 font-bold text-lg">✗</span>
              )}
            </button>
          ))}
        </div>

        {/* Result overlay message */}
        {showResult && (
          <div className={`rounded-2xl p-4 text-center font-bold text-lg animate-bounce
            ${state.myAnswer === currentQuestion.correct
              ? 'bg-green-500/20 border border-green-500/40 text-green-400'
              : 'bg-red-500/20 border border-red-500/40 text-red-400'
            }`}>
            {state.myAnswer === currentQuestion.correct ? '✅ Correct!' : '❌ Wrong!'}
          </div>
        )}
      </div>
    </div>
  );
}
