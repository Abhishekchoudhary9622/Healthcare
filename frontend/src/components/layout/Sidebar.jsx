import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard, Users, UserCog, ClipboardList,
  Stethoscope, ChevronRight, Activity, Settings,
  UserPlus, Video, BrainCircuit, Building2, FileText, Plus
} from 'lucide-react';

const patientGeneralNav = [
  { label: 'Dashboard',         to: '/patient',               icon: LayoutDashboard },
  { label: 'AI Analytics',      to: '/patient/analytics',     icon: Activity },
  { label: 'ML Risk Predictor', to: '/patient/ml-prediction', icon: BrainCircuit },
  { label: 'Nearby Hospitals',  to: '/patient/hospitals',     icon: Building2 },
  { label: 'Medical Reports',   to: '/patient/records',       icon: FileText },
  { label: 'Video Appointment', to: '/patient/telemedicine',  icon: Video },
];

const otherRoleConfigs = {
  DOCTOR: [
    { label: 'Dashboard',         to: '/doctor',               icon: LayoutDashboard },
    { label: 'Today Schedule',    to: '/doctor/today',          icon: Activity },
    { label: 'Telemedicine Room', to: '/doctor/telemedicine',   icon: Video },
    { label: 'Profile',           to: '/doctor/profile',        icon: UserCog },
  ],
  ADMIN: [
    { label: 'Dashboard',         to: '/admin',                 icon: LayoutDashboard },
    { label: 'Doctors',           to: '/admin/doctors',         icon: Stethoscope },
    { label: 'Patients',          to: '/admin/patients',        icon: Users },
    { label: 'Add Doctor',        to: '/admin/doctors/new',     icon: UserPlus },
  ],
};

export default function Sidebar({ mobile = false, onClose }) {
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();

  const isPatient = user?.role === 'PATIENT';

  return (
    <aside className={cn(
      'flex flex-col w-64 min-h-screen bg-white border-r border-[#E6EBF2] select-none',
      mobile && 'fixed inset-y-0 left-0 z-40 shadow-2xl'
    )}>
      {/* Brand Header — HealthSync */}
      <div className="flex items-center gap-3 px-6 h-20 border-b border-[#E6EBF2]/70">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-[#1271F5] to-blue-600 flex items-center justify-center shadow-md shadow-[#1271F5]/25">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-[#121A26] text-xl tracking-tight font-sans">
            HealthSync
          </span>
          <span className="text-[10px] text-[#1271F5] font-bold tracking-wider uppercase -mt-0.5">
            {isPatient ? 'Patient Portal' : `${user?.role?.toLowerCase()} portal`}
          </span>
        </div>
        {mobile && (
          <button onClick={onClose} className="ml-auto text-slate-400 p-1 hover:bg-slate-100 rounded-lg">
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-4 py-5 space-y-6 overflow-y-auto">
        {isPatient ? (
          <>
            {/* General Section */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 tracking-wider px-3 mb-2 uppercase">
                General
              </p>
              <div className="space-y-1">
                {patientGeneralNav.map(({ label, to, icon: Icon }) => (
                  <NavLink
                    key={to + label}
                    to={to}
                    end={to === '/patient'}
                    onClick={mobile ? onClose : undefined}
                    className={({ isActive }) => cn(
                      'flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-[#EEF2F8] text-[#121A26] font-bold shadow-sm'
                        : 'text-slate-600 hover:text-[#121A26] hover:bg-[#F4F6FA]'
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={cn('h-4 w-4', isActive ? 'text-[#1271F5]' : 'text-slate-400')} />
                        <span className="flex-1">{label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Bottom Promo Card: "Book online. No Queues. Hassle-Free." */}
            <div className="pt-2">
              <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-b from-[#EDF4FF] to-[#E2EEFE] border border-[#D7E6FA] p-4 shadow-sm group">
                <div className="mb-2">
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">
                    Book online.
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                    No Queues. Hassle-Free.
                  </p>
                </div>

                <div className="relative my-2 rounded-xl overflow-hidden aspect-[16/11] bg-slate-200 shadow-inner">
                  <img
                    src="/doctor_promo_portrait.jpg"
                    alt="Doctor Consultation"
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (mobile && onClose) onClose();
                    navigate('/patient');
                    // Scroll to appointment section on dashboard
                    setTimeout(() => {
                      document.getElementById('appointment-booking-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-[#121A26] text-white text-xs font-semibold hover:bg-black transition-all shadow-sm active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Appointment</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Doctor / Admin roles */
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 px-3 mb-2 font-bold">
              Navigation
            </p>
            {(otherRoleConfigs[user?.role] || []).map(({ label, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/doctor' || to === '/admin'}
                onClick={mobile ? onClose : undefined}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[#EEF2F8] text-[#121A26] font-bold shadow-sm'
                    : 'text-slate-600 hover:text-[#121A26] hover:bg-[#F4F6FA]'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
