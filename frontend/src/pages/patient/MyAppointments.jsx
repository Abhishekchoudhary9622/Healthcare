import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AppointmentCard from '@/components/shared/AppointmentCard';
import AppointmentDetailModal from './AppointmentDetailModal';
import Button from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUSES = ['All', 'CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED'];

export default function MyAppointments() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['patient-appointments', status, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 8 });
      if (status !== 'All') params.set('status', status);
      const { data } = await api.get(`/appointments/mine?${params}`);
      return data.data;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, cancelReason }) => api.patch(`/appointments/${id}/cancel`, { cancelReason }),
    onSuccess: () => {
      qc.invalidateQueries(['patient-appointments']);
      setSelected(null);
      toast({ type: 'success', title: 'Appointment cancelled' });
    },
    onError: (err) => toast({ type: 'error', title: 'Error', message: err.response?.data?.message }),
  });

  const appointments = data?.appointments || [];
  const pagination = data?.pagination;

  return (
    <DashboardLayout title="My Appointments">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">My Appointments</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{pagination?.total || 0} total appointments</p>
          </div>
          <Link to="/patient/doctors">
            <Button icon={Calendar}>Book New</Button>
          </Link>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--bg-tertiary)] w-fit overflow-x-auto">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                status === s
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-card'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              {s === 'All' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <PageSpinner />
        ) : appointments.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-3 opacity-50" />
            <p className="text-[var(--text-secondary)] font-medium">No appointments found</p>
            <Link to="/patient/doctors" className="inline-block mt-3">
              <Button size="sm">Book an Appointment</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {appointments.map(apt => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                role="PATIENT"
                onView={setSelected}
                onCancel={(a) => {
                  if (confirm('Cancel this appointment?')) {
                    cancelMutation.mutate({ id: a.id, cancelReason: 'Patient cancelled' });
                  }
                }}
              />
            ))}
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-sm text-[var(--text-secondary)]">Page {page} of {pagination.pages}</span>
            <Button variant="secondary" size="sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      <AppointmentDetailModal
        appointment={selected}
        role="PATIENT"
        onClose={() => setSelected(null)}
        onCancel={(a) => cancelMutation.mutate({ id: a.id, cancelReason: 'Patient cancelled' })}
      />
    </DashboardLayout>
  );
}
