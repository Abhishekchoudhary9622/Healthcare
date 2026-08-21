import { cn } from '@/lib/utils';

export default function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8', xl: 'h-12 w-12' };
  return (
    <div className={cn('animate-spin rounded-full border-2 border-[var(--border)] border-t-brand-500', sizes[size], className)} />
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <Spinner size="lg" />
    </div>
  );
}
