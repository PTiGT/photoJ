import { Monitor, Moon, Sun } from 'lucide-react';
import { useThemeStore, type ThemePreference } from '@/stores/themeStore';
import { IconButton } from '@/components/ui/Button';

const NEXT: Record<ThemePreference, ThemePreference> = { light: 'dark', dark: 'system', system: 'light' };
const LABEL: Record<ThemePreference, string> = { light: 'Светлая тема', dark: 'Тёмная тема', system: 'Как в системе' };

export function ThemeToggle({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { theme, setTheme } = useThemeStore();
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  return (
    <IconButton label={`${LABEL[theme]} — переключить`} size={size} onClick={() => setTheme(NEXT[theme])}>
      <Icon />
    </IconButton>
  );
}
