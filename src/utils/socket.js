import { io } from 'socket.io-client';
import { BASE_URL } from './api';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || BASE_URL;

const socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 10000,
});

// Debug helpers (only in dev)
if (import.meta.env.DEV) {
  socket.on('connect',    () => console.log('[socket] connected', socket.id));
  socket.on('disconnect', (r) => console.log('[socket] disconnected', r));
  socket.on('connect_error', (e) => console.warn('[socket] connect_error', e.message));
}

export default socket;
