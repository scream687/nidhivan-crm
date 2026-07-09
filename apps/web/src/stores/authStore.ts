'use client';
import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: string; name: string; email: string; role: string;
  avatarUrl?: string; phone?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user });
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null });
    window.location.href = '/login';
  },

  fetchMe: async () => {
    if (!localStorage.getItem('accessToken') && !document.cookie.includes('accessToken=')) {
      set({ user: null, isLoading: false });
      return;
    }
    set({ isLoading: true });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },
}));
