import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO, isToday, isTomorrow, isPast } from 'date-fns';

export const cn = (...inputs) => twMerge(clsx(inputs));

export const formatDate = (date, fmt = 'MMM d, yyyy') => {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt);
};

export const formatTime = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'h:mm a');
};

export const formatDateTime = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
};

export const timeAgo = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
};

export const isAppointmentPast = (date) => {
  if (!date) return false;
  return isPast(typeof date === 'string' ? parseISO(date) : date);
};

export const getInitials = (firstName, lastName) => {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
};

export const statusConfig = {
  CONFIRMED:   { label: 'Confirmed',   color: 'bg-accent-100 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400' },
  PENDING:     { label: 'Pending',     color: 'bg-warning-50 text-warning-500 dark:bg-warning-500/10 dark:text-warning-400' },
  COMPLETED:   { label: 'Completed',   color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  CANCELLED:   { label: 'Cancelled',   color: 'bg-danger-50 text-danger-500 dark:bg-danger-500/10 dark:text-danger-400' },
  RESCHEDULED: { label: 'Rescheduled', color: 'bg-brand-100 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' },
  HELD:        { label: 'Held',        color: 'bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400' },
};

export const urgencyConfig = {
  LOW:    { label: 'Low',    color: 'bg-accent-100 text-accent-600',  dot: 'bg-accent-500' },
  MEDIUM: { label: 'Medium', color: 'bg-warning-50 text-warning-500', dot: 'bg-warning-500' },
  HIGH:   { label: 'High',   color: 'bg-danger-50 text-danger-500',   dot: 'bg-danger-500' },
};

export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹500';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

export const SPECIALISATIONS = [
  'General Practice', 'Cardiology', 'Dermatology', 'Neurology',
  'Orthopedics', 'Pediatrics', 'Psychiatry', 'Oncology',
  'Ophthalmology', 'ENT', 'Gynecology', 'Urology',
  'Endocrinology', 'Pulmonology', 'Gastroenterology', 'Nephrology',
];
