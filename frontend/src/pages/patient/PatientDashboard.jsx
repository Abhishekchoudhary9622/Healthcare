import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/shared/StatCard';
import AppointmentCard from '@/components/shared/AppointmentCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { formatDateTime, statusConfig } from '@/lib/utils';
import {
  Calendar, Clock, CheckCircle, XCircle, Stethoscope,
  ArrowRight, Activity, Bell,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

const chartData = Array.from({ length: 7 }, (_, i) => ({
  day: format(subDays(new Date(), 6 - i), 'EEE'),
  appointments: Math.floor(Math.random() * 3),
}));

export default function PatientDashboard() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['patient-appointments'],
    queryFn: async () => {
      const { data } = await api.get('/appointments/mine?limit=5');
      return data.data;
    },
  });

  if (isLoading) return <DashboardLayout title="Dashboard"><PageSpinner /></DashboardLayout>;

  const appointments = data?.appointments || [];
  const stats = {
    upcoming:  appointments.filter(a => ['CONFIRMED', 'PENDING'].includes(a.status)).length,
    completed: appointments.filter(a => a.status === 'COMPLETED').length,
    cancelled: appointments.filter(a => a.status === 'CANCELLED').length,
  };

  const nextAppointment = appointments.find(a => ['CONFIRMED', 'PENDING'].includes(a.status));

  return (
    <DashboardLayout title="Patient Dashboard">
      <div className="space-y-6">
        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 to-violet-600 p-6 text-white">
          <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <p className="text-white/70 text-sm">Good morning,</p>
            <h2 className="text-2xl font-bold mt-0.5">
              {user?.firstName} {user?.lastName}
            </h2>
            {nextAppointment ? (
              <p className="mt-2 text-white/80 text-sm">
                Next: <span className="text-white font-medium">
                  Dr. {nextAppointment.doctor?.user?.firstName} {nextAppointment.doctor?.user?.lastName}
                </span> Â· {formatDateTime(nextAppointment.scheduledAt)}
              </p>
            ) : (
              <p className="mt-2 text-white/80 text-sm">No upcoming appointments. Book one now!</p>
            )}
            <div className="mt-4 flex gap-2">
              <Link to="/patient/doctors">
                <Button variant="ghost" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0" iconRight={ArrowRight}>
                  Find a Doctor
                </Button>
              </Link>
              <Link to="/patient/appointments">
                <Button variant="ghost" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0">
                  My Appointments
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Upcoming"  value={stats.upcoming}  icon={Clock}         color="brand"   />
          <StatCard title="Completed" value={stats.completed} icon={CheckCircle}    color="accent"  />
          <StatCard title="Cancelled" value={stats.cancelled} icon={XCircle}        color="danger"  />
          <StatCard title="Doctors Seen" value={new Set(appointments.map(a => a.doctor?.id)).size} icon={Stethoscope} color="violet" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent appointments */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[var(--text-primary)]">Recent Appointments</h2>
              <Link to="/patient/appointments">
                <Button size="sm" variant="ghost" iconRight={ArrowRight}>View all</Button>
              </Link>
            </div>
            {appointments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-10 w-10 mx-auto text-[var(--text-muted)] mb-3" />
                  <p className="text-[var(--text-secondary)] text-sm">No appointments yet</p>
                  <Link to="/patient/doctors" className="mt-3 inline-block">
                    <Button size="sm" className="mt-2">Book your first appointment</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              appointments.slice(0, 3).map(apt => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  role="PATIENT"
                  compact
                  onView={(a) => window.location.href = `/patient/appointments`}
                />
              ))
            )}
          </div>

          {/* Activity chart */}
          <div className="space-y-3">
            <h2 className="font-semibold text-[var(--text-primary)]">Activity (7 days)</h2>
            <Card>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorApts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', background: 'var(--bg-secondary)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="appointments" stroke="#6366f1" fill="url(#colorApts)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-brand-500" />
                    <span className="text-xs font-medium text-[var(--text-secondary)]">Total appointments</span>
                  </div>
                  <span className="text-lg font-bold text-[var(--text-primary)]">{data?.pagination?.total || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Quick Actions</p>
                <Link to="/patient/doctors" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors">
                  <div className="h-8 w-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
                    <Stethoscope className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Find Doctors</p>
                    <p className="text-xs text-[var(--text-muted)]">Browse by specialisation</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--text-muted)] ml-auto" />
                </Link>
                <Link to="/patient/appointments" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors">
                  <div className="h-8 w-8 rounded-lg bg-accent-50 dark:bg-accent-500/10 flex items-center justify-center">
                    <Bell className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Reminders</p>
                    <p className="text-xs text-[var(--text-muted)]">Medication & follow-ups</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--text-muted)] ml-auto" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
