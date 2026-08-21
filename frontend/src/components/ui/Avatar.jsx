import { cn, getInitials } from '@/lib/utils';

const sizeMap = {
  xs:  'h-6 w-6 text-[10px]',
  sm:  'h-8 w-8 text-xs',
  md:  'h-10 w-10 text-sm',
  lg:  'h-12 w-12 text-base',
  xl:  'h-16 w-16 text-lg',
  '2xl': 'h-20 w-20 text-xl',
};

const colors = [
  'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
];

const getColor = (name) => {
  const code = (name || '').charCodeAt(0) % colors.length;
  return colors[code];
};

export default function Avatar({ firstName, lastName, src, size = 'md', className }) {
  const initials = getInitials(firstName, lastName);
  const color = getColor(firstName);

  if (src) {
    return (
      <img
        src={src}
        alt={initials}
        className={cn('rounded-full object-cover flex-shrink-0', sizeMap[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold flex-shrink-0',
        sizeMap[size],
        color,
        className
      )}
    >
      {initials}
    </div>
  );
}
