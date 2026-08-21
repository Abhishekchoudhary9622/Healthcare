import { cn } from '@/lib/utils';
import { statusConfig, urgencyConfig } from '@/lib/utils';

export function Badge({ className, children }) {
  return (
    <span className={cn('badge', className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const cfg = statusConfig[status] || { label: status, color: 'bg-slate-100 text-slate-600' };
  return <span className={cn('badge', cfg.color)}>{cfg.label}</span>;
}

export function UrgencyBadge({ level }) {
  const cfg = urgencyConfig[level] || urgencyConfig.MEDIUM;
  return (
    <span className={cn('badge', cfg.color)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}
