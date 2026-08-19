import { create } from 'zustand';
import api, { toList } from '@/lib/api';

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
      // GET /users answers with a paginated envelope
      // ({ data, total, page, limit, totalPages }), not a bare array. Assigning
      // the envelope straight through made every users.map()/users.filter()
      // call site throw "users.map is not a function".
      set({ users: toList(data), isLoading: false });
    } catch (error) {
      set({ users: [], isLoading: false });
    }
  },
}));
