import { Menu, Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import Avatar from '@/components/ui/Avatar';
import EmergencySOS from '@/components/shared/EmergencySOS';
import NotificationDropdown from '@/components/shared/NotificationDropdown';
import { cn } from '@/lib/utils';

export default function Topbar({ onMenuClick, title }) {
  const theme = useThemeStore(s => s.theme);
  const setTheme = useThemeStore(s => s.setTheme);
  const user = useAuthStore(s => s.user);

  const themes = [
    { key: 'light',  Icon: Sun },
    { key: 'dark',   Icon: Moon },
    { key: 'system', Icon: Monitor },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center px-4 gap-3">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden h-9 w-9 flex items-center justify-center rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Title */}
      {title && (
        <h1 className="text-base font-semibold text-[var(--text-primary)] hidden sm:block">{title}</h1>
      )}

      <div className="flex-1" />

      {/* Emergency SOS for Patients */}
      {user?.role === 'PATIENT' && <EmergencySOS />}

      {/* In-app Notification Bell */}
      <NotificationDropdown />

      {/* Theme switcher */}
      <div className="flex items-center gap-0.5 p-1 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]">
        {themes.map(({ key, Icon }) => (
          <button
            key={key}
            onClick={() => setTheme(key)}
            className={cn(
              'h-7 w-7 flex items-center justify-center rounded-lg',
              theme === key
                ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-card'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
            title={key}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>

      {/* User chip */}
      <div className="flex items-center gap-2.5">
        <Avatar firstName={user?.firstName} lastName={user?.lastName} src={user?.avatar} size="sm" />
        <div className="hidden md:block">
          <p className="text-sm font-medium text-[var(--text-primary)] leading-tight">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-[var(--text-muted)] capitalize">{user?.role?.toLowerCase()}</p>
        </div>
      </div>
    </header>
  );
}
