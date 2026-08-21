import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

const Input = forwardRef(({ label, error, icon: Icon, className, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && (
      <label className="block text-sm font-medium text-[var(--text-secondary)]">
        {label}
      </label>
    )}
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Icon className="h-4 w-4 text-[var(--text-muted)]" />
        </div>
      )}
      <input
        ref={ref}
        className={cn(
          'input-base',
          Icon && 'pl-10',
          error && 'border-danger-500 focus:ring-danger-500/30 focus:border-danger-500',
          className
        )}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-danger-500">{error}</p>}
  </div>
));

Input.displayName = 'Input';
export default Input;
