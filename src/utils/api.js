// ─── Backend API Utility ──────────────────────────────────────────────────────
export const BASE_URL = 'https://quizbackend-uevc.onrender.com';

const TOKEN_KEY = 'qd_admin_token';

/** Persist the JWT received after admin login */
export function saveAdminToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Retrieve the stored JWT (or null) */
export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/** Remove the stored JWT on logout */
export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Returns headers that include Content-Type and the Authorization bearer token.
 * Use this for every admin-protected fetch call.
 */
export function adminAuthHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getAdminToken()}`,
    ...extra,
  };
}

/**
 * Fetch the tournament schedule from the backend
 * GET /tournament/schedule
 * @returns {Promise<object>} e.g. { scheduledDate, tournamentStarted, registrationOpen }
 */
export async function fetchTournamentSchedule() {
  const res = await fetch(`${BASE_URL}/tournament/schedule`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Server error: ${res.status}`);
  }
  return res.json();
}

/**
 * Get the number of registered players
 * GET /api/users/count
 * @returns {Promise<number>} total registered player count
 */
export async function fetchUserCount() {
  const res = await fetch(`${BASE_URL}/api/users/count`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Server error: ${res.status}`);
  }
  const data = await res.json();
  // Support both { count: n } and { total: n } response shapes
  return data.count ?? data.total ?? 0;
}

/**
 * Fetch all registered users (for leaderboard)
 * GET /api/users
 * @returns {Promise<Array>} array of user objects from the server
 */
export async function fetchUsers() {
  const res = await fetch(`${BASE_URL}/api/users`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Server error: ${res.status}`);
  }
  return res.json();
}

/**
 * Register / fetch a user by username + deviceId
 * POST /api/users
 * @param {string} username
 * @param {string} deviceId
 * @returns {Promise<object>} server response JSON
 */
export async function registerUser(username, deviceId) {
  const res = await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, deviceId }),
  });
  const data = await res.json().catch(() => ({}));
  // Treat "alreadyExists" as a success — the server confirmed the user is registered
  if (!res.ok && !data.alreadyExists) {
    throw new Error(data.message || `Server error: ${res.status}`);
  }
  return data;
}

/**
 * Check whether a username still exists in the database.
 * GET /api/users/:username
 * Returns true if the user exists, false if deleted or server unreachable.
 */
export async function checkUserExists(username) {
  try {
    const res = await fetch(`${BASE_URL}/api/users/${encodeURIComponent(username)}`);
    if (res.status === 404) return false;
    if (!res.ok) return true; // non-404 error → assume exists (fail open)
    return true;
  } catch (_) {
    return true; // network error → fail open, don't clear cache
  }
}

/**
 * Fetch all Bible questions for the tournament
 * GET /api/bible-questions
 * @returns {Promise<Array>} array of question objects from the server
 */
export async function fetchBibleQuestions() {
  const res = await fetch(`${BASE_URL}/api/bible-questions`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Server error: ${res.status}`);
  }
  const data = await res.json();
  // Support both a plain array or { questions: [] } wrapper
  return Array.isArray(data) ? data : data.questions ?? [];
}

/**
 * Admin login
 * POST /admin/login
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} server response JSON (e.g. { token, ... })
 */
export async function adminLogin(email, password) {
  const res = await fetch(`${BASE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Invalid credentials`);
  }
  return res.json();
}
