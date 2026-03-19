// ─── Backend API Utility ──────────────────────────────────────────────────────
export const BASE_URL = 'https://quizbackend-uevc.onrender.com';

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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Server error: ${res.status}`);
  }
  return res.json();
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
