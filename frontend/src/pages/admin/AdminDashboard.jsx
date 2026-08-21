import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/shared/StatCard';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { PageSpinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { formatDate, formatTime } from '@/lib/utils';
import { Users, Stethoscope, Calendar, Activity, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, subDays } from 'date-fns';

const lineData = Array.from({ length: 14 }, (_, i) => ({
  day: format(subDays(new Date(), 13 - i), 'MMM d'),
  appointments: Math.floor(Math.random() * 20 + 5),
  patients: Math.floor(Math.random() * 10 + 2),
}));

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#f43f5e'];

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard');
      return data.data;
    },
  });

  if (isLoading) return <DashboardLayout title="Admin Dashboard"><PageSpinner /></DashboardLayout>;

  const { stats = {}, recentAppointments = [] } = data || {};

  const pieData = [
    { name: 'Confirmed',  value: recentAppointments.filter(a => a.status === 'CONFIRMED').length || 5 },
    { name: 'Completed',  value: recentAppointments.filter(a => a.status === 'COMPLETED').length || 8 },
    { name: 'Pending',    value: recentAppointments.filter(a => a.status === 'PENDING').length  || 3 },
    { name: 'Cancelled',  value: recentAppointments.filter(a => a.status === 'CANCELLED').length || 2 },
  ];

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Admin Overview</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Platform-wide statistics</p>
          </div>
          <Link to="/admin/doctors/new">
            <Button icon={Stethoscope}>Add Doctor</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Doctors"   value={stats.totalDoctors}       icon={Stethoscope} color="brand"   />
          <StatCard title="Total Patients"  value={stats.totalPatients}      icon={Users}       color="violet"  />
          <StatCard title="Appointments"    value={stats.totalAppointments}  icon={Calendar}    color="accent"  />
          <StatCard title="Today"           value={stats.todayAppointments}  icon={Activity}    color="warning" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Line chart */}
          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--text-primary)]">Appointment Trends</h3>
                <span className="text-xs text-[var(--text-muted)]">Last 14 days</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', background: 'var(--bg-secondary)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="appointments" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="patients" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <div className="h-2.5 w-2.5 rounded-full bg-brand-500" />Appointments
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <div className="h-2.5 w-2.5 rounded-full bg-accent-500" />New Patients
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pie */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-[var(--text-primary)] mb-4">Status Breakdown</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', background: 'var(--bg-secondary)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                    {d.name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent appointments table */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-5 pb-3">
              <h3 className="font-semibold text-[var(--text-primary)]">Recent Appointments</h3>
              <Link to="/admin/appointments">
                <Button size="sm" variant="ghost" iconRight={ArrowRight}>View all</Button>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-[var(--border)] bg-[var(--bg-tertiary)]">
                    {['Patient', 'Doctor', 'Date', 'Status'].map(h => (
                      <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {recentAppointments.slice(0, 6).map(apt => {
                    const p = apt.patient?.user;
                    const d = apt.doctor?.user;
                    return (
                      <tr key={apt.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar firstName={p?.firstName} lastName={p?.lastName} size="xs" />
                            <span className="text-[var(--text-primary)]">{p?.firstName} {p?.lastName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-[var(--text-secondary)]">Dr. {d?.firstName} {d?.lastName}</td>
                        <td className="px-5 py-3 text-[var(--text-secondary)]">
                          {formatDate(apt.scheduledAt)} Â· {formatTime(apt.scheduledAt)}
                        </td>
                        <td className="px-5 py-3"><StatusBadge status={apt.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
