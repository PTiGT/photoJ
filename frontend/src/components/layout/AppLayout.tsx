import { NavLink, Outlet } from 'react-router';
import { FileText, LayoutTemplate, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsAdmin } from '@/stores/authStore';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

function NavItem({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors [&_svg]:size-4',
          isActive ? 'bg-surface-3 text-fg' : 'text-muted hover:text-fg',
        )
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}

/** Shell for dashboard-like pages: sticky top bar + mobile bottom navigation. */
export function AppLayout() {
  const isAdmin = useIsAdmin();
  const links = [
    { to: '/', icon: <FileText />, label: 'Документы' },
    { to: '/templates', icon: <LayoutTemplate />, label: 'Шаблоны' },
    ...(isAdmin ? [{ to: '/admin', icon: <Shield />, label: 'Админ' }] : []),
  ];

  return (
    <div className="min-h-full pb-16 sm:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map((link) => (
              <NavItem key={link.to} to={link.to} icon={link.icon}>
                {link.label}
              </NavItem>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 backdrop-blur sm:hidden">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium [&_svg]:size-5', isActive ? 'text-accent' : 'text-muted')
            }
          >
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
