import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PostVisitModal from './PostVisitModal';
import AppointmentDetailModal from '../patient/AppointmentDetailModal';
import Button from '@/components/ui/Button';
import { StatusBadge, UrgencyBadge } from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { cn, formatDate, formatTime } from '@/lib/utils';
import api from '@/lib/api';
import { Calendar, Clock, FileEdit, Eye, Filter, Video } from 'lucide-react';
import Input from '@/components/ui/Input';

const STATUSES = ['All', 'CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED'];

export default function DoctorAppointments() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState('All');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [postVisit, setPostVisit] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['doctor-appointments', status, date, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 10 });
      if (status !== 'All') params.set('status', status);
      if (date) params.set('date', date);
      const { data } = await api.get(`/doctor/appointments?${params}`);
      return data.data;
    },
  });

  const appointments = data?.appointments || [];
  const pagination = data?.pagination;

  return (
    <DashboardLayout title="Appointments">
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Appointments</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{pagination?.total || 0} total records</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--bg-tertiary)] overflow-x-auto">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                  status === s ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-card' : 'text-[var(--text-muted)]'
                )}
              >
                {s === 'All' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <Input
            type="date"
            className="sm:w-44"
            value={date}
            onChange={(e) => { setDate(e.target.value); setPage(1); }}
          />
          {date && <Button variant="secondary" size="md" onClick={() => setDate('')}>Clear date</Button>}
        </div>

        {/* Table */}
        {isLoading ? <PageSpinner /> : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
                    {['Patient', 'Date', 'Time', 'Status', 'Urgency', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-[var(--text-muted)]">
                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        No appointments found
                      </td>
                    </tr>
                  ) : (
                    appointments.map(apt => {
                      const p = apt.patient?.user;
                      return (
                        <tr key={apt.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar firstName={p?.firstName} lastName={p?.lastName} size="sm" />
                              <div>
                                <p className="font-medium text-[var(--text-primary)]">{p?.firstName} {p?.lastName}</p>
                                <p className="text-xs text-[var(--text-muted)]">{p?.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">{formatDate(apt.scheduledAt)}</td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">{formatTime(apt.scheduledAt)}</td>
                          <td className="px-4 py-3"><StatusBadge status={apt.status} /></td>
                          <td className="px-4 py-3">
                            {apt.urgencyLevel ? <UrgencyBadge level={apt.urgencyLevel} /> : <span className="text-[var(--text-muted)]">â€”</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {['CONFIRMED', 'PENDING', 'WAITING'].includes(apt.status) && (
                                <Link
                                  to={`/telemedicine/consultation_${apt.id || apt._id}`}
                                  className="h-7 w-7 flex items-center justify-center rounded-lg bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 transition-colors"
                                  title="Join Live Video Visit"
                                >
                                  <Video className="h-4 w-4 text-teal-400" />
                                </Link>
                              )}
                              <button
                                onClick={() => setSelected(apt)}
                                className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-brand-500 transition-colors"
                                title="View"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {apt.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => setPostVisit(apt)}
                                  className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-accent-50 dark:hover:bg-accent-500/10 text-[var(--text-muted)] hover:text-accent-500 transition-colors"
                                  title="Add post-visit notes"
                                >
                                  <FileEdit className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
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

      <AppointmentDetailModal appointment={selected} role="DOCTOR" onClose={() => setSelected(null)} />
      <PostVisitModal appointment={postVisit} onClose={() => setPostVisit(null)} />
    </DashboardLayout>
  );
}
