import { create } from 'zustand';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { useEffect } from 'react';

const icons = {
  success: <CheckCircle2 className="h-4 w-4 text-accent-500" />,
  error:   <XCircle className="h-4 w-4 text-danger-500" />,
  warning: <AlertCircle className="h-4 w-4 text-warning-500" />,
  info:    <Info className="h-4 w-4 text-brand-500" />,
};

const colors = {
  success: 'border-l-accent-500',
  error:   'border-l-danger-500',
  warning: 'border-l-warning-500',
  info:    'border-l-brand-500',
};

export const useToast = create((set) => ({
  toasts: [],
  toast: ({ type = 'info', title, message, duration = 4000 }) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, type, title, message, duration }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

function ToastItem({ toast, dismiss }) {
  return (
    <div
      className={cn(
        'card border-l-4 p-4 flex gap-3 items-start min-w-[300px] max-w-sm shadow-card-lg',
        colors[toast.type]
      )}
    >
      <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        {toast.title && <p className="text-sm font-semibold text-[var(--text-primary)]">{toast.title}</p>}
        {toast.message && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{toast.message}</p>}
      </div>
      <button onClick={() => dismiss(toast.id)} className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => <ToastItem key={t.id} toast={t} dismiss={dismiss} />)}
    </div>
  );
}
