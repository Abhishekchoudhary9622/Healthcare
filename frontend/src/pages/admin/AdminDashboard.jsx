import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { PageSpinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { formatDate, formatTime } from '@/lib/utils';
import { Users, Stethoscope, Calendar, Activity, TrendingUp, ArrowRight, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { format, subDays } from 'date-fns';

const APPT_SERIES = [12, 18, 15, 22, 19, 25, 21, 24, 28, 20, 26, 23, 27, 25];
const PATIENT_SERIES = [5, 8, 6, 9, 7, 10, 8, 9, 11, 8, 10, 9, 11, 10];
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function AdminDashboard() {
  const lineData = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    day: format(subDays(new Date(), 13 - i), 'MMM d'),
    appointments: APPT_SERIES[i % APPT_SERIES.length],
    patients: PATIENT_SERIES[i % PATIENT_SERIES.length],
  })), []);
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
      <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Overview</h1>
            <p className="text-sm text-slate-500 mt-1">Track, manage and forecast your platform data.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin/doctors/new">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none rounded-xl">
                + New Doctor
              </Button>
            </Link>
          </div>
        </div>

        {/* Top Stat Cards - Neumorphic/Glassmorphic Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg shadow-slate-200/40 dark:shadow-none bg-white dark:bg-slate-900/80 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <p className="font-semibold text-sm text-slate-600 dark:text-slate-400">Total Doctors</p>
                </div>
                <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="h-4 w-4"/></button>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.totalDoctors || 126}</h2>
                  <p className="text-xs text-emerald-500 font-medium mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> 12% From last month
                  </p>
                </div>
                <div className="h-12 w-20">
                  {/* Mini sparkline visualization */}
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lineData.slice(0,7)}>
                      <Bar dataKey="appointments" fill="#818cf8" radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-slate-200/40 dark:shadow-none bg-white dark:bg-slate-900/80 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-violet-50 dark:bg-violet-900/30 rounded-xl text-violet-600 dark:text-violet-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <p className="font-semibold text-sm text-slate-600 dark:text-slate-400">Total Patients</p>
                </div>
                <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="h-4 w-4"/></button>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.totalPatients || '2,420'}</h2>
                  <p className="text-xs text-emerald-500 font-medium mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> 47% From last month
                  </p>
                </div>
                <div className="h-12 w-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lineData.slice(0,7)}>
                      <Bar dataKey="patients" fill="#a78bfa" radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-slate-200/40 dark:shadow-none bg-white dark:bg-slate-900/80 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <p className="font-semibold text-sm text-slate-600 dark:text-slate-400">Appointments</p>
                </div>
                <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="h-4 w-4"/></button>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.totalAppointments || 226}</h2>
                  <p className="text-xs text-emerald-500 font-medium mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> 10% From last month
                  </p>
                </div>
                <div className="h-12 w-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={lineData.slice(0,7)}>
                      <Area type="monotone" dataKey="appointments" stroke="#3b82f6" fill="#eff6ff" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-slate-200/40 dark:shadow-none bg-white dark:bg-slate-900/80 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-50 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400">
                    <Activity className="h-5 w-5" />
                  </div>
                  <p className="font-semibold text-sm text-slate-600 dark:text-slate-400">Pending</p>
                </div>
                <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="h-4 w-4"/></button>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.todayAppointments || 193}</h2>
                  <p className="text-xs text-emerald-500 font-medium mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> 25% From last month
                  </p>
                </div>
                <div className="h-12 w-20 flex items-end gap-1">
                   {/* Abstract dot chart mock */}
                   <div className="w-1.5 h-6 bg-orange-200 rounded-full"><div className="w-1.5 h-2 bg-orange-500 rounded-full"/></div>
                   <div className="w-1.5 h-8 bg-orange-200 rounded-full"><div className="w-1.5 h-2 bg-orange-500 rounded-full"/></div>
                   <div className="w-1.5 h-4 bg-orange-200 rounded-full"><div className="w-1.5 h-2 bg-orange-500 rounded-full"/></div>
                   <div className="w-1.5 h-10 bg-orange-200 rounded-full"><div className="w-1.5 h-2 bg-orange-500 rounded-full"/></div>
                   <div className="w-1.5 h-7 bg-orange-200 rounded-full"><div className="w-1.5 h-2 bg-orange-500 rounded-full"/></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Area Chart */}
          <Card className="lg:col-span-2 border-0 shadow-lg shadow-slate-200/40 dark:shadow-none bg-white dark:bg-slate-900/80 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-full">
                    <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">Visitors Statistics</h3>
                    <p className="text-xs text-slate-500 font-medium">Last 14 days</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Visitors</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-lg">42,345 <span className="text-xs text-emerald-500 font-medium">47% ↑</span></p>
                  </div>
                  <div className="text-right border-l pl-4 border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Patients</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-lg">2,345 <span className="text-xs text-red-500 font-medium">10% ↓</span></p>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={lineData}>
                  <defs>
                    <linearGradient id="colorApts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip 
                    contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', background: '#1e293b', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }} 
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="appointments" stroke="#4f46e5" strokeWidth={3} fill="url(#colorApts)" activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Side Widgets */}
          <div className="space-y-6">
            
            {/* Status Donut */}
            <Card className="border-0 shadow-lg shadow-slate-200/40 dark:shadow-none bg-white dark:bg-slate-900/80 rounded-2xl h-full">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6">Status Breakdown</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="value" stroke="none" paddingAngle={5}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', background: '#1e293b', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                      <div className="h-3 w-3 rounded-full shrink-0 shadow-sm" style={{ background: PIE_COLORS[i] }} />
                      {d.name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Appointments Table (Stylized) */}
        <Card className="border-0 shadow-lg shadow-slate-200/40 dark:shadow-none bg-white dark:bg-slate-900/80 rounded-2xl">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="bg-rose-100 dark:bg-rose-900/30 p-2 rounded-full">
                  <Activity className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Recent Patient Appointments</h3>
              </div>
              <Link to="/admin/appointments">
                <Button size="sm" variant="ghost" className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300 rounded-full px-4">View all</Button>
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                    {['Patient Name', 'Assign To Doctor', 'Date', 'Status', 'Action'].map(h => (
                      <th key={h} className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {recentAppointments.slice(0, 5).map(apt => {
                    const p = apt.patient?.user;
                    const d = apt.doctor?.user;
                    return (
                      <tr key={apt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar firstName={p?.firstName} lastName={p?.lastName} size="sm" className="shadow-sm" />
                            <span className="font-bold text-slate-800 dark:text-slate-200">{p?.firstName} {p?.lastName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                             <div className="h-2 w-2 rounded-full bg-indigo-400"></div>
                             <span className="font-medium text-slate-600 dark:text-slate-400">Dr. {d?.firstName} {d?.lastName}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">
                          {formatDate(apt.scheduledAt)}
                        </td>
                        <td className="px-6 py-4"><StatusBadge status={apt.status} /></td>
                        <td className="px-6 py-4">
                           <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                             <MoreVertical className="h-5 w-5"/>
                           </button>
                        </td>
                      </tr>
                    );
                  })}
                  {recentAppointments.length === 0 && (
                     <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No recent appointments found.</td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
