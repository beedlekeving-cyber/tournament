import { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import {
  ShieldCheck, Users, CheckCircle2, XCircle,
  ArrowRight, Clock, Trophy, Swords, Zap, Crown, Send, Loader2, MessageCircle,
} from 'lucide-react';
import { playClick, playCorrect, playWrong, playTick, playUrgentTick, playWin } from '../utils/sounds';
import { getDeviceId } from '../utils/anticheat';
import socket from '../utils/socket';
import {
  registerUser, fetchUserCount, fetchTournamentSchedule,
  fetchTournamentStatus, submitWinnerDetails,
  fetchWinnerChat, winnerSendChat,
} from '../utils/api';

// ─── Sub-component: TournamentMatch ─────────────────────────────────────────
function TournamentMatch({
  questions, currentQuestionIndex, totalQuestions, opponent, round, roundLabel,
  matchId, bothCorrectFeedback, onAnswered, questionTime,
}) {
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [timer, setTimer] = useState(questionTime ? questionTime - 1 : 14);
  const [opponentAnswered, setOpponentAnswered] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const q = questions[currentQuestionIndex];

  // Safety: never auto-submit (and never crash on `q.question`) when the
  // question hasn't arrived yet. Better to wait visually than be auto-eliminated.
  if (!q) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-4"
        style={{ background: 'linear-gradient(160deg, rgba(10,5,30,0.97), rgba(30,5,60,0.97))' }}>
        <div className="text-center">
          <p className="text-amber-300 text-lg font-bold">Loading question…</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    setSelected(null);
    setShowResult(false);
    setCorrectAnswer(null);
    setTimer(questionTime ? questionTime - 1 : 14);
    setOpponentAnswered(false);
  }, [currentQuestionIndex, questionTime]);

  useEffect(() => {
    if (bothCorrectFeedback) {
      setFeedbackMsg('Both correct! Next question...');
      const t = setTimeout(() => setFeedbackMsg(null), 2000);
      return () => clearTimeout(t);
    }
  }, [bothCorrectFeedback, currentQuestionIndex]);

  useEffect(() => {
    if (showResult) return;
    if (timer <= 0) { handleAnswer(null); return; }
    if (timer <= 3) playUrgentTick(); else playTick();
    const t = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, showResult]);

  useEffect(() => {
    const handler = () => setOpponentAnswered(true);
    socket.on('opponent_answered', handler);
    return () => socket.off('opponent_answered', handler);
  }, []);

  useEffect(() => {
    const handler = (data) => {
      if (!data.isTournament) return;
      if (data.bothWrongCount) {
        setFeedbackMsg(data.message || 'Both wrong! Try again...');
        setTimeout(() => setFeedbackMsg(null), 1500);
      } else {
        setCorrectAnswer(q?.correct ?? null);
        setShowResult(true);
        playCorrect();
        setFeedbackMsg(data.message || 'Both correct! Next question...');
        setTimeout(() => setFeedbackMsg(null), 1500);
      }
    };
    socket.on('next_question', handler);
    return () => socket.off('next_question', handler);
  }, [currentQuestionIndex, q]);

  useEffect(() => {
    const handler = (data) => {
      if (!data.isTournament) return;
      if (data.result === 'both_wrong') {
        setShowResult(true);
        setCorrectAnswer('none');
        playWrong();
      } else {
        setCorrectAnswer(data.correctAnswer ?? null);
        setShowResult(true);
        const iWon = data.result === 'win';
        if (iWon) playCorrect(); else playWrong();
      }
    };
    socket.on('round_result', handler);
    return () => socket.off('round_result', handler);
  }, [currentQuestionIndex]);

  const handleAnswer = (optionKey) => {
    if (showResult || selected !== null) return;
    playClick();
    setSelected(optionKey);
    onAnswered(optionKey, q?.id, matchId, timer);
  };

  if (!q) return null;

  const options = q.options
    ? (typeof q.options === 'object' && !Array.isArray(q.options)
        ? Object.entries(q.options)
        : q.options.map((opt, i) => [String.fromCharCode(65 + i), opt]))
    : [];

  const correctKey = correctAnswer === 'none' ? null : (correctAnswer ?? q.correct);
  const displayTotal = totalQuestions || questions.length;

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, rgba(10,5,30,0.97) 0%, rgba(50,5,40,0.97) 100%)' }}>
      {feedbackMsg && (
        <div className="fixed inset-x-0 top-0 z-50 flex justify-center p-4 pt-6 pointer-events-none">
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 0 30px rgba(22,163,74,0.5)' }}>
            <CheckCircle2 className="w-4 h-4 text-green-200" />
            <span className="text-white font-black text-sm">{feedbackMsg}</span>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(236,72,153,0.2)', border: '1px solid rgba(236,72,153,0.4)' }}>
            <Swords className="w-4 h-4 text-pink-400" />
            <span className="text-pink-300 font-bold text-sm">{roundLabel || `Round ${round}`}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.4)' }}>
            <span className="text-purple-300 text-sm font-semibold">vs <span className="font-black text-white">{opponent?.username ?? 'Opponent'}</span></span>
          </div>
        </div>

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

        {opponentAnswered && (
          <div className="text-center mb-3">
            <span className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa' }}>
              ✓ {opponent?.username ?? 'Opponent'} answered
            </span>
          </div>
        )}

        <div className="rounded-3xl p-6 mb-4"
          style={{ background: 'rgba(10,5,30,0.9)', border: '1px solid rgba(251,191,36,0.25)', backdropFilter: 'blur(20px)' }}>
          <p className="text-amber-400 text-xs uppercase tracking-wider mb-2">Question {currentQuestionIndex + 1} of {displayTotal}</p>
          <h2 className="text-lg font-bold text-white leading-relaxed">{q.question}</h2>
        </div>

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

// ─── Sub-component: Countdown banner ────────────────────────────────────────
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

// ─── Sub-component: Waiting for match (Round N) ─────────────────────────────
function TournamentWaitingMatch({ roundLabel }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, rgba(10,5,30,0.97) 0%, rgba(30,5,60,0.97) 100%)' }}>
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center animate-pulse"
          style={{ background: 'linear-gradient(135deg, #d97706, #a78bfa)', boxShadow: '0 0 50px rgba(217,119,6,0.5)' }}>
          <Swords className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-black text-white mb-2">{roundLabel || 'Get Ready!'}</h2>
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

// ─── Sub-component: Round-won (strict gating message) ───────────────────────
function TournamentRoundWon({ nextRoundLabel, finalNotice }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, rgba(5,20,10,0.97) 0%, rgba(10,40,20,0.97) 100%)' }}>
      <div className="text-center max-w-sm">
        <div className="w-28 h-28 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)', boxShadow: '0 0 60px rgba(34,197,94,0.6)' }}>
          <CheckCircle2 className="w-14 h-14 text-white" />
        </div>
        <h2 className="text-4xl font-black text-green-400 mb-2">You Won!</h2>
        {finalNotice ? (
          <p className="text-yellow-300 text-xl font-bold mb-3">{finalNotice}</p>
        ) : null}
        <p className="text-white text-lg mb-2">Waiting for {nextRoundLabel || 'the next round'}…</p>
        <p className="text-gray-400 text-sm mb-6">All matches in this round must finish before the next pairing.</p>
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

// ─── Sub-component: Bye ─────────────────────────────────────────────────────
function TournamentBye({ roundLabel, message }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, rgba(10,10,30,0.97) 0%, rgba(20,15,50,0.97) 100%)' }}>
      <div className="text-center">
        <div className="w-28 h-28 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', boxShadow: '0 0 60px rgba(168,85,247,0.6)' }}>
          <ArrowRight className="w-14 h-14 text-white" />
        </div>
        <h2 className="text-4xl font-black text-purple-400 mb-2">Free Pass!</h2>
        <p className="text-white text-lg mb-2">{message || `You got a bye this ${roundLabel || 'round'}!`}</p>
        <p className="text-gray-400 mb-6">Advancing automatically to the next round…</p>
      </div>
    </div>
  );
}

