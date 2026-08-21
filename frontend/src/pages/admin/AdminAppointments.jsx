import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { StatusBadge, UrgencyBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import Select from '@/components/ui/Select';
import api from '@/lib/api';
import { cn, formatDate, formatTime } from '@/lib/utils';
import { Calendar } from 'lucide-react';

const STATUSES = ['All', 'CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED'];

export default function AdminAppointments() {
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-appointments', status, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 15 });
      if (status !== 'All') params.set('status', status);
      const { data } = await api.get(`/admin/appointments?${params}`);
      return data.data;
    },
  });

  const appointments = data?.appointments || [];
  const pagination = data?.pagination;

  return (
    <DashboardLayout title="All Appointments">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">All Appointments</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{pagination?.total || 0} total</p>
          </div>
        </div>

        <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--bg-tertiary)] w-fit">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                status === s ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-card' : 'text-[var(--text-muted)]'
              )}
            >
              {s === 'All' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {isLoading ? <PageSpinner /> : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
                    {['Patient', 'Doctor', 'Date / Time', 'Status', 'Urgency'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {appointments.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-[var(--text-muted)]">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />No appointments
                    </td></tr>
                  ) : appointments.map(apt => {
                    const p = apt.patient?.user;
                    const d = apt.doctor?.user;
                    return (
                      <tr key={apt.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar firstName={p?.firstName} lastName={p?.lastName} size="xs" />
                            <span className="text-[var(--text-primary)]">{p?.firstName} {p?.lastName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">Dr. {d?.firstName} {d?.lastName}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          {formatDate(apt.scheduledAt)} Â· {formatTime(apt.scheduledAt)}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={apt.status} /></td>
                        <td className="px-4 py-3">
                          {apt.urgencyLevel ? <UrgencyBadge level={apt.urgencyLevel} /> : <span className="text-[var(--text-muted)]">â€”</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-sm text-[var(--text-secondary)] px-2">Page {page} of {pagination.pages}</span>
            <Button variant="secondary" size="sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
