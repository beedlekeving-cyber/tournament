// ─── Backend API Utility ──────────────────────────────────────────────────────
// Override at build time with VITE_SERVER_URL (e.g. for production deployments)
export const BASE_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : 'https://quizbackend-uevc.onrender.com');

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
 * Headers that include Content-Type and the Authorization bearer token.
 * Use this for every admin-protected fetch call.
 */
export function adminAuthHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getAdminToken()}`,
    ...extra,
  };
}

/** GET /tournament/schedule */
export async function fetchTournamentSchedule() {
  const res = await fetch(`${BASE_URL}/tournament/schedule`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Server error: ${res.status}`);
  }
  return res.json();
}

/** GET /tournament/status — includes reward, max, registered count, etc. */
export async function fetchTournamentStatus() {
  const res = await fetch(`${BASE_URL}/tournament/status`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Server error: ${res.status}`);
  }
  return res.json();
}

/** GET /api/users/count */
export async function fetchUserCount() {
  const res = await fetch(`${BASE_URL}/api/users/count`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Server error: ${res.status}`);
  }
  const data = await res.json();
  return data.count ?? data.total ?? 0;
}

/** GET /api/users */
export async function fetchUsers() {
  const res = await fetch(`${BASE_URL}/api/users`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Server error: ${res.status}`);
  }
  return res.json();
}

/**
 * POST /api/users — register / fetch user by username + deviceId.
 * Pass forTournament=true to add the player to the open tournament's waiting list.
 */
export async function registerUser(username, deviceId, forTournament = false) {
  const res = await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, deviceId, forTournament }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.alreadyExists) {
    throw new Error(data.message || data.error || `Server error: ${res.status}`);
  }
  return data;
}

/** GET /api/users/:username */
export async function checkUserExists(username) {
  try {
    const res = await fetch(`${BASE_URL}/api/users/${encodeURIComponent(username)}`);
    if (res.status === 404) return false;
    if (!res.ok) return true;
    return true;
  } catch (_) {
    return true;
  }
}

/** POST /admin/login */
export async function adminLogin(email, password) {
  const res = await fetch(`${BASE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Invalid credentials');
  }
  return res.json();
}

// ─── Tournament admin / runtime ─────────────────────────────────────────────

/** POST /admin/tournament/reward — set the reward display string */
export async function setTournamentReward(rewardAmount) {
  const res = await fetch(`${BASE_URL}/admin/tournament/reward`, {
    method: 'POST',
    headers: adminAuthHeaders(),
    body: JSON.stringify({ rewardAmount }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${res.status}`);
  }
  return res.json();
}

/** POST /admin/questions — replace the entire runtime question bank (also writes to MongoDB) */
export async function pushQuestionBank(questions) {
  const res = await fetch(`${BASE_URL}/admin/questions`, {
    method: 'POST',
    headers: adminAuthHeaders(),
    body: JSON.stringify({ questions }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${res.status}`);
  }
  return res.json();
}

/** POST /admin/questions/refresh — reload the in-memory cache from MongoDB */
export async function refreshQuestionBankFromDB() {
  const res = await fetch(`${BASE_URL}/admin/questions/refresh`, {
    method: 'POST',
    headers: adminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${res.status}`);
  }
  return res.json();
}

/** GET /admin/questions — admin reads current bank */
export async function fetchAdminQuestionBank() {
  const res = await fetch(`${BASE_URL}/admin/questions`, { headers: adminAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${res.status}`);
  }
  return res.json();
}

/** GET /api/questions/count — public count check */
export async function fetchQuestionCount() {
  const res = await fetch(`${BASE_URL}/api/questions/count`);
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count ?? 0;
}

/** GET /api/questions — public bank (without correct answers). Used by the client to render questions during matches. */
export async function fetchPublicQuestions() {
  const res = await fetch(`${BASE_URL}/api/questions`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data.questions) ? data.questions : [];
}

/** POST /api/tournament/winner-submit — champion sends reward details */
export async function submitWinnerDetails({ deviceId, accountNumber, accountName, bankName, message }) {
  const res = await fetch(`${BASE_URL}/api/tournament/winner-submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, accountNumber, accountName, bankName, message }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Server error: ${res.status}`);
  return data;
}

/** GET /admin/tournament/winners — admin lists all winner submissions */
export async function fetchWinnerSubmissions() {
  const res = await fetch(`${BASE_URL}/admin/tournament/winners`, { headers: adminAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${res.status}`);
  }
  return res.json();
}

/** POST /api/tournament/chat — winner sends a message */
export async function winnerSendChat(deviceId, text) {
  const res = await fetch(`${BASE_URL}/api/tournament/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Server error: ${res.status}`);
  return data;
}

/** GET /api/tournament/chat/:deviceId — winner reads their thread */
export async function fetchWinnerChat(deviceId) {
  const res = await fetch(`${BASE_URL}/api/tournament/chat/${encodeURIComponent(deviceId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Server error: ${res.status}`);
  return data;
}

/** POST /admin/tournament/chat/:deviceId — admin replies */
export async function adminSendChat(deviceId, text) {
  const res = await fetch(`${BASE_URL}/admin/tournament/chat/${encodeURIComponent(deviceId)}`, {
    method: 'POST',
    headers: adminAuthHeaders(),
    body: JSON.stringify({ text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Server error: ${res.status}`);
  return data;
}

/** GET /admin/tournament/chat/:deviceId */
export async function fetchAdminChat(deviceId) {
  const res = await fetch(`${BASE_URL}/admin/tournament/chat/${encodeURIComponent(deviceId)}`, {
    headers: adminAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Server error: ${res.status}`);
  return data;
}

/** POST /admin/tournament/winners/:id/paid */
export async function markWinnerPaid(id) {
  const res = await fetch(`${BASE_URL}/admin/tournament/winners/${id}/paid`, {
    method: 'POST',
    headers: adminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${res.status}`);
  }
  return res.json();
}
