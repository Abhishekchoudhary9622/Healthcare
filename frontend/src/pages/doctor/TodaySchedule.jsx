import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge, UrgencyBadge } from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import PostVisitModal from './PostVisitModal';
import AppointmentDetailModal from '../patient/AppointmentDetailModal';
import api from '@/lib/api';
import { formatTime, formatDate } from '@/lib/utils';
import { Clock, CheckCircle, Eye, FileEdit, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

export default function TodaySchedule() {
  const [selected, setSelected] = useState(null);
  const [postVisit, setPostVisit] = useState(null);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['today-schedule'],
    queryFn: async () => {
      const { data } = await api.get('/doctor/schedule/today');
      return data.data;
    },
    refetchInterval: 60_000,
  });

  return (
    <DashboardLayout title="Today's Schedule">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Today's Schedule</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 text-sm font-medium">
            <CalendarDays className="h-4 w-4" />
            {appointments.length} appointments
          </div>
        </div>

        {isLoading ? <PageSpinner /> : appointments.length === 0 ? (
          <Card>
            <CardContent className="py-20 text-center">
              <CalendarDays className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-3 opacity-40" />
              <p className="text-[var(--text-secondary)] font-medium">No appointments today</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">Enjoy your free day!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt, idx) => {
              const p = apt.patient?.user;
              const now = new Date();
              const isNow = new Date(apt.scheduledAt) <= now && now <= new Date(apt.endsAt || apt.scheduledAt);
              const isPast = new Date(apt.endsAt || apt.scheduledAt) < now;

              return (
                <Card key={apt.id} className={isNow ? 'ring-2 ring-brand-500' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Time */}
                      <div className="text-center min-w-[60px]">
                        <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{formatTime(apt.scheduledAt)}</p>
                        {isNow && (
                          <span className="text-[10px] font-bold text-accent-500 uppercase">Now</span>
                        )}
                      </div>

                      <div className="w-px h-12 bg-[var(--border)]" />

                      <Avatar firstName={p?.firstName} lastName={p?.lastName} size="md" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-[var(--text-primary)]">
                            {p?.firstName} {p?.lastName}
                          </p>
                          <StatusBadge status={apt.status} />
                          {apt.urgencyLevel && <UrgencyBadge level={apt.urgencyLevel} />}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{p?.email} Â· {p?.phone}</p>
                        {apt.symptoms && (
                          <p className="text-xs text-[var(--text-secondary)] mt-1.5 bg-[var(--bg-tertiary)] rounded-lg px-2.5 py-1.5 line-clamp-2">
                            {apt.symptoms}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => setSelected(apt)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-brand-500 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {apt.status === 'CONFIRMED' && (
                          <button
                            onClick={() => setPostVisit(apt)}
                            className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-xs font-medium transition-colors"
                          >
                            <FileEdit className="h-3.5 w-3.5" />
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AppointmentDetailModal appointment={selected} role="DOCTOR" onClose={() => setSelected(null)} />
      <PostVisitModal appointment={postVisit} onClose={() => setPostVisit(null)} />
    </DashboardLayout>
  );
}
