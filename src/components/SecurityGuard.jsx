import { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  installBackGuard,
  installVisibilityGuard,
  installUnloadGuard,
  setSecurityLock,
  getSecurityLock,
  clearSecurityLock,
  recordViolation,
  getOrCreateSessionToken,
} from '../utils/security';
import socket from '../utils/socket';

/**
 * SecurityGuard wraps the entire app.
 * - During a live match it installs back/visibility/unload guards.
 * - If the player navigates away they see a lock screen on return.
 * - Violation count is shown as a badge on the match screen.
 */
export default function SecurityGuard({ children, matchId, isInMatch }) {
  const [locked, setLocked]             = useState(false);
  const [lockReason, setLockReason]     = useState('');
  const [tabHidden, setTabHidden]       = useState(false);
  const [violations, setViolations]     = useState(0);
  const [hiddenSeconds, setHiddenSeconds] = useState(0);
  const hiddenTimerRef = { current: null };

  // Check for a stale lock from a previous navigation
  useEffect(() => {
    const lock = getSecurityLock();
    if (lock && isInMatch) {
      setLocked(true);
      setLockReason(lock.reason);
    }
  }, [isInMatch]);

  // Install guards when inside a match
  useEffect(() => {
    if (!isInMatch || !matchId) return;

    // Back button guard
    const removeBack = installBackGuard(() => {
      const v = recordViolation('back_navigation');
      setViolations(v);
      setSecurityLock('back_navigation', matchId);
      setLockReason('You pressed the back button during a live match.');
      setLocked(true);
      if (socket.connected) socket.emit('report_violation', { matchId, type: 'back_navigation' });
    });

    // Tab visibility guard
    const removeVis = installVisibilityGuard(
      () => {
        // Tab hidden
        setTabHidden(true);
        hiddenTimerRef.current = setInterval(() => {
          setHiddenSeconds(s => s + 1);
        }, 1000);
        const v = recordViolation('tab_hidden');
        setViolations(v);
        if (socket.connected) socket.emit('report_violation', { matchId, type: 'tab_hidden' });
      },
      () => {
        // Tab visible again
        setTabHidden(false);
        clearInterval(hiddenTimerRef.current);
        setHiddenSeconds(0);
        // If they were hidden > 5 seconds, lock them
        setHiddenSeconds(prev => {
          if (prev >= 5) {
            setSecurityLock('tab_switch', matchId);
            setLockReason('You switched tabs or minimized the window during a live match.');
            setLocked(true);
          }
          return 0;
        });
      }
    );

    // Unload / close guard
    const removeUnload = installUnloadGuard();

    return () => {
      removeBack();
      removeVis();
      removeUnload();
      clearInterval(hiddenTimerRef.current);
    };
  }, [isInMatch, matchId]);

  // ── Lock screen ──────────────────────────────────────────────────────────
  if (locked) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex flex-col items-center justify-center p-6 text-center">
        <div className="glass rounded-3xl p-8 max-w-sm w-full border border-red-500/40 space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center"
              style={{ boxShadow: '0 0 40px rgba(239,68,68,0.4)' }}>
              <ShieldAlert className="w-10 h-10 text-red-400" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-white mb-2">🔒 Match Locked</h2>
            <p className="text-red-400 font-semibold text-sm">Anti-Cheat Triggered</p>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-sm text-gray-300 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-400 inline mr-1 mb-0.5" />
            {lockReason || 'Suspicious activity was detected during your match.'}
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>Violations recorded: <span className="text-red-400 font-bold">{violations}</span></p>
            <p>3 violations = permanent session ban</p>
          </div>

          <button
            onClick={() => {
              clearSecurityLock();
              setLocked(false);
              // Reconnect to match if still within window
              if (socket.connected && matchId) {
                const deviceId = localStorage.getItem('qd_device_id');
                const username = (() => {
                  try {
                    const m = JSON.parse(localStorage.getItem('qd_usernames') || '{}');
                    return Object.keys(m).find(u => m[u] === deviceId) || '';
                  } catch { return ''; }
                })();
                if (deviceId && username) socket.emit('join_lobby', { deviceId, username, sessionToken: getOrCreateSessionToken() });
              }
            }}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black text-base"
          >
            I Understand — Return to Match
          </button>

          <p className="text-xs text-gray-600">
            Continued violations will result in elimination from the tournament.
          </p>
        </div>
      </div>
    );
  }

  // ── Anti-Cheat badge (shown during match) ─────────────────────────────────
  return (
    <div className="relative">
      {children}
      {isInMatch && (
        <div className={`fixed top-3 right-3 z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold
          ${tabHidden
            ? 'bg-red-500/30 border border-red-500/60 text-red-300 animate-pulse'
            : 'bg-green-500/15 border border-green-500/30 text-green-400'
          }`}
          style={{ pointerEvents: 'none' }}
        >
          <ShieldCheck className="w-3 h-3" />
          {tabHidden ? `⚠️ TAB HIDDEN ${hiddenSeconds}s` : 'Anti-Cheat Active'}
        </div>
      )}
    </div>
  );
}
