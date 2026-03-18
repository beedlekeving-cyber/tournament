// ─── Anti-Cheat Store ─────────────────────────────────────────────────────────
// Persists across sessions via localStorage.
// In production these checks would be enforced on the server side.

const KEYS = {
  DEVICE_ID:    'qd_device_id',
  USERNAMES:    'qd_usernames',
  ELIMINATED:   'qd_eliminated',
  COINS:        'qd_coins',
  STREAK:       'qd_streak',
};

// ── Device ID ──────────────────────────────────────────────────────────────
export function getDeviceId() {
  let id = localStorage.getItem(KEYS.DEVICE_ID);
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(KEYS.DEVICE_ID, id);
  }
  return id;
}

// ── Username Registry ─────────────────────────────────────────────────────
function getUsernames() {
  try { return JSON.parse(localStorage.getItem(KEYS.USERNAMES) || '{}'); } catch { return {}; }
}

export function isUsernameTaken(username) {
  const map = getUsernames();
  const deviceId = getDeviceId();
  const existing = map[username.toLowerCase()];
  // Allow if same device re-joining with their own username
  return existing && existing !== deviceId;
}

export function registerUsername(username) {
  const map = getUsernames();
  map[username.toLowerCase()] = getDeviceId();
  localStorage.setItem(KEYS.USERNAMES, JSON.stringify(map));
}

export function releaseUsername(username) {
  if (!username) return;
  const map = getUsernames();
  delete map[username.toLowerCase()];
  localStorage.setItem(KEYS.USERNAMES, JSON.stringify(map));
}

// ── Elimination Lock ───────────────────────────────────────────────────────
export function isDeviceEliminated() {
  try {
    const data = JSON.parse(localStorage.getItem(KEYS.ELIMINATED) || 'null');
    if (!data) return false;
    // Elimination expires after 1 hour (tournament cooldown)
    const ONE_HOUR = 60 * 60 * 1000;
    if (Date.now() - data.time > ONE_HOUR) {
      localStorage.removeItem(KEYS.ELIMINATED);
      return false;
    }
    return data.eliminated === true;
  } catch { return false; }
}

export function setDeviceEliminated(username) {
  localStorage.setItem(KEYS.ELIMINATED, JSON.stringify({
    eliminated: true,
    username,
    time: Date.now(),
  }));
}

export function getEliminationInfo() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.ELIMINATED) || 'null');
  } catch { return null; }
}

export function clearElimination() {
  localStorage.removeItem(KEYS.ELIMINATED);
}

// ── Coin Balance ───────────────────────────────────────────────────────────
export function getCoins() {
  return parseInt(localStorage.getItem(KEYS.COINS) || '0', 10);
}

export function addCoins(amount) {
  const current = getCoins();
  localStorage.setItem(KEYS.COINS, String(current + amount));
  return current + amount;
}

export function spendCoins(amount) {
  const current = getCoins();
  if (current < amount) return false;
  localStorage.setItem(KEYS.COINS, String(current - amount));
  return true;
}

// ── Win Streak ─────────────────────────────────────────────────────────────
export function getStreak() {
  return parseInt(localStorage.getItem(KEYS.STREAK) || '0', 10);
}

export function incrementStreak() {
  const s = getStreak() + 1;
  localStorage.setItem(KEYS.STREAK, String(s));
  return s;
}

export function resetStreak() {
  localStorage.setItem(KEYS.STREAK, '0');
  return 0;
}

// ── Answer Validation ─────────────────────────────────────────────────────
// Server-side in production (Cloud Functions). Here we simulate with
// a hash check + timing guard to catch bot-speed answers.
export function validateAnswer(answer, question, timeElapsed) {
  // Reject impossibly fast answers (< 400ms = bot)
  if (timeElapsed < 0.4) {
    console.warn('[Anti-Cheat] Answer rejected: too fast', timeElapsed);
    return { valid: false, reason: 'TOO_FAST' };
  }
  // Reject answers not in valid option set
  const validOptions = Object.keys(question.options || { A:1, B:1, C:1, D:1 });
  if (answer !== null && !validOptions.includes(answer)) {
    console.warn('[Anti-Cheat] Answer rejected: invalid option', answer);
    return { valid: false, reason: 'INVALID_OPTION' };
  }
  return { valid: true };
}

// ── Streak Bonus Label ─────────────────────────────────────────────────────
export function getStreakBonus(streak) {
  if (streak >= 6) return { multiplier: 3, label: '🔥🔥🔥 GODLIKE x3', color: 'text-red-400' };
  if (streak >= 4) return { multiplier: 2, label: '🔥🔥 ON FIRE x2', color: 'text-orange-400' };
  if (streak >= 2) return { multiplier: 1.5, label: '🔥 Streak x1.5', color: 'text-amber-400' };
  return null;
}
