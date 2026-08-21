import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const applyTheme = (theme) => {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldDark = theme === 'dark' || (theme === 'system' && prefersDark);
  root.classList.toggle('dark', shouldDark);
};

let mediaListenerAdded = false;

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark',

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },

      initTheme: () => {
        const { theme } = get();
        applyTheme(theme);
        if (!mediaListenerAdded) {
          mediaListenerAdded = true;
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (get().theme === 'system') applyTheme('system');
          });
        }
      },
    }),
    { name: 'theme-store' }
  )
);
