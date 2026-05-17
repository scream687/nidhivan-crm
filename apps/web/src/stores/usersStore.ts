import { create } from 'zustand';
import api from '@/lib/api';

interface UsersState {
  users: any[];
  isLoading: boolean;
  fetchUsers: () => Promise<void>;
}

export const useUsersStore = create<UsersState>((set) => ({
  users: [],
  isLoading: false,
  fetchUsers: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/users');
      set({ users: data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },
}));
