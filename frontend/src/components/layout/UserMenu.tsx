import { useRef } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Menu, useMenu } from '@/components/ui/Menu';

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useMenu();
  if (!user) return null;

  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => menu.openBelow(trigger.current!)}
        className="flex items-center gap-2 rounded-full p-0.5 pr-0.5 transition hover:bg-surface-3 sm:pr-3"
        aria-label="Меню пользователя"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white">
          {initials}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-medium sm:block">{user.name}</span>
      </button>
      <Menu
        position={menu.position}
        onClose={menu.close}
        align="end"
        items={[
          ...(user.role === 'ADMIN' ? [{ label: 'Админ-панель', icon: <Shield />, onSelect: () => navigate('/admin') }] : []),
          {
            label: 'Выйти',
            icon: <LogOut />,
            onSelect: () => {
              logout();
              navigate('/login');
            },
          },
        ]}
      />
    </>
  );
}
