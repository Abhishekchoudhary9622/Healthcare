import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ title, value, icon: Icon, color = 'brand', trend, subtitle, className }) {
  const colorMap = {
    brand:   { bg: 'bg-brand-50 dark:bg-brand-500/10',   icon: 'text-brand-600 dark:text-brand-400',   border: 'border-brand-200 dark:border-brand-500/20' },
    accent:  { bg: 'bg-accent-50 dark:bg-accent-500/10', icon: 'text-accent-600 dark:text-accent-400',  border: 'border-accent-200 dark:border-accent-500/20' },
    danger:  { bg: 'bg-danger-50 dark:bg-danger-500/10', icon: 'text-danger-500 dark:text-danger-400',  border: 'border-danger-200 dark:border-danger-500/20' },
    warning: { bg: 'bg-warning-50 dark:bg-warning-500/10', icon: 'text-warning-500 dark:text-warning-400', border: 'border-warning-200 dark:border-warning-500/20' },
    violet:  { bg: 'bg-violet-50 dark:bg-violet-500/10', icon: 'text-violet-600 dark:text-violet-400',  border: 'border-violet-200 dark:border-violet-500/20' },
  };

  const c = colorMap[color] || colorMap.brand;

  return (
    <div className={cn('stat-card', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{title}</p>
          <p className="mt-2 text-3xl font-bold text-[var(--text-primary)] tabular-nums">{value ?? '—'}</p>
          {subtitle && <p className="mt-1 text-xs text-[var(--text-secondary)]">{subtitle}</p>}
          {trend !== undefined && (
            <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', trend >= 0 ? 'text-accent-600' : 'text-danger-500')}>
              {trend >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              <span>{Math.abs(trend)}% vs last week</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('h-12 w-12 rounded-2xl flex items-center justify-center border', c.bg, c.border)}>
            <Icon className={cn('h-6 w-6', c.icon)} />
          </div>
        )}
      </div>
    </div>
  );
}
