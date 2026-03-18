// ─── Security & Anti-Cheat utilities ─────────────────────────────────────────
// Runs on the client. Detects tab-switching, back-navigation, and session abuse.

const SESSION_KEY   = 'qd_session_token';
const VIOLATIONS_KEY = 'qd_violations';
const LOCK_KEY       = 'qd_security_lock';

// ── Session token ─────────────────────────────────────────────────────────────
export function getOrCreateSessionToken() {
  let token = sessionStorage.getItem(SESSION_KEY);
  if (!token) {
    token = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, token);
  }
  return token;
}

export function clearSessionToken() {
  sessionStorage.removeItem(SESSION_KEY);
}

// ── Violation tracker ─────────────────────────────────────────────────────────
function getViolations() {
  try { return JSON.parse(localStorage.getItem(VIOLATIONS_KEY) || '[]'); } catch { return []; }
}

export function recordViolation(type, detail = '') {
  const list = getViolations();
  list.push({ type, detail, time: Date.now() });
  // Keep last 20 only
  if (list.length > 20) list.splice(0, list.length - 20);
  localStorage.setItem(VIOLATIONS_KEY, JSON.stringify(list));
  return list.length;
}

export function getViolationCount() {
  return getViolations().length;
}

export function clearViolations() {
  localStorage.removeItem(VIOLATIONS_KEY);
}

// ── Security lock ─────────────────────────────────────────────────────────────
// Set when a player navigates away mid-match — they get a warning screen on return.
export function setSecurityLock(reason, matchId) {
  localStorage.setItem(LOCK_KEY, JSON.stringify({ reason, matchId, time: Date.now() }));
}

export function getSecurityLock() {
  try { return JSON.parse(localStorage.getItem(LOCK_KEY) || 'null'); } catch { return null; }
}

export function clearSecurityLock() {
  localStorage.removeItem(LOCK_KEY);
}

// ── History lock (prevents back button re-entry) ───────────────────────────────
// Call this once when the app mounts to push a sentinel entry onto history.
export function installBackGuard(onBackDetected) {
  // Push two states: base + sentinel. If user hits back, popstate fires.
  history.pushState({ qd: true }, '');
  history.pushState({ qd: true }, '');

  const handlePop = (e) => {
    // User pressed back — restore forward and trigger callback
    history.pushState({ qd: true }, '');
    onBackDetected();
  };

  window.addEventListener('popstate', handlePop);
  return () => window.removeEventListener('popstate', handlePop);
}

// ── Tab / window visibility guard ─────────────────────────────────────────────
// Call during an active match. Returns a cleanup function.
export function installVisibilityGuard(onHidden, onVisible) {
  const handleVisibility = () => {
    if (document.visibilityState === 'hidden') {
      onHidden();
    } else {
      onVisible();
    }
  };

  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}

// ── Beforeunload guard ────────────────────────────────────────────────────────
export function installUnloadGuard() {
  const handler = (e) => {
    e.preventDefault();
    e.returnValue = 'Leaving will forfeit your match. Are you sure?';
    return e.returnValue;
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}

// ── Answer speed check ────────────────────────────────────────────────────────
export function isAnswerSpeedSuspicious(timeElapsedSeconds) {
  // < 350ms is humanly impossible
  return timeElapsedSeconds < 0.35;
}
