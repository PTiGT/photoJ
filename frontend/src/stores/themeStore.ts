import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function resolveDark(theme: ThemePreference) {
  return theme === 'dark' || (theme === 'system' && Boolean(media?.matches));
}

function apply(theme: ThemePreference) {
  document.documentElement.classList.toggle('dark', resolveDark(theme));
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        apply(theme);
        set({ theme });
      },
    }),
    { name: 'qa-theme', onRehydrateStorage: () => (state) => state && apply(state.theme) },
  ),
);

media?.addEventListener('change', () => apply(useThemeStore.getState().theme));