// ─── Sub-component: Eliminated ──────────────────────────────────────────────
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

// ─── Sub-component: Chat thread between the winner and the admin ────────────
function WinnerChatThread({ username }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);
  const deviceId = getDeviceId();

  // Initial fetch
  useEffect(() => {
    fetchWinnerChat(deviceId)
      .then((data) => setMessages(data.messages || []))
      .catch(() => {});
  }, [deviceId]);

  // Live: append new messages as they arrive
  useEffect(() => {
    const handler = ({ deviceId: did, message }) => {
      if (did !== deviceId || !message) return;
      setMessages((prev) => {
        // Skip duplicates (admin echo) by checking _id
        if (message._id && prev.some(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
    };
    socket.on('chat_message', handler);
    return () => socket.off('chat_message', handler);
  }, [deviceId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setError('');
    try {
      await winnerSendChat(deviceId, text);
      setDraft('');
    } catch (e) {
      setError(e.message || 'Failed to send');
    }
    setSending(false);
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col mt-4"
      style={{ background: 'rgba(10,5,30,0.85)', border: '1px solid rgba(167,139,250,0.3)', minHeight: '320px', maxHeight: '440px' }}>
      <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5"
        style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(251,191,36,0.15))' }}>
        <MessageCircle className="w-5 h-5 text-amber-300" />
        <h3 className="text-white font-black">Chat with Admin</h3>
        <span className="ml-auto text-xs text-amber-200">about your reward</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ background: 'rgba(0,0,0,0.25)' }}>
        {messages.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-6">
            No messages yet. The admin will reply here.
          </p>
        ) : (
          messages.map((m, i) => {
            const mine = m.from === 'winner';
            return (
              <div key={m._id || i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%]">
                  <div className={`px-4 py-2.5 rounded-2xl ${mine
                    ? 'bg-amber-500 text-black rounded-br-sm font-medium'
                    : 'bg-white/10 text-amber-100 rounded-bl-sm'}`}>
                    <p className="text-sm whitespace-pre-wrap leading-snug">{m.text}</p>
                  </div>
                  <p className={`text-[10px] text-gray-500 mt-1 ${mine ? 'text-right' : 'text-left'}`}>
                    {mine ? (username || 'You') : 'Admin'} · {formatTime(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 flex items-end gap-2 border-t border-white/5"
        style={{ background: 'rgba(10,5,30,0.95)' }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          placeholder="Message the admin…"
          className="flex-1 bg-white/5 border border-white/10 focus:border-amber-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none resize-none"
          style={{ maxHeight: '120px' }}
        />
        <button onClick={send} disabled={sending || !draft.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-black font-black text-sm disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' }}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send
        </button>
      </div>

      {error && <p className="text-red-400 text-xs px-4 pb-3">{error}</p>}
    </div>
  );
}

// ─── Sub-component: Champion (winner-only) with reward + account form ───────
function TournamentChampion({ username, rewardAmount, edition, outlasted }) {
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { playWin(); }, []);

  const handleSubmit = async () => {
    setError('');
    const trimmed = accountNumber.trim();
    if (!trimmed) { setError('Account number is required.'); return; }
    if (!/^[0-9 -]{6,30}$/.test(trimmed)) { setError('Enter a valid account number (digits only).'); return; }
    setSubmitting(true);
    try {
      await submitWinnerDetails({
        deviceId: getDeviceId(),
        accountNumber: trimmed,
        accountName: accountName.trim(),
        bankName: bankName.trim(),
        message: message.trim(),
      });
      setSubmitted(true);
    } catch (e) {
      setError(e.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto p-4"
      style={{ background: 'linear-gradient(160deg, rgba(10,8,0,0.97) 0%, rgba(40,20,0,0.97) 100%)' }}>
      <div className="max-w-md mx-auto py-10">
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center mb-5">
            <div className="absolute w-36 h-36 rounded-full animate-ping"
              style={{ background: 'rgba(251,191,36,0.2)' }} />
            <div className="w-28 h-28 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', boxShadow: '0 0 80px rgba(251,191,36,0.8)' }}>
              <Crown className="w-14 h-14 text-white" />
            </div>
          </div>
          <p className="text-amber-300 text-sm font-bold tracking-widest mb-2">👑 CHAMPION OF THE ARENA 👑</p>
          <h2 className="text-4xl font-black mb-3"
            style={{ background: 'linear-gradient(135deg,#fbbf24,#fde68a,#f59e0b)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', filter:'drop-shadow(0 0 20px rgba(251,191,36,0.8))' }}>
            Congratulations {username}
          </h2>
          <p className="text-amber-200 text-base font-semibold mb-1">
            You have conquered <span className="text-white">{edition || 'Quiz Arena'}</span>
          </p>
          {typeof outlasted === 'number' && outlasted > 0 && (
            <p className="text-gray-300 text-sm mb-1">
              Outlasted <span className="text-amber-300 font-bold">{outlasted}</span> {outlasted === 1 ? 'competitor' : 'competitors'}
            </p>
          )}
          <p className="text-gray-400 text-sm italic">Claim your place among the legends.</p>
        </div>

        {/* Reward card */}
        <div className="rounded-2xl p-5 mb-6"
          style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(217,119,6,0.18))', border: '1px solid rgba(251,191,36,0.4)' }}>
          <p className="text-amber-300 text-xs uppercase tracking-wider mb-1">Your Reward</p>
          <p className="text-amber-200 font-black text-3xl">
            {rewardAmount || 'Contact the admin for prize details'}
          </p>
        </div>

        {/* Account form OR confirmation + live chat */}
        {submitted ? (
          <>
            <div className="rounded-2xl p-5 text-center"
              style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)' }}>
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <h3 className="text-green-300 font-black text-lg mb-1">Details Received!</h3>
              <p className="text-gray-300 text-sm">
                The admin has been notified. You can chat with them below about your reward.
              </p>
            </div>
            <WinnerChatThread username={username} />
          </>
        ) : (
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(10,5,30,0.85)', border: '1px solid rgba(251,191,36,0.25)', backdropFilter: 'blur(20px)' }}>
            <h3 className="text-white font-black text-lg mb-1">Claim Your Reward</h3>
            <p className="text-gray-400 text-sm mb-4">
              Send the account where you'd like to receive the reward. Only the admin can see this.
            </p>

            <label className="text-gray-300 text-xs font-semibold mb-1 block">Account Number *</label>
            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g. 0123456789"
              inputMode="numeric"
              className="w-full bg-white/5 border border-white/10 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-base outline-none mb-3"
            />

            <label className="text-gray-300 text-xs font-semibold mb-1 block">Account Name</label>
            <input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Full name on the account"
              className="w-full bg-white/5 border border-white/10 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-base outline-none mb-3"
            />

            <label className="text-gray-300 text-xs font-semibold mb-1 block">Bank Name</label>
            <input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. GTBank"
              className="w-full bg-white/5 border border-white/10 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-base outline-none mb-3"
            />

            <label className="text-gray-300 text-xs font-semibold mb-1 block">Message to admin</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Anything else the admin should know?"
              rows={3}
              className="w-full bg-white/5 border border-white/10 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-sm outline-none mb-3 resize-none"
            />

            {error && (
              <p className="text-red-400 text-sm font-semibold mb-3">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 font-black text-base text-black transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', boxShadow: '0 0 25px rgba(251,191,36,0.5)' }}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {submitting ? 'Sending…' : 'Send to admin'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-component: Tournament ended (non-winners) ──────────────────────────
function TournamentEnded({ championUsername, myUsername, edition }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, rgba(10,10,30,0.97) 0%, rgba(20,20,50,0.97) 100%)' }}>
      <div className="text-center w-full max-w-sm">
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 40px rgba(99,102,241,0.5)' }}>
            <Trophy className="w-12 h-12 text-white" />
          </div>
        </div>
        <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-2">{edition || 'Quiz Arena'}</p>
        <h2 className="text-3xl font-black mb-3 text-white">Competition Complete</h2>
        <p className="text-indigo-200 text-lg font-bold mb-2">👑 Champion: {championUsername}</p>
        <p className="text-gray-400 mb-6">Thank you for competing!</p>
        <div className="rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', border: '1px solid rgba(99,102,241,0.4)' }}>
          <p className="text-indigo-300 font-medium text-sm mb-1">A worthy contest, {myUsername}.</p>
          <p className="text-gray-400 text-sm">The next edition of Quiz Arena is on its way.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component: Blocked (late joiner) / No winner ───────────────────────
function TournamentBlocked({ message, title }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, rgba(20,20,30,0.97), rgba(30,30,50,0.97))' }}>
      <div className="text-center max-w-sm">
        <ShieldCheck className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-white mb-3">{title || 'Tournament in Progress'}</h2>
        <p className="text-gray-300">{message}</p>
      </div>
    </div>
  );
}

// ─── Main Tournament Screen ─────────────────────────────────────────────────
export default function TournamentScreen() {
  const { state, submitTournamentAnswer, dispatch } = useGame();
  const tournament = state.tournament;
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [registeredCount, setRegisteredCount] = useState(0);
  const [maxPlayers, setMaxPlayers] = useState(state.maxPlayers ?? 400);
  const [rewardAmount, setRewardAmount] = useState(state.rewardAmount || '');
  const [tournamentSchedule, setTournamentSchedule] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [restoredUsername, setRestoredUsername] = useState('');
  const [registered, setRegistered] = useState(false);

  // Live ticker for countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Restore previous registration on mount + rejoin the server's tournament waiting room
  useEffect(() => {
    const deviceId = getDeviceId();
    if (!socket.connected) socket.connect();
    socket.emit('register_device', { deviceId, sessionToken: null });

    try {
      const stored = JSON.parse(localStorage.getItem('qd_registered_user') || 'null');
      if (stored?.username) {
        setRestoredUsername(stored.username);
        setUsername(stored.username);
        setRegistered(true);

        // Re-register with the server (REST + socket) so we land back in the waiting room.
        // Fire-and-forget — failures are surfaced via registration_error if they happen.
        registerUser(stored.username, deviceId, /* forTournament */ true).catch(() => {});
        socket.emit('join_lobby', { deviceId, username: stored.username, isTournament: true });
      }
    } catch (_) {}
  }, []);

  // Live counts from server
  useEffect(() => {
    const onWaiting = ({ count, max }) => {
      if (typeof count === 'number') setRegisteredCount(count);
      if (typeof max === 'number') setMaxPlayers(max);
    };
    const onActive = ({ registered: regCount }) => {
      if (typeof regCount === 'number') setRegisteredCount(regCount);
    };
    const onConfig = ({ rewardAmount: r, maxPlayers: m }) => {
      if (typeof r === 'string') setRewardAmount(r);
      if (typeof m === 'number') setMaxPlayers(m);
    };
    socket.on('waiting_count', onWaiting);
    socket.on('active_count', onActive);
    socket.on('tournament_config_updated', onConfig);
    return () => {
      socket.off('waiting_count', onWaiting);
      socket.off('active_count', onActive);
      socket.off('tournament_config_updated', onConfig);
    };
  }, []);

  // Handle server registration errors
  useEffect(() => {
    const onRegistrationError = ({ error, code }) => {
      const msg = code === 'TOURNAMENT_FULL'
        ? `⛔ ${error || 'Tournament is full.'}`
        : code === 'TOURNAMENT_IN_PROGRESS'
        ? '⛔ Tournament has already started. Please wait for the next one.'
        : code === 'USERNAME_TAKEN'
        ? '⛔ That username is already taken. Please choose another.'
        : error || 'Registration failed. Please try again.';
      setJoinError(msg);
      setJoining(false);
    };
    socket.on('registration_error', onRegistrationError);
    socket.on('tournament_in_progress', ({ message }) => {
      setJoinError('⛔ ' + (message || 'Tournament has already started.'));
      setJoining(false);
    });
    socket.on('tournament_not_selected', ({ message, bracketSize }) => {
      setJoinError(
        '🎲 ' + (message ||
          `The bracket is capped at ${bracketSize || 'a power of 2'} for a clean elimination. You weren't selected this time.`)
      );
      setJoining(false);
    });
    return () => {
      socket.off('registration_error', onRegistrationError);
      socket.off('tournament_in_progress');
      socket.off('tournament_not_selected');
    };
  }, []);

  // Poll schedule + status to keep counts/reward fresh
  useEffect(() => {
    const load = () => {
      fetchTournamentSchedule().then(setTournamentSchedule).catch(() => {});
      fetchTournamentStatus().then((data) => {
        if (typeof data.registeredCount === 'number') setRegisteredCount(data.registeredCount);
        if (typeof data.maxPlayers === 'number') setMaxPlayers(data.maxPlayers);
        if (typeof data.rewardAmount === 'string') setRewardAmount(data.rewardAmount);
        // Persist edition into global state so the chip survives page refresh,
        // not just live socket updates.
        if (typeof data.edition === 'string' && data.edition) {
          dispatch({ type: 'EDITION_UPDATED', payload: { edition: data.edition } });
        }
      }).catch(() => {});
      fetchUserCount().then((n) => {
        if (typeof n === 'number') setRegisteredCount((c) => (c === 0 ? n : c));
      }).catch(() => {});
    };
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  const scheduledDate = tournamentSchedule?.scheduledDate || null;
  const startTime = scheduledDate ? new Date(scheduledDate).getTime() : null;
  const msUntilStart = startTime ? Math.max(0, startTime - now) : 0;
  const tournamentStarted = (tournamentSchedule?.tournamentStarted ?? false) || tournament.phase !== 'idle';
  const isFull = registeredCount >= maxPlayers;
  const fillPct = Math.min(100, Math.round((registeredCount / Math.max(1, maxPlayers)) * 100));

  // Send to the tournament queue
  const handleJoin = async () => {
    const trimmed = username.trim();
    if (!trimmed) { setError('Please enter a username'); return; }
    if (trimmed.length < 3) { setError('Username must be at least 3 characters'); return; }
    if (trimmed.length > 20) { setError('Username must be 20 characters or less'); return; }
    playClick();
    setJoining(true);
    setJoinError('');
    setError('');
    try {
      const deviceId = getDeviceId();
      const data = await registerUser(trimmed, deviceId, /* forTournament */ true);
      const confirmed = data?.user?.username || trimmed;
      localStorage.setItem('qd_registered_user', JSON.stringify({
        username: confirmed, registeredAt: Date.now(),
      }));
      setUsername(confirmed);
      setRestoredUsername(confirmed);
      setRegistered(true);

      if (!socket.connected) socket.connect();
      socket.emit('register_device', { deviceId, sessionToken: null });
      socket.emit('join_lobby', { deviceId, username: confirmed, isTournament: true });
    } catch (err) {
      setJoinError(err.message || 'Failed to join. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') handleJoin(); };

  // Format countdown
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

  const displayUsername = restoredUsername || username;
  const championReward = tournament.rewardAmount || rewardAmount;

  // ─── Live tournament phases ───────────────────────────────────────────────
  if (tournament.phase === 'champion') {
    return (
      <TournamentChampion
        username={displayUsername}
        rewardAmount={championReward}
        edition={tournament.edition || state.tournament?.edition || 'Quiz Arena'}
        outlasted={tournament.outlasted}
      />
    );
  }
  if (tournament.phase === 'tournament_ended') {
    return <TournamentEnded championUsername={tournament.championUsername} myUsername={displayUsername} edition={tournament.edition || state.tournament?.edition || 'Quiz Arena'} />;
  }
  if (tournament.phase === 'no_winner') {
    return <TournamentBlocked title="No Champion" message={tournament.noWinnerMessage || 'All players were eliminated this tournament.'} />;
  }
  if (tournament.phase === 'blocked') {
    return <TournamentBlocked message={tournament.blockedMessage || 'Tournament is already in progress.'} />;
  }
  if (tournament.phase === 'eliminated') {
    return <TournamentEliminated username={displayUsername} />;
  }
  if (tournament.phase === 'round_won') {
    return <TournamentRoundWon nextRoundLabel={tournament.roundLabel} finalNotice={tournament.finalNotice} />;
  }
  if (tournament.phase === 'bye') {
    return <TournamentBye roundLabel={tournament.roundLabel} message={tournament.byeMessage} />;
  }
  if (tournament.phase === 'in_match') {
    return (
      <TournamentMatch
        questions={tournament.matchQuestions}
        currentQuestionIndex={tournament.currentQuestionIndex}
        totalQuestions={tournament.totalQuestions}
        opponent={tournament.opponent}
        round={tournament.round}
        roundLabel={tournament.roundLabel}
        matchId={tournament.matchId}
        bothCorrectFeedback={tournament.bothCorrectFeedback}
        onAnswered={submitTournamentAnswer}
        questionTime={tournament.questionTime}
      />
    );
  }
  if (tournament.phase === 'pre_match') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-4"
        style={{ background: 'linear-gradient(160deg, rgba(10,5,30,0.97), rgba(30,5,60,0.97))' }}>
        <p className="text-amber-300 text-xs uppercase tracking-widest mb-1">{tournament.roundLabel}</p>
        <h2 className="text-3xl font-black text-white mb-3">vs {tournament.opponent?.username}</h2>
        <div className="text-7xl font-black text-amber-400 animate-pulse">{tournament.preMatchCountdown}</div>
        <p className="text-gray-400 mt-3">Match starting…</p>
      </div>
    );
  }
  if (tournament.phase === 'waiting_match') {
    return (
      <>
        {tournament.countdownWarning && <TournamentCountdownBanner message={tournament.countdownWarning} />}
        <TournamentWaitingMatch roundLabel={tournament.roundLabel} />
      </>
    );
  }
  if (tournament.phase === 'countdown_warning') {
    return (
      <>
        <TournamentCountdownBanner message={tournament.countdownWarning} />
        <TournamentWaitingMatch roundLabel={tournament.roundLabel} />
      </>
    );
  }

  // ─── Registration / waiting-for-start screen ──────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative"
      style={{ background: 'linear-gradient(160deg, #0a0518 0%, #1e0a3a 100%)' }}>

      {tournament.countdownWarning && <TournamentCountdownBanner message={tournament.countdownWarning} />}

      {/* Header */}
      <div className="w-full max-w-md text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3"
          style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}>
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">
            {(() => {
              const ed = state.tournament?.edition;
              if (!ed) return 'Quiz Arena';
              // "Quiz Arena: Football Edition" → "Football Edition"
              const parts = ed.split(':');
              return (parts[1] || ed).trim();
            })()}
          </span>
        </div>
        <h1 className="text-4xl font-black mb-1"
          style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          Quiz Arena
        </h1>
        <p className="text-gray-400 text-sm">Knowledge creates champions. 1v1 elimination — last contestant wins.</p>
      </div>

      {/* Reward + cap card */}
      <div className="w-full max-w-md rounded-2xl p-5 mb-5"
        style={{ background: 'rgba(10,5,30,0.85)', border: '1px solid rgba(251,191,36,0.25)', backdropFilter: 'blur(20px)' }}>
        {rewardAmount && (
          <div className="mb-5 text-center relative overflow-hidden rounded-2xl py-4 px-3"
            style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(236,72,153,0.12), rgba(251,191,36,0.18))',
              border: '1px solid rgba(251,191,36,0.45)',
              boxShadow: '0 0 24px rgba(251,191,36,0.25), inset 0 0 18px rgba(251,191,36,0.08)',
            }}>
            {/* Soft pulse halo behind the text */}
            <div className="absolute inset-0 pointer-events-none animate-pulse"
              style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(251,191,36,0.22), transparent 70%)',
              }} />
            <p className="relative uppercase tracking-[0.4em] mb-2"
              style={{
                fontWeight: 900,
                fontSize: 'clamp(0.85rem, 1.1vw, 1rem)',
                background: 'linear-gradient(90deg, #fde68a, #fbbf24, #fde68a)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: '0 0 12px rgba(251,191,36,0.4)',
              }}>
              🏆 Champion Prize
            </p>
            <p className="relative"
              style={{
                fontWeight: 900,
                fontSize: 'clamp(2.25rem, 5.5vw, 3.5rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.01em',
                background: 'linear-gradient(135deg, #fde68a 0%, #fbbf24 35%, #f59e0b 70%, #fde68a 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 18px rgba(251,191,36,0.55)) drop-shadow(0 0 30px rgba(251,191,36,0.25))',
              }}>
              {rewardAmount}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-xs uppercase tracking-wider">Registered</span>
          <span className="text-white font-bold text-sm">{registeredCount} / {maxPlayers}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-white/5">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${fillPct}%`, background: 'linear-gradient(90deg, #fbbf24, #f59e0b, #ec4899)' }} />
        </div>
        {isFull ? (
          <p className="text-amber-300 text-xs mt-3">🚀 Tournament is full and starting!</p>
        ) : (
          <p className="text-gray-400 text-xs mt-3">
            Auto-starts when {maxPlayers} players have registered. Admin may also start earlier.
          </p>
        )}
      </div>

      {/* Scheduled countdown */}
      {scheduledDate && msUntilStart > 0 && !tournamentStarted && (
        <div className="w-full max-w-md rounded-2xl p-4 mb-5 text-center"
          style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)' }}>
          <p className="text-indigo-300 text-xs uppercase tracking-wider mb-1">Scheduled start in</p>
          <p className="text-white font-mono font-black text-2xl">{formatCountdown(msUntilStart)}</p>
        </div>
      )}

      {/* Registration form / status */}
      <div className="w-full max-w-md rounded-2xl p-5"
        style={{ background: 'rgba(10,5,30,0.85)', border: '1px solid rgba(167,139,250,0.25)', backdropFilter: 'blur(20px)' }}>
        {registered ? (
          <div className="text-center">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
            <h3 className="text-white font-black text-lg mb-1">You're registered</h3>
            <p className="text-gray-300 mb-1">Welcome, <span className="text-white font-bold">{displayUsername}</span></p>
            <p className="text-gray-500 text-sm">
              {tournamentStarted
                ? 'Tournament is starting — get ready to play!'
                : 'Waiting for the tournament to start…'}
            </p>
          </div>
        ) : tournamentStarted ? (
          // Tournament already running and you're not registered — late joiners are blocked.
          <div className="text-center">
            <ShieldCheck className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
            <h3 className="text-white font-black text-lg mb-1">Tournament in Progress</h3>
            <p className="text-gray-300 mb-1">Registration is closed.</p>
            <p className="text-gray-500 text-sm">
              New players cannot join once the bracket is live. Watch the action on the View Screen and join the next tournament.
            </p>
          </div>
        ) : (
          <>
            <label className="text-gray-300 text-xs font-semibold mb-1 block">Enter your username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKey}
              placeholder="username"
              className="w-full bg-white/5 border border-white/10 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-base outline-none mb-3"
            />
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            {joinError && <p className="text-red-400 text-sm mb-2">{joinError}</p>}

            <button
              onClick={handleJoin}
              disabled={joining || isFull || tournamentStarted}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 font-black text-base text-black transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 0 25px rgba(251,191,36,0.4)' }}
            >
              {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
              {joining
                ? 'Joining…'
                : tournamentStarted
                ? 'Tournament Started'
                : isFull
                ? 'Tournament Full'
                : 'Join Tournament'}
            </button>

            <p className="text-gray-500 text-xs text-center mt-3">
              By joining you agree to the tournament rules. One device per player.
            </p>
          </>
        )}
      </div>

      {/* Tournament_started toast */}
      {tournamentStarted && tournament.phase === 'idle' && (
        <div className="fixed inset-x-0 top-0 z-50 flex justify-center p-4 pt-6">
          <div className="px-5 py-2.5 rounded-2xl text-white font-black text-sm"
            style={{ background: 'linear-gradient(135deg, #d97706, #ec4899)', boxShadow: '0 0 30px rgba(217,119,6,0.6)' }}>
            🚀 Tournament started — entering matchmaking…
          </div>
        </div>
      )}
    </div>
  );
}

