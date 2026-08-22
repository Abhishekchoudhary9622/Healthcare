import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import Avatar from '@/components/ui/Avatar';
import {
  LayoutDashboard, Calendar, Users, UserCog, ClipboardList,
  Stethoscope, LogOut, ChevronRight, Activity, Bell, Settings,
  FileText, UserPlus, Shield, Store, Building2, BrainCircuit, Video
} from 'lucide-react';

const navConfigs = {
  PATIENT: [
    { label: 'Dashboard',         to: '/patient',               icon: LayoutDashboard },
    { label: 'Find Doctors',      to: '/patient/doctors',       icon: Stethoscope },
    { label: 'Hospitals & Trauma',to: '/patient/hospitals',     icon: Building2 },
    { label: 'ML Risk Predictor', to: '/patient/ml-prediction', icon: BrainCircuit },
    { label: 'AI Analytics',      to: '/patient/analytics',     icon: Activity },
    { label: 'EHR Medical Record',to: '/patient/records',       icon: ClipboardList },
    { label: 'Pharmacies',        to: '/patient/pharmacies',    icon: Store },
    { label: 'Appointments',      to: '/patient/appointments',  icon: Calendar },
    { label: 'Telemedicine Visit',to: '/telemedicine/quick-room',icon: Video },
    { label: 'Profile',           to: '/patient/profile',       icon: UserCog },
  ],
  DOCTOR: [
    { label: 'Dashboard',         to: '/doctor',               icon: LayoutDashboard },
    { label: 'Appointments',      to: '/doctor/appointments',   icon: Calendar },
    { label: 'Today Schedule',    to: '/doctor/today',          icon: Activity },
    { label: 'Telemedicine Room', to: '/telemedicine/quick-room',icon: Video },
    { label: 'Profile',           to: '/doctor/profile',        icon: UserCog },
  ],
  ADMIN: [
    { label: 'Dashboard',         to: '/admin',                 icon: LayoutDashboard },
    { label: 'Doctors',           to: '/admin/doctors',         icon: Stethoscope },
    { label: 'Patients',          to: '/admin/patients',        icon: Users },
    { label: 'Appointments',      to: '/admin/appointments',    icon: Calendar },
    { label: 'Add Doctor',        to: '/admin/doctors/new',     icon: UserPlus },
  ],
};

export default function Sidebar({ mobile = false, onClose }) {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const links = navConfigs[user?.role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className={cn(
      'flex flex-col w-64 min-h-screen bg-[var(--bg-secondary)] border-r border-[var(--border)]',
      mobile && 'fixed inset-y-0 left-0 z-40 shadow-xl'
    )}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-[var(--border)]">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
          <Activity className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="font-bold text-[var(--text-primary)] text-sm">HealthSync</span>
          <p className="text-[10px] text-[var(--text-muted)] capitalize">{user?.role?.toLowerCase()} portal</p>
        </div>
        {mobile && (
          <button onClick={onClose} className="ml-auto text-[var(--text-muted)]">
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-3 mb-2 font-medium">
          Navigation
        </p>
        {links.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/patient' || to === '/doctor' || to === '/admin'}
            onClick={mobile ? onClose : undefined}
            className={({ isActive }) => cn('nav-link', isActive && 'active')}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-tertiary)]">
          <Avatar firstName={user?.firstName} lastName={user?.lastName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10 text-[var(--text-muted)] hover:text-danger-500"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
