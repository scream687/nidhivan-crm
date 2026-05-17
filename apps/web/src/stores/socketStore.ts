'use client';
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface SocketState {
  socket: Socket | null;
  connect: (token: string) => void;
  disconnect: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,

  connect: (token) => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io(`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000'}/crm`, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => console.log('Socket connected'));
    socket.on('disconnect', () => console.log('Socket disconnected'));

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) { socket.disconnect(); set({ socket: null }); }
  },
}));
