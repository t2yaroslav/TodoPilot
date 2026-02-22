import { create } from 'zustand';
import { getMe, updateMe } from '@/api/client';

interface User {
  id: string;
  email: string;
  name: string | null;
  profile_text: string | null;
  settings: Record<string, unknown> | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  setToken: (token: string) => void;
  logout: () => void;
  fetchUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: true,

  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  fetchUser: async () => {
    try {
      const { data } = await getMe();
      set({ user: data, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  updateUser: async (updates) => {
    const { data } = await updateMe(updates);
    set({ user: data });
  },
}));
