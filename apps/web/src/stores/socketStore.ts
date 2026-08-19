'use client';
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface SocketState {
  socket: Socket | null;
  connected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  connected: false,

  connect: (token) => {
    const existing = get().socket;
    if (existing?.connected) return;

    // Clean up any stale socket before creating a new one
    if (existing) {
      existing.removeAllListeners();
      existing.disconnect();
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    // The socket must reach the API's own origin. NEXT_PUBLIC_API_URL is relative
    // ('/api/v1') so REST can ride the Next rewrite, but rewrites do not proxy
    // WebSocket upgrades — pointing the socket at the Next origin leaves it
    // retrying forever. NEXT_PUBLIC_SOCKET_URL names the API origin directly.
    const socketBase =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (apiBase.startsWith('/') ? '' : apiBase.replace('/api/v1', ''));
    const socket = io(`${socketBase}/crm`, {
      auth: { token },
      // Keep polling as a fallback: websocket-only fails hard behind any proxy
      // that cannot upgrade.
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      set({ connected: true });
    });
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      set({ connected: false });
    });
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      set({ socket: null, connected: false });
    }
  },
}));
