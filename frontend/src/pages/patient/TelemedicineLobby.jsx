import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import {
  Video, Phone, Calendar, Clock, Star, ShieldCheck,
  Stethoscope, User, ArrowRight, Search, CheckCircle2, Award,
  Users, AlertTriangle
} from 'lucide-react';

export default function TelemedicineLobby() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');

  const isDoctor = user?.role === 'DOCTOR';

  // 1. Fetch appointments
  const { data: aptData, isLoading: aptsLoading } = useQuery({
    queryKey: ['my-telemedicine-appointments', isDoctor],
    queryFn: async () => {
      const endpoint = isDoctor ? '/doctor/appointments?status=CONFIRMED&limit=10' : '/appointments/mine?status=CONFIRMED&limit=10';
      const res = await api.get(endpoint);
      return res.data.data;
    }
  });

  // 2. Fetch list of verified doctors (only needed for patients)
  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ['telemedicine-doctors', searchTerm, selectedSpecialty],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.set('name', searchTerm);
      if (selectedSpecialty !== 'All') params.set('specialisation', selectedSpecialty);
      const res = await api.get(`/appointments/doctors/search?${params}`);
      return res.data.data;
    },
    enabled: !isDoctor // Disable doctor search for doctor accounts
  });

  const appointments = aptData?.appointments || [];
  const doctors = docsData?.doctors || [];

  const specialties = ['All', 'Cardiology', 'Dermatology', 'Pediatrics', 'General Practice', 'Neurology', 'Orthopedics'];

  const handleInstantCall = (doc) => {
    const roomId = `doc_call_${doc.id || doc._id}_${Date.now()}`;
    toast({ type: 'info', title: 'Connecting...', message: `Starting secure video room with Dr. ${doc.firstName} ${doc.lastName}` });
    navigate(`/telemedicine/${roomId}`);
  };

  return (
    <DashboardLayout title={isDoctor ? 'Doctor Video Consultation Queue' : 'Live Video Telemedicine'}>
      <div className="space-y-6">
        
        {/* Hero Header Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-[#07172b] via-[#0b2444] to-[#083042] border border-teal-500/20 p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 h-64 w-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                {isDoctor ? 'Doctor Clinical Video Console' : 'Live Video Telehealth Network'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {isDoctor ? 'Patient Video Consultation Queue' : 'Connect with Top Doctors via HD Video'}
              </h1>
              <p className="text-slate-300 text-sm leading-relaxed">
                {isDoctor
                  ? 'Accept incoming patient video calls, conduct remote diagnosis, share medical notes, and issue digital prescriptions.'
                  : 'Start an instant video consultation, join your scheduled visit, and receive digital prescriptions right from your home.'}
              </p>
            </div>

            <div className="flex items-center gap-3 bg-[#071322]/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700/60 shrink-0">
              <div className="h-12 w-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Session Security</p>
                <p className="text-sm font-bold text-white">256-Bit P2P Encrypted</p>
                <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">HIPAA Compliant</p>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* DOCTOR DOMAIN VIEW: INCOMING PATIENT VIDEO CALL REQUESTS */}
        {/* ======================================================== */}
        {isDoctor ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Users className="h-4 w-4 text-teal-500" />
                  Scheduled Patient Video Calls ({appointments.length})
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Select a patient to enter their consultation room and start the video call
                </p>
              </div>
            </div>

            {aptsLoading ? (
              <PageSpinner />
            ) : appointments.length === 0 ? (
              <Card className="border-[var(--border)] bg-[var(--bg-secondary)]">
                <CardContent className="py-16 text-center space-y-3">
                  <Video className="h-12 w-12 mx-auto text-slate-500 opacity-40" />
                  <p className="text-sm text-[var(--text-primary)] font-bold">No Pending Patient Calls</p>
                  <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                    You currently have no patient video calls in queue. Newly scheduled appointments will appear here automatically.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appointments.map((apt) => {
                  const patientUser = apt.patient?.user;
                  return (
                    <Card key={apt.id || apt._id} hover className="border-teal-500/30 bg-[var(--bg-secondary)] overflow-hidden">
                      <CardContent className="p-5 space-y-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar firstName={patientUser?.firstName} lastName={patientUser?.lastName} size="md" />
                            <div>
                              <p className="font-bold text-sm text-[var(--text-primary)]">
                                {patientUser ? `${patientUser.firstName} ${patientUser.lastName}` : 'Patient'}
                              </p>
                              <p className="text-xs text-[var(--text-muted)]">{patientUser?.email || patientUser?.phone}</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                            Ready for Call
                          </span>
                        </div>

                        <div className="bg-[var(--bg-tertiary)] p-3 rounded-xl space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-teal-400" />
                              {formatDate(apt.scheduledAt)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-teal-400" />
                              {formatTime(apt.scheduledAt)}
                            </span>
                          </div>
                          {apt.symptoms && (
                            <p className="text-slate-300 text-[11px] pt-1 border-t border-[var(--border)] line-clamp-2">
                              <strong>Symptoms:</strong> {apt.symptoms}
                            </p>
                          )}
                        </div>

                        <Link to={`/telemedicine/consultation_${apt.id || apt._id}`} className="block">
                          <Button className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-extrabold shadow-md" icon={Video}>
                            Start Video Call with Patient
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ======================================================== */
          /* PATIENT DOMAIN VIEW: LIST OF DOCTORS & UPCOMING VISITS   */
          /* ======================================================== */
          <>
            {/* Scheduled Consultations */}
            {appointments.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-teal-500" />
                    Your Confirmed Video Visits
                  </h2>
                  <span className="text-xs text-slate-400">{appointments.length} ready to join</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {appointments.map((apt) => {
                    const docUser = apt.doctor?.user;
                    const docProf = apt.doctor;
                    return (
                      <Card key={apt.id || apt._id} className="border-teal-500/25 bg-[var(--bg-secondary)] hover:border-teal-400/40 transition-all">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar firstName={docUser?.firstName} lastName={docUser?.lastName} size="md" />
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-[var(--text-primary)] truncate">
                                Dr. {docUser?.firstName} {docUser?.lastName}
                              </p>
                              <p className="text-xs text-[var(--text-muted)] truncate">
                                {docProf?.specialisation || 'Specialist'}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-teal-500 font-semibold mt-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(apt.scheduledAt)} at {formatTime(apt.scheduledAt)}
                              </div>
                            </div>
                          </div>

                          <Link to={`/telemedicine/consultation_${apt.id || apt._id}`}>
                            <Button size="sm" className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold shadow-md shrink-0">
                              <Video className="h-3.5 w-3.5 mr-1" />
                              Join Call
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Doctor Calling Directory */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-teal-500" />
                    Available Doctors for Video Call
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Select any verified specialist below to start a live consultation
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search doctor by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Specialty Filter Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {specialties.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSpecialty(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                      selectedSpecialty === s
                        ? 'bg-teal-500 text-slate-950 shadow-md font-bold'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Doctors Grid */}
              {docsLoading ? (
                <PageSpinner />
              ) : doctors.length === 0 ? (
                <div className="text-center py-16 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border)]">
                  <Stethoscope className="h-10 w-10 mx-auto text-slate-500 mb-2 opacity-50" />
                  <p className="text-sm text-[var(--text-secondary)] font-semibold">No doctors found for this category</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Try searching for a different specialty or doctor name</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {doctors.map((doc) => {
                    const dp = doc.doctorProfile;
                    const fee = dp?.consultationFee || 800;
                    return (
                      <Card key={doc.id || doc._id} hover className="border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden flex flex-col justify-between">
                        <CardContent className="p-5 space-y-4">
                          <div className="flex items-start gap-3.5">
                            <div className="relative shrink-0">
                              <Avatar firstName={doc.firstName} lastName={doc.lastName} size="lg" />
                              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-secondary)]" title="Online for video calls" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">
                                  Dr. {doc.firstName} {doc.lastName}
                                </h3>
                                <div className="flex items-center gap-1 text-amber-400 text-xs font-bold shrink-0">
                                  <Star className="h-3 w-3 fill-current" /> 4.9
                                </div>
                              </div>
                              <p className="text-xs text-teal-500 font-medium truncate mt-0.5">
                                {dp?.specialisation || 'General Physician'}
                              </p>
                              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                                {dp?.experienceYears ? `${dp.experienceYears}+ Years Exp` : 'Certified Specialist'} • MBBS, MD
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] text-xs">
                            <div>
                              <span className="text-[10px] text-[var(--text-muted)] uppercase block font-semibold">Consultation Fee</span>
                              <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(fee)}
                              </span>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[11px] font-bold border border-emerald-500/20">
                              Available Now
                            </span>
                          </div>

                          <Button
                            onClick={() => handleInstantCall(doc)}
                            className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-slate-950 font-bold shadow-md shadow-teal-500/15"
                            icon={Video}
                          >
                            Start Video Call
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
