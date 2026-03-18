// ─── Shared Matchmaker via localStorage ───────────────────────────────────────
// Both players on different devices/tabs poll the same localStorage key.
// Player 1 writes a "waiting" entry. Player 2 sees it and creates the match.
// Both then read the same matchId + seed so questions are identical.

const LOBBY_KEY  = 'qd_lobby';      // waiting players
const MATCH_KEY  = 'qd_matches';    // active matches (matchId → match data)
const POLL_MS    = 500;             // polling interval

function getLobby() {
  try { return JSON.parse(localStorage.getItem(LOBBY_KEY) || '[]'); } catch { return []; }
}
function saveLobby(arr) {
  localStorage.setItem(LOBBY_KEY, JSON.stringify(arr));
}
function getMatches() {
  try { return JSON.parse(localStorage.getItem(MATCH_KEY) || '{}'); } catch { return {}; }
}
function saveMatches(obj) {
  localStorage.setItem(MATCH_KEY, JSON.stringify(obj));
}

// Add yourself to the waiting lobby
export function enterLobby(deviceId, username) {
  const lobby = getLobby().filter(p => p.deviceId !== deviceId); // remove stale self
  lobby.push({ deviceId, username, joinedAt: Date.now() });
  saveLobby(lobby);
}

// Remove yourself from the waiting lobby
export function leaveLobby(deviceId) {
  const lobby = getLobby().filter(p => p.deviceId !== deviceId);
  saveLobby(lobby);
}

// Try to pair with a waiting opponent.
// Returns the match object { matchId, seed, player1, player2 } if paired, else null.
export function tryPair(myDeviceId, myUsername) {
  // Clean up stale lobby entries (> 30s old)
  const now = Date.now();
  let lobby = getLobby().filter(p => now - p.joinedAt < 30000);

  const opponentEntry = lobby.find(p => p.deviceId !== myDeviceId);
  if (!opponentEntry) return null; // nobody else waiting

  // We found an opponent — create the match
  const matchId = 'match_' + now + '_' + Math.random().toString(36).slice(2, 7);
  const seed    = matchId; // both players use matchId as question seed

  const match = {
    matchId,
    seed,
    player1: { deviceId: opponentEntry.deviceId, username: opponentEntry.username },
    player2: { deviceId: myDeviceId, username: myUsername },
    createdAt: now,
  };

  // Write match and remove both from lobby atomically
  const matches = getMatches();
  matches[matchId] = match;
  saveMatches(matches);

  lobby = lobby.filter(p => p.deviceId !== myDeviceId && p.deviceId !== opponentEntry.deviceId);
  saveLobby(lobby);

  return match;
}

// Poll until we appear in a match (someone else paired us while we were waiting).
// Returns the match or null if timed out.
export function waitForMatch(myDeviceId, timeoutMs = 28000) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;

    const check = () => {
      const matches = getMatches();
      const found = Object.values(matches).find(
        m => (m.player1.deviceId === myDeviceId || m.player2.deviceId === myDeviceId)
          && Date.now() - m.createdAt < 60000
      );
      if (found) return resolve(found);
      if (Date.now() >= deadline) return resolve(null);
      setTimeout(check, POLL_MS);
    };

    check();
  });
}

// Clean up a finished match
export function removeMatch(matchId) {
  const matches = getMatches();
  delete matches[matchId];
  saveMatches(matches);
}

// Get opponent username from a match
export function getOpponentFromMatch(match, myDeviceId) {
  return match.player1.deviceId === myDeviceId ? match.player2 : match.player1;
}

// Purge matches older than 2 minutes to keep storage clean
export function purgeStaleMatches() {
  const matches = getMatches();
  const now = Date.now();
  let changed = false;
  for (const id of Object.keys(matches)) {
    if (now - matches[id].createdAt > 120000) { delete matches[id]; changed = true; }
  }
  if (changed) saveMatches(matches);
}
