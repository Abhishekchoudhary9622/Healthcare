import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export default function Select({ label, error, className, children, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-[var(--text-secondary)]">{label}</label>}
      <div className="relative">
        <select
          className={cn(
            'input-base appearance-none pr-9',
            error && 'border-danger-500',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
      </div>
      {error && <p className="text-xs text-danger-500">{error}</p>}
    </div>
  );
}
