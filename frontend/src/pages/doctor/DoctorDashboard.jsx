import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/shared/StatCard';
import AppointmentCard from '@/components/shared/AppointmentCard';
import { Card, CardContent } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { StatusBadge, UrgencyBadge } from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { formatTime, formatDate } from '@/lib/utils';
import {
  Calendar, Users, Clock, CheckCircle, Activity, Stethoscope,
  AlertTriangle, ArrowRight, TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, subDays } from 'date-fns';

const PATIENT_COUNTS = [4, 7, 5, 8, 6, 9, 7];

export default function DoctorDashboard() {
  const { user } = useAuthStore();
  const weekData = useMemo(() => Array.from({ length: 7 }, (_, i) => ({
    day: format(subDays(new Date(), 6 - i), 'EEE'),
    patients: PATIENT_COUNTS[i % PATIENT_COUNTS.length],
  })), []);

  const { data, isLoading } = useQuery({
    queryKey: ['doctor-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/doctor/dashboard');
      return data.data;
    },
  });

  if (isLoading) return <DashboardLayout title="Dashboard"><PageSpinner /></DashboardLayout>;

  const { stats = {}, upcomingAppointments = [] } = data || {};

  return (
    <DashboardLayout title="Doctor Dashboard">
      <div className="space-y-6">
        {/* Welcome */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 to-violet-600 p-6 text-white">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <p className="text-white/70 text-sm">Welcome back,</p>
            <h2 className="text-2xl font-bold mt-0.5">Dr. {user?.firstName} {user?.lastName}</h2>
            <p className="mt-1.5 text-white/80 text-sm">
              You have <span className="font-bold text-white">{stats.todayCount || 0} appointments</span> today
            </p>
            <div className="mt-4 flex gap-2">
              <Link to="/doctor/today">
                <Button variant="ghost" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0" iconRight={ArrowRight}>
                  Today's Schedule
                </Button>
              </Link>
              <Link to="/doctor/appointments">
                <Button variant="ghost" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0">
                  All Appointments
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Today"     value={stats.todayCount}   icon={Calendar}  color="brand"   />
          <StatCard title="This Week" value={stats.weekCount}    icon={TrendingUp} color="violet"  />
          <StatCard title="Pending"   value={stats.pendingCount} icon={Clock}     color="warning" />
          <StatCard title="Total"     value={stats.totalCount}   icon={Users}     color="accent"  />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Chart */}
          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--text-primary)]">Patient Activity</h3>
                <span className="text-xs text-[var(--text-muted)]">Last 7 days</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weekData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', background: 'var(--bg-secondary)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    cursor={{ fill: 'var(--bg-tertiary)' }}
                  />
                  <Bar dataKey="patients" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Upcoming */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--text-primary)]">Upcoming</h3>
              <Link to="/doctor/appointments">
                <Button size="sm" variant="ghost" iconRight={ArrowRight}>View all</Button>
              </Link>
            </div>
            {upcomingAppointments.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <Calendar className="h-8 w-8 mx-auto text-[var(--text-muted)] mb-2" />
                  <p className="text-sm text-[var(--text-secondary)]">No upcoming appointments</p>
                </CardContent>
              </Card>
            ) : (
              upcomingAppointments.map(apt => {
                const p = apt.patient?.user;
                return (
                  <Card key={apt.id} hover>
                    <CardContent className="p-4 flex items-center gap-3">
                      <Avatar firstName={p?.firstName} lastName={p?.lastName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {p?.firstName} {p?.lastName}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {formatDate(apt.scheduledAt, 'MMM d')} Â· {formatTime(apt.scheduledAt)}
                        </p>
                      </div>
                      {apt.urgencyLevel && <UrgencyBadge level={apt.urgencyLevel} />}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
