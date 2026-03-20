import { io } from 'socket.io-client';
import { BASE_URL } from './api';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || BASE_URL;

const socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity, // Keep trying forever
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 30000,                 // Increased timeout for slow networks
  // Try websocket first, fall back to polling if blocked
  transports: ['websocket', 'polling'],
  // Upgrade from polling to websocket when possible
  upgrade: true,
  // Force new connection on reconnect (helps with stale connections)
  forceNew: false,
});

// ─── Connection state tracking ───────────────────────────────────────────────
let connectionListeners = [];
let isConnected = false;

export function onConnectionChange(callback) {
  connectionListeners.push(callback);
  // Immediately notify of current state
  callback(isConnected);
  return () => {
    connectionListeners = connectionListeners.filter(cb => cb !== callback);
  };
}

function notifyConnectionChange(connected) {
  isConnected = connected;
  connectionListeners.forEach(cb => cb(connected));
}

// ─── Reconnection context (for re-registering after reconnect) ───────────────
let reconnectContext = null;

export function setReconnectContext(ctx) {
  reconnectContext = ctx;
}

export function getReconnectContext() {
  return reconnectContext;
}

// ─── Core socket events ──────────────────────────────────────────────────────
socket.on('connect', () => {
  if (import.meta.env.DEV) console.log('[socket] connected', socket.id);
  notifyConnectionChange(true);
  
  // Re-register device after reconnection
  if (reconnectContext) {
    const { deviceId, sessionToken, username, isSpecialSession } = reconnectContext;
    socket.emit('register_device', { deviceId, sessionToken });
    if (username) {
      socket.emit('join_lobby', { deviceId, username, sessionToken, isSpecialSession });
    }
    // Request current state sync
    socket.emit('request_state_sync', { deviceId });
  }
});

socket.on('disconnect', (reason) => {
  if (import.meta.env.DEV) console.log('[socket] disconnected', reason);
  notifyConnectionChange(false);
});

socket.on('connect_error', (e) => {
  if (import.meta.env.DEV) console.warn('[socket] connect_error', e.message);
  notifyConnectionChange(false);
});

// ─── Visibility change handler (resync when tab becomes visible) ─────────────
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && socket.connected && reconnectContext) {
      // Request state sync when user returns to tab
      socket.emit('request_state_sync', { deviceId: reconnectContext.deviceId });
    }
  });
}

export default socket;
