import { useEffect, useState, useRef, useCallback } from 'react';
import { MessageCircle, Send, Loader2, Crown, RefreshCw } from 'lucide-react';
import { io } from 'socket.io-client';
import {
  BASE_URL,
  getAdminToken,
  fetchWinnerSubmissions,
  fetchAdminChat,
  adminSendChat,
} from '../utils/api';

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function WinnerChat() {
  const [activeWinner, setActiveWinner] = useState(null); // { deviceId, username, rewardAmount, paid }
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  // Resolve the most recent winner submission (latest tournament champion).
  const pickLatestWinner = useCallback(async () => {
    setError('');
    try {
      const data = await fetchWinnerSubmissions();
      const subs = data.submissions || [];
      if (subs.length === 0) {
        setActiveWinner(null);
        setMessages([]);
        return;
      }
      const latest = subs[0]; // backend returns newest first
      setActiveWinner({
        deviceId: latest.deviceId,
        username: latest.username,
        rewardAmount: latest.rewardAmount || '',
        paid: !!latest.paid,
      });
      // Load thread
      const chat = await fetchAdminChat(latest.deviceId);
      setMessages(chat.messages || []);
    } catch (e) {
      setError(e.message || 'Could not load winner chat');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    pickLatestWinner().finally(() => setLoading(false));
  }, [pickLatestWinner]);

  // Live socket — append messages as they arrive.
  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    const sock = io(BASE_URL, { transports: ['websocket'], autoConnect: true });
    sock.on('connect', () => sock.emit('admin_join', { token }));
    sock.on('chat_message', ({ deviceId, message }) => {
      if (!activeWinner || deviceId !== activeWinner.deviceId) {
        // A different (or first) winner is chatting — switch focus to them.
        pickLatestWinner();
        return;
      }
      setMessages(prev => [...prev, message]);
    });
    // A new winner submitted details — refresh and switch to them.
    sock.on('winner_submission', () => pickLatestWinner());
    sock.on('winner_submission_updated', () => pickLatestWinner());
    return () => sock.disconnect();
  }, [activeWinner, pickLatestWinner]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !activeWinner) return;
    setSending(true);
    try {
      await adminSendChat(activeWinner.deviceId, text);
      setDraft('');
      // The socket echo will append the message — no optimistic update needed.
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

  if (!activeWinner && !loading) {
    return (
      <div className="glass rounded-2xl p-5 border border-white/5">
        <h3 className="text-white font-bold mb-2 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-amber-400" /> Winner Chat
        </h3>
        <p className="text-gray-500 text-sm">No winner has submitted details yet. This panel will activate once a champion is declared.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl border border-white/5 overflow-hidden flex flex-col"
      style={{ background: 'rgba(10,5,30,0.85)', minHeight: '420px', maxHeight: '560px' }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(167,139,250,0.18))', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', boxShadow: '0 0 18px rgba(251,191,36,0.5)' }}>
          <Crown className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-white font-black text-base flex items-center gap-2">
            {activeWinner?.username || '—'}
            {activeWinner?.paid && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/40 font-bold">PAID</span>
            )}
          </h3>
          <p className="text-amber-300 text-xs font-bold">{activeWinner?.rewardAmount || 'No reward set'}</p>
        </div>
        <button onClick={pickLatestWinner} title="Refresh"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ background: 'rgba(0,0,0,0.25)' }}>
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            No messages yet. Say hello to the champion 👋
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.from === 'admin';
            return (
              <div key={m._id || i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[75%]">
                  <div className={`px-4 py-2.5 rounded-2xl ${mine
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-white/10 text-amber-100 rounded-bl-sm'}`}>
                    <p className="text-sm whitespace-pre-wrap leading-snug">{m.text}</p>
                  </div>
                  <p className={`text-[10px] text-gray-500 mt-1 ${mine ? 'text-right' : 'text-left'}`}>
                    {mine ? 'You' : (activeWinner?.username || 'Winner')} · {formatTime(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-white/5 p-3 flex items-end gap-2"
        style={{ background: 'rgba(10,5,30,0.95)' }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          placeholder={`Message ${activeWinner?.username || 'the winner'}…`}
          className="flex-1 bg-white/5 border border-white/10 focus:border-amber-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none resize-none"
          style={{ maxHeight: '120px' }}
        />
        <button onClick={send} disabled={sending || !draft.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm disabled:opacity-50">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send
        </button>
      </div>

      {error && <p className="text-red-400 text-xs px-4 pb-3">{error}</p>}
    </div>
  );
}
