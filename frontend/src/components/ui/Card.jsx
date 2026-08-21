import { cn } from '@/lib/utils';

export function Card({ className, children, hover = false, ...props }) {
  return (
    <div
      className={cn(
        'card',
        hover && 'hover:shadow-card-hover transition-shadow duration-200 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }) {
  return (
    <div className={cn('px-5 pt-5 pb-0', className)}>{children}</div>
  );
}

export function CardTitle({ className, children }) {
  return (
    <h3 className={cn('text-base font-semibold text-[var(--text-primary)]', className)}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}
