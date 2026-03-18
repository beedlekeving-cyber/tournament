import { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { Clock, Star, Trophy, Zap } from 'lucide-react';
import {
  playTick, playUrgentTick, playCorrect, playWrong,
  playTimeUp, playFinalFanfare, playPrize,
} from '../utils/sounds';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const OPTION_COLORS = [
  'from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-blue-500/40',
  'from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 border-purple-500/40',
  'from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 border-amber-500/40',
  'from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 border-rose-500/40',
];

const PRIZE_LADDER = [
  { min: 1, prize: '₦2,000 recharge 📱' },
  { min: 2, prize: '₦3,000 recharge 📱' },
  { min: 3, prize: '₦5,000 💵' },
  { min: 4, prize: '₦10,000 💰' },
  { min: 6, prize: '₦20,000 GRAND 🏆' },
];

const QUESTION_TIME = 15; // seconds per final question

// ── Intro splash ─────────────────────────────────────────────────────────────
function FinalIntro({ username, onStart }) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    playFinalFanfare();
    const t = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(t); onStart(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onStart]);

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full bg-amber-500/20 blur-3xl" />
      </div>
      <div className="relative z-10 text-center space-y-6 max-w-sm w-full">
        <div className="text-7xl animate-bounce">🏆</div>
        <div>
          <p className="text-amber-400 font-black text-lg tracking-widest uppercase mb-1">You Made It!</p>
          <h1 className="text-4xl font-black text-white leading-tight">Final<br />Stage</h1>
        </div>
        <div className="glass rounded-2xl p-5 border border-amber-500/30 space-y-2 text-left">
          <div className="flex items-center gap-2 text-sm text-gray-300"><span className="text-amber-400">🎯</span> 10 solo questions — just you</div>
          <div className="flex items-center gap-2 text-sm text-gray-300"><span className="text-amber-400">⏱️</span> {QUESTION_TIME} seconds per question</div>
          <div className="flex items-center gap-2 text-sm text-gray-300"><span className="text-amber-400">💰</span> Answer correctly to win prizes</div>
          <div className="flex items-center gap-2 text-sm text-gray-300"><span className="text-amber-400">🔥</span> More correct = bigger reward</div>
        </div>
        <div className="glass rounded-2xl p-4 border border-amber-500/20">
          <p className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wide">Prize Ladder</p>
          <div className="space-y-1.5">
            {[...PRIZE_LADDER].reverse().map(({ min, prize }) => (
              <div key={min} className="flex items-center justify-between text-sm">
                <span className="text-amber-400 font-bold">{min}+ correct</span>
                <span className="text-white font-medium">{prize}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl py-4 px-6 border border-amber-500/30">
          <p className="text-gray-400 text-sm mb-1">Starting in</p>
          <p className="text-6xl font-black text-amber-400">{countdown}</p>
        </div>
        <p className="text-gray-500 text-xs">Good luck, {username}! 🍀</p>
      </div>
    </div>
  );
}

// ── Results screen ────────────────────────────────────────────────────────────
function FinalResults({ state, resetGame }) {
  useEffect(() => { if (state.finalScore >= 1) playPrize(); }, []);

  const score = state.finalScore;
  let prize = null;
  if      (score >= 6) prize = '₦20,000 GRAND WIN! 🏆';
  else if (score >= 4) prize = '₦10,000 💰';
  else if (score >= 3) prize = '₦5,000 💵';
  else if (score >= 2) prize = '₦3,000 recharge 📱';
  else if (score >= 1) prize = '₦2,000 recharge 📱';

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 w-full max-w-sm text-center space-y-5">
        <div className="text-7xl">{prize ? '🎊' : '😔'}</div>
        <div>
          <h1 className="text-4xl font-black text-white mb-1">Final Stage Over!</h1>
          <p className="text-gray-400">You answered <span className="text-white font-bold">{score} / {state.finalQuestions.length}</span> correctly</p>
        </div>
        <div className={`rounded-3xl p-6 ${prize ? 'bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40' : 'glass border border-white/10'}`}>
          {prize ? (
            <>
              <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <p className="text-gray-300 text-sm mb-1">🎉 Congratulations, {state.username}!</p>
              <p className="text-3xl font-black text-amber-400">{prize}</p>
              <p className="text-gray-400 text-sm mt-3">Contact admin to claim your reward</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-400">No Reward</p>
              <p className="text-gray-500 mt-1 text-sm">You need at least 1 correct answer to win</p>
            </>
          )}
        </div>
        <div className="glass rounded-2xl p-4 text-left">
          <p className="text-white font-semibold mb-3 text-sm">Your Answers</p>
          <div className="grid grid-cols-2 gap-2">
            {state.finalAnswers.map((ans, i) => (
              <div key={i} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm
                ${ans.correct ? 'bg-green-500/15 border border-green-500/30' : 'bg-red-500/10 border border-red-500/20'}`}>
                <span className="text-gray-400">Q{i + 1}</span>
                <span className={ans.correct ? 'text-green-400 font-bold' : 'text-red-400'}>{ans.correct ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={resetGame}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg hover:scale-[1.02] transition-transform"
          style={{ boxShadow: '0 0 30px rgba(139,92,246,0.4)' }}
        >
          🔄 Back to Lobby
        </button>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function FinalScreen() {
  const { state, submitFinalAnswer, resetGame } = useGame();
  const { finalQuestions, finalQuestionIndex, finalScore, username } = state;

  const [showIntro, setShowIntro]     = useState(true);
  const [timeLeft, setTimeLeft]       = useState(QUESTION_TIME);
  const [answered, setAnswered]       = useState(false);
  const [selected, setSelected]       = useState(null);
  const [showCorrect, setShowCorrect] = useState(false);
  const timerRef     = useRef(null);
  const submittedRef = useRef(false);

  const question = finalQuestions?.[finalQuestionIndex] ?? null;
  const isOver   = state.stage === 'finalover';

  // Reset per question
  useEffect(() => {
    setTimeLeft(QUESTION_TIME);
    setAnswered(false);
    setSelected(null);
    setShowCorrect(false);
    submittedRef.current = false;
  }, [finalQuestionIndex]);

  // Guard: skip missing question
  useEffect(() => {
    if (!isOver && !question && finalQuestions?.length > 0) submitFinalAnswer(null);
  }, [question, isOver, finalQuestions, submitFinalAnswer]);

  // Countdown timer — only after intro dismissed
  useEffect(() => {
    if (showIntro || answered || isOver) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!submittedRef.current) {
            submittedRef.current = true;
            playTimeUp();
            setAnswered(true);
            setShowCorrect(true);
            setTimeout(() => submitFinalAnswer(null), 1800);
          }
          return 0;
        }
        if (prev <= 4) playUrgentTick(); else playTick();
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [showIntro, answered, isOver, finalQuestionIndex, submitFinalAnswer]);

  const handleAnswer = (opt) => {
    if (answered || submittedRef.current) return;
    clearInterval(timerRef.current);
    submittedRef.current = true;
    setAnswered(true);
    setSelected(opt);
    setShowCorrect(true);
    if (opt === question?.correct) playCorrect(); else playWrong();
    setTimeout(() => submitFinalAnswer(opt), 1800);
  };

  if (showIntro) return <FinalIntro username={username} onStart={() => setShowIntro(false)} />;
  if (isOver)   return <FinalResults state={state} resetGame={resetGame} />;
  if (!question) return null;

  const timerPercent  = (timeLeft / QUESTION_TIME) * 100;
  const circumference = 2 * Math.PI * 44;
  const timerColor    = timeLeft > 8 ? '#22c55e' : timeLeft > 4 ? '#f59e0b' : '#ef4444';

  const getOptionStyle = (opt) => {
    const base = OPTION_COLORS[OPTION_LABELS.indexOf(opt)];
    if (showCorrect) {
      if (opt === question.correct) return 'from-green-500 to-green-600 border-green-400 ring-2 ring-green-400';
      if (selected === opt)         return 'from-red-600 to-red-700 border-red-500 opacity-60';
      return base + ' opacity-25';
    }
    if (answered) return base + ' opacity-50 cursor-not-allowed';
    return base + ' cursor-pointer';
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] bg-grid flex flex-col p-4 pb-10 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-amber-900/20 to-transparent pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-2 border border-amber-500/30">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="text-amber-400 font-black text-xs tracking-widest uppercase">Final Stage</p>
              <p className="text-white font-bold text-sm truncate max-w-[100px]">{username}</p>
            </div>
          </div>

          {/* Timer circle */}
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
              <circle
                cx="50" cy="50" r="44" fill="none"
                stroke={timerColor} strokeWidth="9" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (timerPercent / 100) * circumference}
                className="transition-all duration-1000"
                style={{ filter: `drop-shadow(0 0 6px ${timerColor})` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-white font-black text-xl leading-none">{timeLeft}</span>
              <Clock className="w-2.5 h-2.5 text-gray-400" />
            </div>
          </div>

          <div className="glass rounded-2xl px-4 py-2.5 text-right border border-white/10">
            <p className="text-white font-black text-lg leading-none">{finalScore}</p>
            <p className="text-gray-400 text-xs">correct</p>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Question {finalQuestionIndex + 1} of {finalQuestions.length}</span>
            <span className="text-amber-400 font-semibold">{finalScore} correct so far</span>
          </div>
          <div className="flex gap-1">
            {finalQuestions.map((_, i) => {
              const ans = state.finalAnswers[i];
              return (
                <div key={i} className={`flex-1 h-2 rounded-full transition-all duration-500
                  ${i < finalQuestionIndex
                    ? (ans?.correct ? 'bg-green-500' : 'bg-red-500')
                    : i === finalQuestionIndex
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-white/10'
                  }`} />
              );
            })}
          </div>
        </div>

        {/* Solo label */}
        <div className="flex items-center justify-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-400 text-xs font-bold tracking-widest uppercase">Solo Challenge — Only You</span>
          <Zap className="w-3.5 h-3.5 text-amber-400" />
        </div>

        {/* Question */}
        <div className="glass rounded-3xl p-6 border border-amber-500/25"
          style={{ boxShadow: '0 0 30px rgba(245,158,11,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-semibold">{question.category}</span>
            <span className="px-2.5 py-0.5 rounded-lg bg-white/5 text-gray-500 text-xs">Final</span>
          </div>
          <p className="text-white text-xl font-bold leading-relaxed">{question.question}</p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3">
          {OPTION_LABELS.map((opt) => (
            <button
              key={opt}
              onClick={() => handleAnswer(opt)}
              disabled={answered}
              className={`w-full bg-gradient-to-r ${getOptionStyle(opt)} border rounded-2xl p-4 flex items-center gap-4 transition-all duration-200`}
            >
              <div className="w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center font-black text-white text-lg shrink-0">{opt}</div>
              <span className="text-white font-medium text-base flex-1 text-left">{question.options[opt]}</span>
              {showCorrect && opt === question.correct && <span className="text-green-300 font-black text-xl">✓</span>}
              {showCorrect && selected === opt && opt !== question.correct && <span className="text-red-300 font-black text-xl">✗</span>}
            </button>
          ))}
        </div>

        {/* Feedback */}
        {showCorrect && (
          <div className={`rounded-2xl p-4 text-center font-bold text-lg
            ${selected === question.correct
              ? 'bg-green-500/20 border border-green-500/40 text-green-400'
              : 'bg-red-500/20 border border-red-500/40 text-red-400'
            }`}>
            {selected === question.correct
              ? '✅ Correct! +1 point'
              : selected === null
              ? `⏰ Time's up! Correct: ${question.correct}`
              : `❌ Wrong! Correct: ${question.correct}`
            }
          </div>
        )}

        {/* Prize ladder */}
        <div className="glass rounded-2xl px-4 py-3 border border-white/5">
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {PRIZE_LADDER.map(({ min, prize }) => (
              <div key={min}
                className={`shrink-0 text-center px-3 py-2 rounded-xl text-xs transition-all
                  ${finalScore >= min
                    ? 'bg-amber-500/30 border border-amber-500/60 text-amber-400 font-bold'
                    : 'bg-white/5 text-gray-600 border border-transparent'
                  }`}>
                <div className="font-bold">{min}✓</div>
                <div>{prize.split(' ')[0]}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
