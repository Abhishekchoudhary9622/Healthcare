import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AppointmentCard from '@/components/shared/AppointmentCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import {
  Calendar, Stethoscope, ArrowRight, Activity, Bell, 
  FileText, HeartPulse, Pill, Droplet, FileHeart
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: aptData, isLoading: loadingApts } = useQuery({
    queryKey: ['patient-appointments'],
    queryFn: async () => {
      const { data } = await api.get('/appointments/mine?limit=5');
      return data.data;
    },
  });

  const { data: recordData } = useQuery({
    queryKey: ['patient-records'],
    queryFn: async () => {
      const { data } = await api.get('/records/timeline');
      return data;
    },
  });

  if (loadingApts) return <DashboardLayout title="Dashboard"><PageSpinner /></DashboardLayout>;

  const appointments = aptData?.appointments || [];
  const nextAppointment = appointments.find(a => ['CONFIRMED', 'PENDING'].includes(a.status));
  const recentRecords = recordData ? recordData.slice(0, 3) : [];

  return (
    <DashboardLayout title="Patient Dashboard">
      <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Top Banner - Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-indigo-600 to-violet-700 p-8 text-white shadow-xl shadow-brand-500/20">
          <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-10 translate-y-1/3 -translate-x-1/4 h-40 w-40 rounded-full bg-brand-400/20 blur-2xl" />
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-white/80 font-medium tracking-wide uppercase text-xs mb-1">Welcome back</p>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-6">
                Good Morning, {user?.firstName}
              </h2>
              
              {nextAppointment ? (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                  <p className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-2">Upcoming Appointment</p>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">Dr. {nextAppointment.doctor?.user?.firstName} {nextAppointment.doctor?.user?.lastName}</p>
                      <p className="text-white/80 text-sm">{formatDateTime(nextAppointment.scheduledAt)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                   <p className="text-white/80 text-sm mb-3">You have no upcoming appointments.</p>
                   <Link to="/patient/doctors">
                     <Button className="bg-white text-brand-600 hover:bg-brand-50 border-0" iconRight={ArrowRight}>Book Now</Button>
                   </Link>
                </div>
              )}
            </div>
            
            {/* Health Summary Card right in the banner */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 h-full">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5" /> Health Summary
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-black/20 rounded-xl p-3">
                  <p className="text-white/60 text-xs font-semibold mb-1">BMI</p>
                  <p className="font-bold text-xl">22.4</p>
                  <p className="text-emerald-400 text-[10px] mt-1 font-medium">Normal</p>
                </div>
                <div className="bg-black/20 rounded-xl p-3">
                  <p className="text-white/60 text-xs font-semibold mb-1">BP</p>
                  <p className="font-bold text-xl">120<span className="text-sm font-normal text-white/70">/80</span></p>
                  <p className="text-emerald-400 text-[10px] mt-1 font-medium">Optimal</p>
                </div>
                <div className="bg-black/20 rounded-xl p-3">
                  <p className="text-white/60 text-xs font-semibold mb-1">HEART</p>
                  <p className="font-bold text-xl">74 <span className="text-xs font-normal text-white/70">bpm</span></p>
                  <p className="text-emerald-400 text-[10px] mt-1 font-medium">Resting</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Assessment CTA (from before, just restyled to be sleek) */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 p-1 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative p-5 flex-1 flex flex-col md:flex-row items-center gap-4">
             <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
              <Activity className="h-6 w-6 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                AI Health Risk Assessment <span className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">New</span>
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
                Analyze your symptoms instantly and match with the right specialists using our AI engine.
              </p>
            </div>
          </div>
          <div className="relative px-6 pb-6 md:pb-0">
            <Link to="/patient/analytics" className="w-full md:w-auto">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none whitespace-nowrap" iconRight={ArrowRight}>
                Analyze Symptoms
              </Button>
            </Link>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Meds & Records */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Medications */}
            <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-none bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Pill className="h-5 w-5 text-emerald-500" /> Active Medications
                </CardTitle>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full">
                  2 Active
                </span>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Droplet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Paracetamol</p>
                        <p className="text-xs text-slate-500">500 mg · After meals</p>
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs font-semibold">
                      <span className="bg-emerald-500 text-white px-2 py-1 rounded-md">Morning ✓</span>
                      <span className="bg-emerald-500 text-white px-2 py-1 rounded-md">Afternoon ✓</span>
                      <span className="bg-slate-100 text-slate-400 dark:bg-slate-800 px-2 py-1 rounded-md">Night ○</span>
                    </div>
                  </div>
                  
                  {/* Adherence Progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-1.5 font-medium">
                      <span className="text-slate-600 dark:text-slate-300">Medication Adherence</span>
                      <span className="text-emerald-600 dark:text-emerald-400">82%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
                      <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2.5 rounded-full" style={{ width: '82%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Reports */}
            <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-none bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" /> Recent Medical Records
                </CardTitle>
                <Link to="/patient/records" className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                  View Timeline <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {recentRecords.length > 0 ? recentRecords.map(record => {
                    let Icon = FileText;
                    let color = "text-slate-500 bg-slate-100";
                    if(record.type === 'BLOOD_TEST') { Icon = Droplet; color = "text-red-500 bg-red-100 dark:bg-red-900/30"; }
                    if(record.type === 'ECG') { Icon = HeartPulse; color = "text-purple-500 bg-purple-100 dark:bg-purple-900/30"; }
                    if(record.type === 'PRESCRIPTION') { Icon = Pill; color = "text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30"; }

                    return (
                      <div key={record._id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                        <div className={`h-10 w-10 rounded-lg ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">{record.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(record.date).toLocaleDateString()}</p>
                      </div>
                    )
                  }) : (
                    <div className="col-span-3 text-center py-6 text-slate-500">No recent records</div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right Column: Appointments & Quick Links */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-none bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg">Appointments</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {appointments.slice(0, 2).map(apt => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    role="PATIENT"
                    compact
                    onView={() => navigate('/patient/appointments')}
                  />
                ))}
                {appointments.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-[var(--text-secondary)] text-sm mb-3">No appointments yet</p>
                    <Link to="/patient/doctors">
                      <Button size="sm" className="w-full">Book Now</Button>
                    </Link>
                  </div>
                )}
                {appointments.length > 2 && (
                  <Link to="/patient/appointments" className="block text-center text-sm text-brand-600 font-medium hover:underline pt-2">
                    View all appointments
                  </Link>
                )}
              </CardContent>
            </Card>

          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
