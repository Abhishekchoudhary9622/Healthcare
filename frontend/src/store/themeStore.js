import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const applyTheme = (theme = 'light') => {
  const root = document.documentElement;
  // User requested clean Light mode UI/UX throughout
  root.classList.remove('dark');
};

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'light',

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },

      initTheme: () => {
        applyTheme('light');
      },
    }),
    { name: 'theme-store' }
  )
);
