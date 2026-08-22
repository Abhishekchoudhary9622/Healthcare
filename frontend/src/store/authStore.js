import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (val) => set({ _hasHydrated: val }),

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        const { user, accessToken, refreshToken } = data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ user, accessToken, refreshToken, isAuthenticated: true });
        return user;
      },

      register: async (payload) => {
        const { data } = await api.post('/auth/register', payload);
        const { user, accessToken, refreshToken } = data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ user, accessToken, refreshToken, isAuthenticated: true });
        return user;
      },

      logout: async () => {
        try { await api.post('/auth/logout', { refreshToken: get().refreshToken }); } catch {}
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        try {
          const { data } = await api.get('/auth/me');
          const current = get().user;
          if (JSON.stringify(current) !== JSON.stringify(data.data)) {
            set({ user: data.data });
          }
          return data.data;
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
          return null;
        }
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Called once localStorage has finished loading into the store
        if (state) state.setHasHydrated(true);
      },
    }
  )
);
