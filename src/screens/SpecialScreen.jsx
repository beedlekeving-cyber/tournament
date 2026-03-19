import { useState, useEffect, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { Eye, ShieldCheck, Star, Users, Gamepad2, X, CheckCircle2, XCircle, ArrowRight, RotateCcw, Clock, Trophy, Swords, Zap, Crown } from 'lucide-react';
import { playClick, playCorrect, playWrong, playTick, playUrgentTick, playWin } from '../utils/sounds';
import {
  isUsernameTaken, isDeviceEliminated, getEliminationInfo,
  getCoins, getStreak, getStreakBonus, getDeviceId,
} from '../utils/anticheat';
import { BIBLE_DEMO_QUESTIONS } from '../data/bibleQuestions';
import babaapete from '../assets/babaapete.jpeg';
import SplashScreen from './SplashScreen';
import socket from '../utils/socket';
import { registerUser, fetchUserCount, fetchTournamentSchedule } from '../utils/api';

// Demo Quiz Component - uses Bible questions for practice
function DemoQuiz({ onClose, questions }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(9);
  const [demoComplete, setDemoComplete] = useState(false);

  // Shuffle and pick 10 random questions for demo
  const demoQuestions = useMemo(() => {
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10).map(q => ({
      question: q.question,
      options: Object.values(q.options),
      correctLetter: q.correct,
      correct: Object.keys(q.options).indexOf(q.correct),
      category: q.category
    }));
  }, []);

  const q = demoQuestions[currentQ];

  // Timer countdown with sound
  useEffect(() => {
    if (showResult || demoComplete) return;
    if (timer <= 0) {
      handleAnswer(-1); // Time's up
      return;
    }
    // Play tick sounds
    if (timer <= 3) {
      playUrgentTick();
    } else {
      playTick();
    }
    const t = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, showResult, demoComplete]);

  const handleAnswer = (index) => {
    if (showResult) return;
    playClick();
    setSelected(index);
    setShowResult(true);
    if (index === q.correct) {
      playCorrect();
      setScore(s => s + 1);
    } else {
      playWrong();
    }
  };

  const nextQuestion = () => {
    playClick();
    if (currentQ < demoQuestions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelected(null);
      setShowResult(false);
      setTimer(9);
    } else {
      setDemoComplete(true);
      if (score >= 5) playWin();
    }
  };

  const restartDemo = () => {
    playClick();
    setCurrentQ(0);
    setSelected(null);
    setShowResult(false);
    setScore(0);
    setTimer(9);
    setDemoComplete(false);
  };

  // Demo complete screen
  if (demoComplete) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl p-8 text-center relative"
          style={{ background: 'rgba(10,5,30,0.95)', border: '1px solid rgba(251,191,36,0.3)', backdropFilter: 'blur(20px)' }}>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
          
          <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ background: score >= 7 ? 'linear-gradient(135deg, #22c55e, #10b981)' : score >= 5 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
            <Trophy className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-2xl font-black text-white mb-2">
            {score >= 7 ? '🏆 Excellent!' : score >= 5 ? '👍 Good Job!' : '💪 Keep Practicing!'}
          </h2>
          <p className="text-gray-400 mb-6">You scored {score} out of {demoQuestions.length}</p>
          
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {demoQuestions.map((_, i) => (
              <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i < score ? 'bg-green-500 text-white' : 'bg-red-500/50 text-red-200'
              }`}>
                {i + 1}
              </div>
            ))}
          </div>

          <div className="rounded-xl p-4 mb-6"
            style={{ background: 'linear-gradient(135deg, rgba(217,119,6,0.15), rgba(167,139,250,0.15))', border: '1px solid rgba(251,191,36,0.3)' }}>
            <p className="text-amber-300 text-sm">
              💡 In the real tournament, you'll compete 1v1 against another player. Answer faster and correctly to win!
            </p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={restartDemo}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 font-bold rounded-xl transition"
              style={{ background: 'linear-gradient(135deg, #d97706, #ec4899)', color: 'white' }}
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-3 text-white font-bold rounded-xl transition"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        {/* Close button */}
        <button onClick={onClose} className="absolute -top-12 right-0 text-gray-400 hover:text-white flex items-center gap-2">
          <span className="text-sm">Exit Demo</span>
          <X className="w-5 h-5" />
        </button>

        {/* Demo badge */}
        <div className="text-center mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-amber-400 text-sm font-bold"
            style={{ background: 'rgba(217,119,6,0.2)', border: '1px solid rgba(251,191,36,0.4)' }}>
            <Gamepad2 className="w-4 h-4" />
            DEMO MODE - Practice Round
          </span>
        </div>

        {/* Progress & Timer */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1.5">
            {demoQuestions.map((_, i) => (
              <div key={i} className={`w-6 h-1.5 rounded-full ${
                i < currentQ ? 'bg-green-500' : i === currentQ ? 'bg-amber-500' : 'bg-gray-700'
              }`} />
            ))}
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
            timer <= 3 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-amber-500/20 text-amber-400'
          }`}>
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold text-lg">{timer}s</span>
          </div>
        </div>

        {/* Score display */}
        <div className="flex items-center justify-between mb-4 text-sm">
          <span className="text-gray-400">Score: <span className="text-green-400 font-bold">{score}</span>/{currentQ + (showResult ? 1 : 0)}</span>
          <span className="text-purple-400 text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(167,139,250,0.2)' }}>
            {q.category}
          </span>
        </div>

        {/* Question Card */}
        <div className="rounded-3xl p-6 mb-4"
          style={{ background: 'rgba(10,5,30,0.9)', border: '1px solid rgba(251,191,36,0.25)', backdropFilter: 'blur(20px)' }}>
          <p className="text-amber-400 text-xs uppercase tracking-wider mb-2">Question {currentQ + 1} of {demoQuestions.length}</p>
          <h2 className="text-xl font-bold text-white leading-relaxed">{q.question}</h2>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-4">
          {q.options.map((opt, i) => {
            let bgStyle = { background: 'rgba(255,255,255,0.07)', border: '2px solid transparent' };
            if (showResult) {
              if (i === q.correct) {
                bgStyle = { background: 'rgba(34,197,94,0.2)', border: '2px solid #22c55e' };
              } else if (i === selected && i !== q.correct) {
                bgStyle = { background: 'rgba(239,68,68,0.2)', border: '2px solid #ef4444' };
              }
            } else if (selected === i) {
              bgStyle = { background: 'rgba(251,191,36,0.2)', border: '2px solid #fbbf24' };
            }

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={showResult}
                className="w-full p-4 rounded-xl text-left transition-all"
                style={bgStyle}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-white font-medium flex-1">{opt}</span>
                  {showResult && i === q.correct && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                  {showResult && i === selected && i !== q.correct && <XCircle className="w-5 h-5 text-red-400" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Result feedback */}
        {showResult && (
          <div className="rounded-xl p-4 mb-4"
            style={{ 
              background: selected === q.correct ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${selected === q.correct ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`
            }}>
            <div className="flex items-center gap-2 mb-2">
              {selected === q.correct ? (
                <><CheckCircle2 className="w-5 h-5 text-green-400" /><span className="text-green-400 font-bold">Correct! +1 point</span></>
              ) : selected === -1 ? (
                <><Clock className="w-5 h-5 text-amber-400" /><span className="text-amber-400 font-bold">Time's Up!</span></>
              ) : (
                <><XCircle className="w-5 h-5 text-red-400" /><span className="text-red-400 font-bold">Incorrect</span></>
              )}
            </div>
            <p className="text-gray-300 text-sm">The correct answer was: <span className="text-green-400 font-bold">{q.options[q.correct]}</span></p>
          </div>
        )}

        {/* Next button */}
        {showResult && (
          <button
            onClick={nextQuestion}
            className="w-full py-4 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition"
            style={{ background: 'linear-gradient(135deg, #d97706, #ec4899, #a78bfa)' }}
          >
            {currentQ < demoQuestions.length - 1 ? (
              <>Next Question <ArrowRight className="w-5 h-5" /></>
            ) : (
              <>See Results <Trophy className="w-5 h-5" /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Tournament: Live Match Component ─────────────────────────────────────────
function TournamentMatch({ questions, currentQuestionIndex, totalQuestions, opponent, round, username, matchId, bothCorrectFeedback, onAnswered }) {
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [timer, setTimer] = useState(9);
  const [opponentAnswered, setOpponentAnswered] = useState(false);
  const [bothCorrectMsg, setBothCorrectMsg] = useState(null);

  const q = questions[currentQuestionIndex];

  // Reset per question whenever the server advances the index
  useEffect(() => {
    setSelected(null);
    setShowResult(false);
    setCorrectAnswer(null);
    setTimer(9);
    setOpponentAnswered(false);
  }, [currentQuestionIndex]);

  // Show "Both correct!" banner when server signals it
  useEffect(() => {
    if (bothCorrectFeedback) {
      setBothCorrectMsg('Both correct! Next question...');
      const t = setTimeout(() => setBothCorrectMsg(null), 2000);
      return () => clearTimeout(t);
    }
  }, [bothCorrectFeedback, currentQuestionIndex]);

  // Timer countdown
  useEffect(() => {
    if (showResult) return;
    if (timer <= 0) { handleAnswer(null); return; }
    if (timer <= 3) playUrgentTick(); else playTick();
    const t = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, showResult]);

  // Listen for opponent answered signal
  useEffect(() => {
    const handler = () => setOpponentAnswered(true);
    socket.on('opponent_answered', handler);
    return () => socket.off('opponent_answered', handler);
  }, []);

  // Listen for round_result (server tells us the outcome of this question)
  useEffect(() => {
    const handler = (data) => {
      if (!data.isTournament) return;
      // Spec: { result, correctAnswer, myAnswer, opponentAnswer, matchOver }
      setCorrectAnswer(data.correctAnswer ?? null);
      setShowResult(true);
      const won = data.result === 'win' || data.myAnswer === data.correctAnswer;
      if (won) playCorrect(); else playWrong();
      // NOTE: question advancement is now handled by 'next_question' server event
      // If matchOver, parent handles phase change via tournament_round_won / tournament_eliminated
    };
    socket.on('round_result', handler);
    return () => socket.off('round_result', handler);
  }, [currentQuestionIndex]);

  const handleAnswer = (optionKey) => {
    if (showResult || selected !== null) return;
    playClick();
    setSelected(optionKey);
    onAnswered(optionKey, q?.id, matchId, timer); // pass timeLeft
    // Result will come from server via round_result
  };

  if (!q) return null;

  // Build options array from question shape
  const options = q.options
    ? (typeof q.options === 'object' && !Array.isArray(q.options)
        ? Object.entries(q.options)  // { A: '...', B: '...', ... }
        : q.options.map((opt, i) => [String.fromCharCode(65 + i), opt]))
    : [];

  // Use correctAnswer from server (round_result) if available, fall back to q.correct
  const correctKey = correctAnswer ?? q.correct;
  const displayTotal = totalQuestions || questions.length;

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, rgba(10,5,30,0.97) 0%, rgba(50,5,40,0.97) 100%)' }}>

      {/* Both correct banner */}
      {bothCorrectMsg && (
        <div className="fixed inset-x-0 top-0 z-50 flex justify-center p-4 pt-6 pointer-events-none">
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 0 30px rgba(22,163,74,0.5)' }}>
            <CheckCircle2 className="w-4 h-4 text-green-200" />
            <span className="text-white font-black text-sm">{bothCorrectMsg}</span>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(236,72,153,0.2)', border: '1px solid rgba(236,72,153,0.4)' }}>
            <Swords className="w-4 h-4 text-pink-400" />
            <span className="text-pink-300 font-bold text-sm">Round {round}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.4)' }}>
            <span className="text-purple-300 text-sm font-semibold">vs <span className="font-black text-white">{opponent?.username ?? 'Opponent'}</span></span>
          </div>
        </div>

        {/* Progress + Timer */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1.5">
            {Array.from({ length: displayTotal }).map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full flex-1 ${
                i < currentQuestionIndex ? 'bg-green-500' : i === currentQuestionIndex ? 'bg-amber-500' : 'bg-gray-700'
              }`} style={{ minWidth: '24px' }} />
            ))}
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ml-3 ${
            timer <= 3 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-amber-500/20 text-amber-400'
          }`}>
            <Clock className="w-4 h-4" />
            <span className="font-mono font-black text-lg">{timer}s</span>
          </div>
        </div>

        {/* Opponent status */}
        {opponentAnswered && (
          <div className="text-center mb-3">
            <span className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa' }}>
              ✓ {opponent?.username ?? 'Opponent'} answered
            </span>
          </div>
        )}

        {/* Question Card */}
        <div className="rounded-3xl p-6 mb-4"
          style={{ background: 'rgba(10,5,30,0.9)', border: '1px solid rgba(251,191,36,0.25)', backdropFilter: 'blur(20px)' }}>
          <p className="text-amber-400 text-xs uppercase tracking-wider mb-2">Question {currentQuestionIndex + 1} of {displayTotal}</p>
          <h2 className="text-lg font-bold text-white leading-relaxed">{q.question}</h2>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {options.map(([key, text]) => {
            let style = { background: 'rgba(255,255,255,0.07)', border: '2px solid transparent' };
            if (showResult) {
              if (key === correctKey) style = { background: 'rgba(34,197,94,0.2)', border: '2px solid #22c55e' };
              else if (key === selected) style = { background: 'rgba(239,68,68,0.2)', border: '2px solid #ef4444' };
            } else if (key === selected) {
              style = { background: 'rgba(251,191,36,0.2)', border: '2px solid #fbbf24' };
            }
            return (
              <button key={key}
                onClick={() => handleAnswer(key)}
                disabled={!!selected || showResult}
                className="w-full p-4 rounded-xl text-left transition-all"
                style={style}>
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>{key}</span>
                  <span className="text-white font-medium flex-1">{text}</span>
                  {showResult && key === correctKey && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                  {showResult && key === selected && key !== correctKey && <XCircle className="w-5 h-5 text-red-400" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Tournament: Countdown Warning Overlay ─────────────────────────────────────
function TournamentCountdownBanner({ message }) {
  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center p-4 pt-6 pointer-events-none">
      <div className="flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl animate-bounce"
        style={{ background: 'linear-gradient(135deg, #d97706, #ec4899)', boxShadow: '0 0 40px rgba(217,119,6,0.6)' }}>
        <Zap className="w-5 h-5 text-white" />
        <span className="text-white font-black text-sm">{message}</span>
        <Zap className="w-5 h-5 text-white" />
      </div>
    </div>
  );
}

// ── Tournament: Waiting for Match ─────────────────────────────────────────────
function TournamentWaitingMatch({ round }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, rgba(10,5,30,0.97) 0%, rgba(30,5,60,0.97) 100%)' }}>
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center animate-pulse"
          style={{ background: 'linear-gradient(135deg, #d97706, #a78bfa)', boxShadow: '0 0 50px rgba(217,119,6,0.5)' }}>
          <Swords className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-black text-white mb-2">Round {round}</h2>
        <p className="text-amber-400 font-semibold text-lg mb-2">Finding your opponent…</p>
        <p className="text-gray-400 text-sm">You will be matched automatically</p>
        <div className="flex justify-center gap-2 mt-6">
          {[0,1,2].map(i => (
            <div key={i} className="w-3 h-3 rounded-full bg-amber-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tournament: Round Won overlay ─────────────────────────────────────────────
function TournamentRoundWon({ round }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, rgba(5,20,10,0.97) 0%, rgba(10,40,20,0.97) 100%)' }}>
      <div className="text-center">
        <div className="w-28 h-28 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)', boxShadow: '0 0 60px rgba(34,197,94,0.6)' }}>
          <CheckCircle2 className="w-14 h-14 text-white" />
        </div>
        <h2 className="text-4xl font-black text-green-400 mb-2">You Won!</h2>
        <p className="text-white text-lg mb-6">Advancing to Round {round}…</p>
        <div className="flex justify-center gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-3 h-3 rounded-full bg-green-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tournament: Eliminated overlay ────────────────────────────────────────────
function TournamentEliminated({ username }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, rgba(30,5,5,0.97) 0%, rgba(60,10,10,0.97) 100%)' }}>
      <div className="text-center w-full max-w-sm">
        <div className="w-28 h-28 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 60px rgba(239,68,68,0.6)' }}>
          <XCircle className="w-14 h-14 text-white" />
        </div>
        <h2 className="text-4xl font-black text-red-400 mb-2">Eliminated!</h2>
        <p className="text-gray-300 mb-2">Better luck next time, <span className="text-white font-bold">{username}</span>!</p>
        <p className="text-gray-500 text-sm mb-8">You answered incorrectly and have been evicted from the tournament.</p>
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <p className="text-red-300 text-sm">🎉 Thanks for participating! Watch the leaderboard for the final champion.</p>
        </div>
      </div>
    </div>
  );
}

// ── Tournament: Champion overlay ──────────────────────────────────────────────
function TournamentChampion({ username }) {
  useEffect(() => { playWin(); }, []);
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, rgba(10,8,0,0.97) 0%, rgba(40,20,0,0.97) 100%)' }}>
      <div className="text-center w-full max-w-sm">
        {/* Glow ring */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="absolute w-36 h-36 rounded-full animate-ping"
            style={{ background: 'rgba(251,191,36,0.2)' }} />
          <div className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', boxShadow: '0 0 80px rgba(251,191,36,0.8)' }}>
            <Crown className="w-14 h-14 text-white" />
          </div>
        </div>
        <h2 className="text-5xl font-black mb-3"
          style={{ background: 'linear-gradient(135deg,#fbbf24,#fde68a,#f59e0b)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', filter:'drop-shadow(0 0 20px rgba(251,191,36,0.8))' }}>
          CHAMPION!
        </h2>
        <p className="text-amber-200 text-xl font-bold mb-2">🏆 Congratulations, {username}!</p>
        <p className="text-gray-400 mb-8">You are the last player standing!</p>
        <div className="rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(217,119,6,0.15))', border: '1px solid rgba(251,191,36,0.4)' }}>
          <p className="text-amber-300 font-bold text-lg mb-1">💰 Grand Prize: ₦20,000</p>
          <p className="text-gray-300 text-sm">Contact the tournament admin to claim your prize.</p>
        </div>
      </div>
    </div>
  );
}

export default function SpecialScreen() {
  const { joinLobby, state, dispatch, submitTournamentAnswer } = useGame();
  const tournament = state.tournament;
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const [coins, setCoins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [eliminated, setEliminated] = useState(false);
  const [elimInfo, setElimInfo] = useState(null);
  const [ssInfo, setSsInfo] = useState(null);
  const [showSplash, setShowSplash] = useState(true);
  const [lobbyCount, setLobbyCount] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [showDemo, setShowDemo] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredUsername, setRegisteredUsername] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [tournamentSchedule, setTournamentSchedule] = useState(null);

  // Check if special session is active from GameContext
  const specialActive = state.specialSessionActive;

  // Tick every second when there's a scheduled start
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Backend schedule takes priority; fall back to locally cached ssInfo
  const rawScheduledDate = tournamentSchedule?.scheduledDate ?? ssInfo?.scheduledStart ?? null;
  const scheduledStart = rawScheduledDate ? new Date(rawScheduledDate).getTime() : null;
  // Always compute msLeft live from scheduledStart so the 1-second ticker drives it
  const msLeft = scheduledStart ? Math.max(0, scheduledStart - now) : 0;
  const registrationOpen  = tournamentSchedule?.registrationOpen  ?? false;
  // Server is the authority: use REST poll flags OR the live socket tournament phase
  const isTimeToStart     = tournamentSchedule?.isTimeToStart      ?? false;
  const tournamentStarted = (tournamentSchedule?.tournamentStarted ?? false)
                            || tournament.phase !== 'idle';
  // "Ended" means the server confirmed the tournament ran. Never derive from clock alone.
  const tournamentEnded   = false; // server pushes tournament_started — we don't guess from time
  const isLocked = scheduledStart && now < scheduledStart;
  const oneHourBeforeStart = scheduledStart ? scheduledStart - 3600000 : 0;
  const demoDisabled = scheduledStart && now >= oneHourBeforeStart;

  const formatCountdown = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (d > 0) return `${d}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
    if (h > 0) return `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
    return `${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
  };

  useEffect(() => {
    setCoins(getCoins());
    setStreak(getStreak());
    const stillEliminated = isDeviceEliminated();
    const info = getEliminationInfo();
    if (stillEliminated && info) {
      setEliminated(true);
      setElimInfo(info);
    } else {
      setEliminated(false);
      setElimInfo(null);
    }

    // Connect socket immediately so we receive tournament_started /
    // tournament_countdown events even before the user clicks Join
    const deviceId = getDeviceId();
    if (!socket.connected) socket.connect();
    socket.emit('register_device', { deviceId, sessionToken: null });

    // Check if this device already has a registered user
    const checkJoinStatus = async () => {
      try {
        const stored = JSON.parse(localStorage.getItem('qd_registered_user') || 'null');
        if (stored?.username) {
          setHasJoined(true);
          setUsername(stored.username);
          // Re-register with socket so server knows we're online
          socket.emit('join_lobby', {
            deviceId,
            username: stored.username,
            isSpecialSession: true,
            isTournament: true,
          });
          return;
        }
      } catch (_) {}
    };
    checkJoinStatus();
    
    try {
      const ss = JSON.parse(localStorage.getItem('qd_special_session') || 'null');
      if (ss?.active) setSsInfo(ss);
      
      const currentSessionId = ss?.sessionId || 'default';
      
      // Check if user already registered
      const regData = JSON.parse(localStorage.getItem('qd_registered_user') || 'null');
      if (regData?.username && regData?.sessionId === currentSessionId) {
        setRegistered(true);
        setRegisteredUsername(regData.username);
      }
    } catch (_) {}
  }, []);

  // Listen for lobby count from socket
  useEffect(() => {
    const onLobbyCount = ({ count }) => setLobbyCount(count);
    socket.on('lobby_count', onLobbyCount);
    return () => socket.off('lobby_count', onLobbyCount);
  }, []);

  // Poll GET /api/users/count so the number stays accurate
  useEffect(() => {
    const load = () => fetchUserCount().then(setLobbyCount).catch(() => {});
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch tournament schedule from backend and keep it fresh
  useEffect(() => {
    const load = () => fetchTournamentSchedule()
      .then(data => {
        setTournamentSchedule({ ...data, _fetchedAt: Date.now() });
        if (data.registeredCount != null) setLobbyCount(data.registeredCount);
      })
      .catch(() => {});
    // Fetch immediately on mount, then again once the splash is dismissed,
    // and keep refreshing every 30 s
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  // Re-fetch schedule as soon as the splash screen is dismissed
  useEffect(() => {
    if (showSplash) return;
    fetchTournamentSchedule()
      .then(data => {
        setTournamentSchedule({ ...data, _fetchedAt: Date.now() });
        if (data.registeredCount != null) setLobbyCount(data.registeredCount);
      })
      .catch(() => {});
  }, [showSplash]);

  // If the REST poll tells us the tournament is already running but our local
  // phase is still idle, show the "waiting for match" screen. The server will
  // push match_found when it's ready — we don't re-emit join_lobby here because
  // the server auto-pairs all registered players at start time.
  useEffect(() => {
    if (!tournamentSchedule) return;
    if (tournament.phase !== 'idle') return; // already in a live phase
    const alreadyRunning = tournamentSchedule.tournamentStarted || tournamentSchedule.isTimeToStart;
    if (!alreadyRunning) return;
    const storedUser = (() => {
      try { return JSON.parse(localStorage.getItem('qd_registered_user') || 'null'); } catch (_) { return null; }
    })();
    if (!storedUser?.username) return; // not registered, nothing to show
    // Show waiting screen — server will push match_found when the round is ready
    dispatch({ type: 'TOURNAMENT_STARTED' });
  }, [tournamentSchedule, tournament.phase]);

  const streakBonus = getStreakBonus(streak);

  const getTimeLeft = () => {
    if (!elimInfo) return '';
    const ms = 3600000 - (Date.now() - elimInfo.time);
    if (ms <= 0) return '';
    return `(${Math.floor(ms / 60000)} min remaining)`;
  };

  const handleRegister = () => {
    const trimmed = username.trim();
    if (!trimmed) { setError('Please enter a username'); return; }
    if (trimmed.length < 3) { setError('Username must be at least 3 characters'); return; }
    if (trimmed.length > 20) { setError('Username must be 20 characters or less'); return; }
    if (isDeviceEliminated()) { setError('⛔ Your device is evicted. Wait for the next tournament.'); return; }
    if (isUsernameTaken(trimmed)) { setError('Username already taken — choose another.'); return; }
    playClick();
    // Save registration locally
    localStorage.setItem('qd_registered_user', JSON.stringify({
      username: trimmed,
      sessionId: ssInfo?.sessionId || 'default',
      registeredAt: Date.now()
    }));
    setRegistered(true);
    setRegisteredUsername(trimmed);
  };

  const handleJoin = async () => {
    const trimmed = username.trim();
    if (!trimmed) { setError('Please enter a username'); return; }
    if (trimmed.length < 3) { setError('Username must be at least 3 characters'); return; }
    if (trimmed.length > 20) { setError('Username must be 20 characters or less'); return; }
    if (isDeviceEliminated()) { setError('⛔ Your device is evicted. Wait for the next tournament.'); return; }
    if (isUsernameTaken(trimmed)) { setError('Username already taken — choose another.'); return; }
    playClick();
    setJoining(true);
    setJoinError('');
    try {
      const deviceId = getDeviceId();
      const data = await registerUser(trimmed, deviceId);
      // Use the username the server confirmed
      const confirmedUsername = data?.user?.username || trimmed;
      setUsername(confirmedUsername);
      // Persist so returning users are recognised on page reload
      localStorage.setItem('qd_registered_user', JSON.stringify({
        username: confirmedUsername,
        sessionId: ssInfo?.sessionId || 'default',
        registeredAt: Date.now(),
      }));
      setHasJoined(true);
      // Connect socket and register with the server for the tournament queue.
      // Do NOT call joinLobby() — that starts a bot-fallback timer and uses
      // the regular (non-tournament) queue. Instead emit directly so the server
      // places this player in the tournament waiting list.
      if (!socket.connected) socket.connect();
      socket.emit('register_device', { deviceId, sessionToken: null });
      socket.emit('join_lobby', {
        deviceId,
        username: confirmedUsername,
        isSpecialSession: true,
        isTournament: true,
      });
    } catch (err) {
      setJoinError(err.message || 'Failed to join. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') isLocked ? handleRegister() : handleJoin(); };
  const qCount = ssInfo?.questions?.length ?? 0;
  const need = Math.max(0, 10 - lobbyCount);

  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />;

  // ─── TOURNAMENT LIVE PHASES ───────────────────────────────────────────────
  // Champion
  if (tournament.phase === 'champion') {
    return <TournamentChampion username={username || state.username} />;
  }

  // Eliminated
  if (tournament.phase === 'eliminated') {
    return <TournamentEliminated username={username || state.username} />;
  }

  // Active match
  if (tournament.phase === 'in_match' && tournament.matchQuestions.length > 0) {
    return (
      <>
        {tournament.countdownWarning && <TournamentCountdownBanner message={tournament.countdownWarning} />}
        <TournamentMatch
          questions={tournament.matchQuestions}
          currentQuestionIndex={tournament.currentQuestionIndex}
          totalQuestions={tournament.totalQuestions}
          bothCorrectFeedback={tournament.bothCorrectFeedback}
          opponent={tournament.opponent}
          round={tournament.round}
          username={username || state.username}
          matchId={tournament.matchId}
          onAnswered={(answer, questionId, matchId, timeLeft) => submitTournamentAnswer(answer, questionId, matchId, timeLeft)}
        />
      </>
    );
  }

  // Round won — waiting for next round
  if (tournament.phase === 'round_won') {
    return <TournamentRoundWon round={tournament.round} />;
  }

  // Waiting to be paired
  if (tournament.phase === 'waiting_match') {
    return (
      <>
        {tournament.countdownWarning && <TournamentCountdownBanner message={tournament.countdownWarning} />}
        <TournamentWaitingMatch round={tournament.round} />
      </>
    );
  }

  // ─── SPECIAL SESSION NOT ACTIVE ───
  if (!specialActive) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        {/* Stars background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(150)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                opacity: Math.random() * 0.7 + 0.3,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
          <div className="bg-white/10 backdrop-blur-md border-2 border-yellow-400/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="mb-6">
              <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-yellow-400/50 shadow-xl">
                <img src={babaapete} alt="Prophet Emmanuel" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-3xl font-bold text-yellow-400 mb-2">Bible Quiz Tournament</h1>
              <p className="text-white/80">Prophet Emmanuel Oluwole Adewale's 71st Birthday</p>
            </div>

            <div className="bg-red-500/20 border-2 border-red-400/50 rounded-xl p-6 mb-4">
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white mb-2">Session Not Active</h2>
              <p className="text-white/80 text-sm">
                The Bible Quiz tournament has not been activated yet.
                Please check back later or contact the administrator.
              </p>
            </div>

            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              Go to Normal Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── REGISTERED & WAITING FOR COUNTDOWN ───
  if (isLocked && registered) {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${babaapete})` }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(10,5,30,0.75) 0%, rgba(80,10,60,0.65) 45%, rgba(10,5,30,0.80) 100%)' }} />
        
        {/* Animated particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute rounded-full animate-ping"
              style={{
                width: `${3 + (i % 4)}px`, height: `${3 + (i % 4)}px`,
                left: `${(i * 41) % 100}%`, top: `${(i * 67) % 100}%`,
                background: i % 2 === 0 ? 'rgba(251,191,36,0.4)' : 'rgba(34,197,94,0.35)',
                animationDuration: `${2 + (i % 3)}s`, animationDelay: `${(i % 5) * 0.3}s`,
              }} />
          ))}
        </div>

        <div className="relative z-10 w-full max-w-md text-center">
          {/* Success checkmark */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)', boxShadow: '0 0 40px rgba(34,197,94,0.5)' }}>
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-3xl font-black text-white mb-2">You're Registered!</h1>
          <p className="text-gray-300 mb-2">Welcome, <span className="text-green-400 font-bold">{registeredUsername}</span></p>
          <p className="text-gray-500 text-sm mb-8">Get ready for the tournament</p>

          {/* Countdown */}
          <div className="rounded-3xl p-8 mb-6"
            style={{ background: 'rgba(10,5,30,0.85)', border: '1px solid rgba(251,191,36,0.3)', backdropFilter: 'blur(20px)' }}>
            <p className="text-amber-400 font-semibold text-xs uppercase tracking-widest mb-3">Tournament starts in</p>
            <p className="text-5xl font-black tracking-wider mb-4" style={{
              background: 'linear-gradient(135deg,#fbbf24,#ec4899)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
              filter:'drop-shadow(0 0 16px rgba(251,191,36,0.6))',
            }}>{formatCountdown(msLeft)}</p>
            <p className="text-gray-400 text-sm">
              {new Date(scheduledStart).toLocaleString('en-US', {
                weekday:'long', month:'long', day:'numeric',
                hour:'2-digit', minute:'2-digit',
              })}
            </p>
          </div>

          {/* Players waiting */}
          <div className="rounded-2xl p-4 mb-6"
            style={{ background: 'rgba(30,10,60,0.6)', border: '1px solid rgba(167,139,250,0.3)', backdropFilter: 'blur(12px)' }}>
            <div className="flex items-center justify-center gap-3">
              <Users className="w-5 h-5 text-purple-400" />
              <span className="text-purple-200 font-bold">{lobbyCount} players</span>
              <span className="text-gray-500">registered</span>
            </div>
          </div>

          {/* Demo button - prominent */}
          <button
            onClick={() => setShowDemo(true)}
            className="w-full py-5 rounded-2xl font-bold text-white transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 mb-4"
            style={{
              background: 'linear-gradient(135deg, #d97706, #ec4899, #a78bfa)',
              boxShadow: '0 0 30px rgba(217,119,6,0.4), 0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            <Gamepad2 className="w-6 h-6" />
            <span>Practice While You Wait</span>
          </button>

          <p className="text-gray-500 text-xs">
            💡 Practice with demo questions to get ready for the real match!
          </p>
        </div>

        {/* Demo Quiz Modal */}
        {showDemo && <DemoQuiz onClose={() => setShowDemo(false)} questions={BIBLE_DEMO_QUESTIONS} />}
      </div>
    );
  }

  // ─── LOCKED STATE: REGISTRATION OPEN (show join + demo only) ───
  if (isLocked && !registered) {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${babaapete})` }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(10,5,30,0.70) 0%, rgba(80,10,60,0.60) 45%, rgba(10,5,30,0.75) 100%)' }} />
        
        {/* Animated particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(14)].map((_, i) => (
            <div key={i} className="absolute rounded-full animate-ping"
              style={{
                width: `${3 + (i % 4)}px`, height: `${3 + (i % 4)}px`,
                left: `${(i * 41) % 100}%`, top: `${(i * 67) % 100}%`,
                background: i % 2 === 0 ? 'rgba(251,191,36,0.4)' : 'rgba(236,72,153,0.35)',
                animationDuration: `${2 + (i % 3)}s`, animationDelay: `${(i % 5) * 0.3}s`,
              }} />
          ))}
        </div>

        <div className="relative z-10 w-full max-w-md">
          {/* Hero header */}
          <div className="text-center mb-6">
            <div className="inline-block mb-4 relative">
              <div className="absolute inset-0 rounded-full" style={{
                background: 'conic-gradient(from 0deg, #f59e0b, #ec4899, #a78bfa, #f59e0b)',
                borderRadius: '50%', margin: '-4px', animation: 'spin 5s linear infinite',
              }} />
              <img src={babaapete} alt="Baba Apete" className="relative rounded-full object-cover"
                style={{ width: '100px', height: '100px', border: '3px solid #000', boxShadow: '0 0 40px rgba(251,191,36,0.55)', zIndex: 2 }} />
            </div>
            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

            <p className="font-black text-xl leading-snug tracking-wide" style={{
              background: 'linear-gradient(135deg, #fbbf24, #fde68a, #f59e0b)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>71st Birthday Quiz Tournament</p>
            
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-amber-300 text-sm font-medium">Registration Open</span>
            </div>
          </div>

          {/* Countdown info */}
          <div className="rounded-2xl p-4 mb-5 text-center"
            style={{ background: 'rgba(30,10,60,0.80)', border: '1px solid rgba(167,139,250,0.35)', backdropFilter: 'blur(12px)' }}>
            <p className="text-purple-300 font-semibold text-xs uppercase tracking-widest mb-1">Tournament starts in</p>
            <p className="text-3xl font-black tracking-wider" style={{
              background: 'linear-gradient(135deg,#fbbf24,#ec4899)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            }}>{formatCountdown(msLeft)}</p>
          </div>

          {/* Elimination banner */}
          {eliminated && (
            <div className="mb-5 p-4 rounded-2xl"
              style={{ background: 'rgba(127,29,29,0.55)', border: '1px solid rgba(239,68,68,0.4)', backdropFilter: 'blur(8px)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">⛔</span>
                <p className="text-red-300 font-bold text-sm">Evicted {getTimeLeft()}</p>
              </div>
              <p className="text-gray-300/80 text-xs leading-relaxed">
                {elimInfo?.username ? `"${elimInfo.username}" was evicted. ` : ''}
                You cannot register until the admin opens the next tournament.
              </p>
            </div>
          )}

          {/* Registration card */}
          <div className="rounded-3xl p-7 shadow-2xl mb-5"
            style={{
              background: 'rgba(10,5,30,0.85)',
              border: '1px solid rgba(251,191,36,0.25)',
              backdropFilter: 'blur(20px)',
            }}>
            <h2 className="text-xl font-bold text-white mb-5 text-center">📝 Register for Tournament</h2>

            <div className="relative mb-4">
              <input
                type="text"
                value={username}
                disabled={eliminated}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                onKeyDown={handleKey}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Choose your username"
                maxLength={20}
                className={`w-full rounded-2xl px-5 py-4 text-white text-lg outline-none transition-all duration-300 placeholder-gray-500
                  ${eliminated ? 'opacity-40 cursor-not-allowed' : ''}`}
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: `2px solid ${error ? 'rgba(239,68,68,0.7)' : focused ? 'rgba(251,191,36,0.7)' : 'rgba(255,255,255,0.13)'}`,
                  boxShadow: focused ? '0 0 20px rgba(251,191,36,0.25)' : 'none',
                }}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{username.length}/20</div>
            </div>

            {error && (
              <p className="text-red-300 text-sm mb-4 flex items-center gap-2"><span>⚠️</span>{error}</p>
            )}

            <button
              onClick={handleRegister}
              disabled={eliminated}
              className={`w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-95 shadow-xl
                ${eliminated ? 'opacity-40 cursor-not-allowed' : ''}`}
              style={!eliminated ? {
                background: 'linear-gradient(135deg, #22c55e, #10b981)',
                boxShadow: '0 0 30px rgba(34,197,94,0.4), 0 4px 20px rgba(0,0,0,0.5)',
              } : { background: '#374151' }}
            >
              ✅ Register Now
            </button>

            <p className="text-gray-500 text-xs text-center mt-3">
              Register now to secure your spot. Match starts when countdown ends.
            </p>
          </div>

          {/* Demo button */}
          <button
            onClick={() => setShowDemo(true)}
            className="w-full py-5 rounded-2xl font-bold text-white transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(217,119,6,0.4), rgba(167,139,250,0.4))',
              border: '1px solid rgba(251,191,36,0.4)',
            }}
          >
            <Gamepad2 className="w-6 h-6 text-amber-400" />
            <span className="text-amber-300">Try Demo Quiz</span>
            <span className="text-xs text-gray-400 bg-black/30 px-2 py-0.5 rounded-full">Practice</span>
          </button>

          <p className="text-gray-500 text-xs text-center mt-3">
            💡 Practice with real tournament questions while you wait!
          </p>
        </div>

        {/* Demo Quiz Modal */}
        {showDemo && <DemoQuiz onClose={() => setShowDemo(false)} questions={BIBLE_DEMO_QUESTIONS} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden">

      {/* ── Full-bleed background photo ── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${babaapete})` }}
      />

      {/* ── Multi-layer overlay for readability + beauty ── */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(160deg, rgba(10,5,30,0.60) 0%, rgba(80,10,60,0.52) 45%, rgba(10,5,30,0.70) 100%)',
      }} />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(217,119,6,0.12) 0%, transparent 65%)',
      }} />

      {/* Animated particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(14)].map((_, i) => (
          <div key={i} className="absolute rounded-full animate-ping"
            style={{
              width: `${3 + (i % 4)}px`, height: `${3 + (i % 4)}px`,
              left: `${(i * 41) % 100}%`, top: `${(i * 67) % 100}%`,
              background: i % 2 === 0 ? 'rgba(251,191,36,0.4)' : 'rgba(236,72,153,0.35)',
              animationDuration: `${2 + (i % 3)}s`, animationDelay: `${(i % 5) * 0.3}s`,
            }} />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(217,119,6,0.22)', border: '1px solid rgba(251,191,36,0.4)', backdropFilter: 'blur(8px)' }}>
            <span className="text-lg">🪙</span>
            <span className="font-black text-sm" style={{ color: '#fbbf24' }}>{coins}</span>
          </div>
          {streakBonus ? (
            <span className={`text-xs font-black px-3 py-1.5 rounded-xl ${streakBonus.color}`}
              style={{ background: 'rgba(234,88,12,0.25)', border: '1px solid rgba(234,88,12,0.4)', backdropFilter: 'blur(8px)' }}>
              {streakBonus.label}
            </span>
          ) : <span />}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(30,0,60,0.55)', border: '1px solid rgba(167,139,250,0.35)', backdropFilter: 'blur(8px)' }}>
            <Eye className="w-3.5 h-3.5 text-purple-300" />
            <span className="text-purple-200 font-bold text-xs">{state.spectators || 148} watching</span>
          </div>
        </div>

        {/* ── Hero header ── */}
        <div className="text-center mb-6">
          {/* Portrait photo */}
          <div className="inline-block mb-4 relative">
            <div className="absolute inset-0 rounded-full animate-ping"
              style={{ background: 'rgba(251,191,36,0.25)', borderRadius: '50%', margin: '-6px' }} />
            <div className="absolute inset-0 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, #f59e0b, #ec4899, #a78bfa, #f59e0b)',
                borderRadius: '50%', margin: '-4px',
                animation: 'spin 5s linear infinite',
              }} />
            <img
              src={babaapete}
              alt="Baba Apete"
              className="relative rounded-full object-cover"
              style={{
                width: '100px', height: '100px',
                border: '3px solid #000',
                boxShadow: '0 0 40px rgba(251,191,36,0.55), 0 0 70px rgba(236,72,153,0.35)',
                zIndex: 2,
              }}
            />
          </div>
          <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

          <p className="font-black text-xl leading-snug tracking-wide" style={{
            background: 'linear-gradient(135deg, #fbbf24, #fde68a, #f59e0b)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            filter: 'drop-shadow(0 0 16px rgba(251,191,36,0.7))',
          }}>PROPHET EMMANUEL OLUWOLE ADEWALE</p>
          <p className="font-semibold text-base italic mt-0.5" style={{
            background: 'linear-gradient(135deg, #fbbf24, #fde68a)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            filter: 'drop-shadow(0 0 10px rgba(251,191,36,0.5))',
          }}>(Aka BABA APETE)</p>
          <p className="font-black text-xl tracking-widest uppercase mt-1" style={{
            background: 'linear-gradient(135deg, #ec4899, #a78bfa)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            filter: 'drop-shadow(0 0 12px rgba(236,72,153,0.6))',
          }}>71st Birthday Quiz Tournament</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-300 text-sm font-medium">Live Now</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-300" />
              <span className="text-blue-200 text-xs font-medium">Anti-Cheat Active</span>
            </div>
          </div>
        </div>

        {/* ── Countdown / Players needed ── */}
        <div className="rounded-2xl p-4 mb-5"
          style={{ background: 'rgba(15,5,40,0.72)', border: '1px solid rgba(167,139,250,0.3)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center justify-between">
            <p className="text-purple-200 font-bold text-sm">Players in Lobby</p>
            <div className="text-right">
              <span className="text-2xl font-black" style={{ color: '#a78bfa' }}>{lobbyCount}</span>
              <span className="text-gray-400 text-sm"> players</span>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (lobbyCount / 10) * 100)}%`,
                background: 'linear-gradient(to right, #a78bfa, #ec4899)',
                boxShadow: '0 0 8px rgba(167,139,250,0.6)',
              }} />
          </div>
        </div>
        {/* ── Elimination banner ── */}
        {eliminated && (
          <div className="mb-5 p-4 rounded-2xl"
            style={{ background: 'rgba(127,29,29,0.55)', border: '1px solid rgba(239,68,68,0.4)', backdropFilter: 'blur(8px)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">⛔</span>
              <p className="text-red-300 font-bold text-sm">Evicted {getTimeLeft()}</p>
            </div>
            <p className="text-gray-300/80 text-xs leading-relaxed">
              {elimInfo?.username ? `"${elimInfo.username}" was evicted. ` : ''}
              You cannot rejoin until the admin opens the next tournament.
            </p>
          </div>
        )}

        {/* ── Join card ── */}
        <div className="rounded-3xl p-7 shadow-2xl"
          style={{
            background: 'rgba(10,5,30,0.78)',
            border: '1px solid rgba(251,191,36,0.25)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(251,191,36,0.1)',
          }}>
          <h2 className="text-xl font-bold text-white mb-5 text-center">🎯 Enter the Special Arena</h2>

          {tournamentEnded ? (
            /* ── Tournament Ended ── */
            <div className="text-center py-4">
              <div className="relative inline-flex items-center justify-center mb-5">
                <div className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.35)' }}>
                  <Trophy className="w-12 h-12 text-red-400" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Tournament Ended</h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                This tournament has concluded.<br />Thank you for participating!
              </p>
              <div className="rounded-2xl p-4 mb-4"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <p className="text-red-300 text-xs font-semibold uppercase tracking-widest mb-1">Tournament Date</p>
                <p className="text-white font-bold text-sm">
                  {tournamentSchedule?.scheduledDateFormatted
                    ?? (scheduledStart ? new Date(scheduledStart).toLocaleString('en-US', {
                        weekday: 'long', year: 'numeric', month: 'long',
                        day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
                      }) : '—')}
                </p>
                {tournamentSchedule?.registeredCount != null && (
                  <p className="text-gray-400 text-xs mt-2">
                    👥 {tournamentSchedule.registeredCount} players participated
                  </p>
                )}
              </div>
              <p className="text-gray-500 text-xs">
                Stay tuned for the next tournament announcement! 🎉
              </p>
            </div>

          ) : hasJoined ? (
            /* ── Already joined + countdown ── */
            <div className="text-center">
              <div className="bg-green-500/20 border-2 border-green-400/50 rounded-xl p-6 mb-4">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white mb-2">✅ Already Joined!</h3>
                <p className="text-green-300 font-medium mb-1">Welcome, {username}!</p>
                <p className="text-white/70 text-sm">You're registered for the tournament</p>
              </div>

              {scheduledStart && (
                <div className="bg-blue-500/20 border-2 border-blue-400/50 rounded-xl p-5 mb-4">
                  <Clock className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                  <h4 className="text-lg font-bold text-white mb-1">📅 Tournament Starts</h4>
                  <p className="text-blue-300 font-semibold text-sm mb-3">
                    {tournamentSchedule?.scheduledDateFormatted
                      ?? new Date(scheduledStart).toLocaleString('en-US', {
                          weekday: 'long', year: 'numeric', month: 'long',
                          day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
                        })}
                  </p>

                  {/* Status badges */}
                  <div className="flex justify-center gap-2 mb-4 flex-wrap">
                    {registrationOpen && !tournamentStarted && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 border border-amber-400/40 text-amber-300">
                        📝 Registration Open
                      </span>
                    )}
                    {tournamentStarted && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 border border-green-400/40 text-green-300">
                        ● Live
                      </span>
                    )}
                    {tournamentSchedule?.registeredCount != null && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 border border-purple-400/40 text-purple-300">
                        👥 {tournamentSchedule.registeredCount} registered
                      </span>
                    )}
                  </div>

                  {tournamentStarted || isTimeToStart ? (
                    <div className="bg-green-500/20 border border-green-400/40 rounded-xl px-4 py-3">
                      <p className="text-green-400 font-black text-lg">🚀 Tournament is Live!</p>
                    </div>
                  ) : msLeft > 0 ? (
                    <>
                      <p className="text-white/60 text-xs uppercase tracking-widest mb-2">Starts in</p>
                      {(() => {
                        const totalSec = Math.floor(msLeft / 1000);
                        const dd = Math.floor(totalSec / 86400);
                        const hh = Math.floor((totalSec % 86400) / 3600);
                        const mm = Math.floor((totalSec % 3600) / 60);
                        const ss = totalSec % 60;
                        const parts = dd > 0
                          ? [{ v: dd, l: 'Days' }, { v: hh, l: 'Hours' }, { v: mm, l: 'Min' }, { v: ss, l: 'Sec' }]
                          : [{ v: hh, l: 'Hours' }, { v: mm, l: 'Min' }, { v: ss, l: 'Sec' }];
                        return (
                          <div className="flex justify-center gap-2">
                            {parts.map(({ v, l }, i) => (
                              <div key={l} className="flex items-center gap-2">
                                <div className="flex flex-col items-center">
                                  <div className="bg-amber-500/20 border border-amber-400/40 rounded-xl px-3 py-2 min-w-[52px]">
                                    <span className="text-amber-400 font-black text-2xl tabular-nums">
                                      {String(v).padStart(2, '0')}
                                    </span>
                                  </div>
                                  <span className="text-white/40 text-xs mt-1">{l}</span>
                                </div>
                                {i < parts.length - 1 && (
                                  <span className="text-amber-400 font-black text-2xl mb-4">:</span>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </>
                  ) : null}
                </div>
              )}

              <p className="text-gray-400 text-sm">
                The tournament will begin at the scheduled time. Stay tuned! 🎮
              </p>
            </div>
          ) : (
            <>
              <div className="relative mb-4">
                <input
                  type="text"
                  value={username}
                  disabled={eliminated}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  onKeyDown={handleKey}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Choose your username"
                  maxLength={20}
                  className={`w-full rounded-2xl px-5 py-4 text-white text-lg outline-none transition-all duration-300 placeholder-gray-500
                    ${eliminated ? 'opacity-40 cursor-not-allowed' : ''}`}
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: `2px solid ${error ? 'rgba(239,68,68,0.7)' : focused ? 'rgba(251,191,36,0.7)' : 'rgba(255,255,255,0.13)'}`,
                    boxShadow: focused ? '0 0 20px rgba(251,191,36,0.25)' : 'none',
                  }}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{username.length}/20</div>
              </div>

              {error && (
                <p className="text-red-300 text-sm mb-4 flex items-center gap-2"><span>⚠️</span>{error}</p>
              )}

              {joinError && (
                <p className="text-red-400 text-sm mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2"><span>❌</span>{joinError}</p>
              )}

              <button
                onClick={handleJoin}
                disabled={eliminated || joining}
                className={`w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-95 shadow-xl
                  ${eliminated || joining ? 'opacity-60 cursor-not-allowed' : ''}`}
                style={!eliminated && !joining ? {
                  background: 'linear-gradient(135deg, #d97706, #ec4899, #a78bfa)',
                  boxShadow: '0 0 30px rgba(217,119,6,0.4), 0 4px 20px rgba(0,0,0,0.5)',
                } : { background: '#374151' }}
              >
                {joining ? '⏳ Joining…' : '🏆 Join Special Match'}
              </button>
            </>
          )}

          {!hasJoined && (
            <div className="mt-5 rounded-2xl p-4"
              style={{ background: 'linear-gradient(135deg, rgba(217,119,6,0.15), rgba(167,139,250,0.15))', border: '1px solid rgba(251,191,36,0.3)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300 font-semibold text-sm">Grand Prize</span>
              </div>
              <p className="text-white font-bold text-xl">Win up to ₦20,000 🏆</p>
              <p className="text-gray-300 text-sm mt-1">Win 10 duels to become a Champion 🏆</p>
            </div>
          )}
        </div>

        {/* ── How to play ── */}
        <div className="mt-5 rounded-2xl p-5"
          style={{ background: 'rgba(10,5,30,0.68)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
          <h3 className="text-white font-semibold mb-3 text-center">How to Play</h3>
          <div className="space-y-2">
            {[
              ['🎯', 'Special custom questions only'],
              ['⚔️', 'Face 1-vs-1 opponents'],
              ['⏱️', '9 seconds to answer each question'],
              ['🏆', 'Win 10 duels to become a Champion'],
              ['🛡️', 'Anti-cheat: one device per match'],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-3 text-gray-300 text-sm">
                <span className="text-lg">{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>

          {/* Demo Quiz Button */}
          {demoDisabled ? (
            <div className="w-full mt-5 py-4 rounded-2xl font-bold text-center"
              style={{
                background: 'rgba(127,29,29,0.3)',
                border: '1px solid rgba(239,68,68,0.4)',
              }}
            >
              <Clock className="w-5 h-5 text-red-400 mx-auto mb-1" />
              <span className="text-red-300 text-sm">Demo disabled - Game starting soon!</span>
            </div>
          ) : (
            <button
              onClick={() => setShowDemo(true)}
              className="w-full mt-5 py-4 rounded-2xl font-bold text-white transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
              style={{
                background: 'linear-gradient(135deg, rgba(217,119,6,0.3), rgba(167,139,250,0.3))',
                border: '1px solid rgba(251,191,36,0.4)',
              }}
            >
              <Gamepad2 className="w-5 h-5 text-amber-400" />
              <span className="text-amber-300">Try Demo Quiz</span>
              <span className="text-xs text-gray-400 bg-black/30 px-2 py-0.5 rounded-full">Practice</span>
            </button>
          )}
        </div>
      </div>

      {/* Demo Quiz */}
      {showDemo && <DemoQuiz onClose={() => setShowDemo(false)} questions={BIBLE_DEMO_QUESTIONS} />}

      {/* Tournament countdown warning banner */}
      {tournament.countdownWarning && tournament.phase === 'countdown_warning' && (
        <TournamentCountdownBanner message={tournament.countdownWarning} />
      )}
    </div>
  );
}
