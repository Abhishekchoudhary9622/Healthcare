import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, MoreVertical, MapPin, User, LogOut, Navigation } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUserLocation } from '@/lib/useUserLocation';
import EmergencySOS from '@/components/shared/EmergencySOS';
import NotificationDropdown from '@/components/shared/NotificationDropdown';

export default function Topbar({ onMenuClick }) {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const { location, requestLocation } = useUserLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 h-20 bg-white/90 backdrop-blur-md border-b border-[#E6EBF2] flex items-center px-4 md:px-8 gap-4 justify-between transition-colors">
      
      {/* Left: Mobile hamburger & Search bar */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onMenuClick}
          className="lg:hidden h-10 w-10 flex items-center justify-center rounded-2xl bg-[#EEF2F8] hover:bg-[#E2E8F0] text-slate-700"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Clean Pill Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search doctors, symptoms, medicines..."
            className="w-full pl-11 pr-4 py-2.5 rounded-full bg-[#F4F6FA] text-sm text-[#121A26] placeholder:text-slate-400 border border-transparent hover:border-slate-200 focus:border-[#1271F5]/40 focus:bg-white focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Right: Direct Emergency SOS, Notifications, Avatar & 3-dots */}
      <div className="flex items-center gap-3 md:gap-4" ref={menuRef}>
        
        {/* Emergency SOS Button (Directly visible in Topbar as requested) */}
        {user?.role === 'PATIENT' && (
          <div className="shrink-0">
            <EmergencySOS />
          </div>
        )}

        {/* In-app Notification Bell (Directly visible in Topbar as requested) */}
        <div className="shrink-0">
          <NotificationDropdown />
        </div>

        {/* User Profile Pill or Login button */}
        {user ? (
          <div
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 cursor-pointer p-1.5 rounded-2xl hover:bg-slate-100 transition-colors select-none"
            title={`${user?.firstName || 'User'} Menu & Logout`}
          >
            <img
              src={user?.avatar || '/user_avatar.jpg'}
              alt={user?.firstName || 'User'}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-100 shadow-sm"
            />
            <div className="hidden sm:block text-left pr-1">
              <p className="text-xs font-bold text-[#121A26] leading-tight">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'John Doe'}
              </p>
              <p className="text-[10px] text-slate-400 font-medium capitalize">
                {user?.role ? user.role.toLowerCase() : 'Patient'}
              </p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 rounded-xl bg-[#1271F5] text-white text-xs font-bold hover:bg-blue-600 transition-all shadow-sm"
          >
            Log In
          </button>
        )}

        {/* 3 Dots Menu Button */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="h-9 w-9 rounded-full bg-[#F4F6FA] hover:bg-[#E2E8F0] flex items-center justify-center text-slate-700 transition-colors shadow-sm"
            title="Options & Sign Out"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {/* 3-Dots & User Menu Dropdown Panel */}
          {menuOpen && (
            <div className="absolute right-0 top-12 w-64 rounded-2xl bg-white border border-[#E6EBF2] shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              
              {/* User Info Header inside Dropdown */}
              {user && (
                <div className="p-2.5 mb-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                  <img
                    src={user?.avatar || '/user_avatar.jpg'}
                    alt={user?.firstName || 'User'}
                    className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#121A26] truncate">
                      {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'John Doe'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{user?.email || 'patient@healthsync.com'}</p>
                  </div>
                </div>
              )}

              {/* Location Status Tile inside 3 dots */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Live Location
                  </span>
                  <button
                    onClick={requestLocation}
                    className="text-[11px] font-semibold text-[#1271F5] hover:underline flex items-center gap-1"
                  >
                    <Navigation className="h-3 w-3" /> Refresh
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <MapPin className="h-4 w-4 text-[#1271F5] shrink-0" />
                  <p className="text-xs font-semibold text-[#121A26] truncate">
                    {location ? location.display : 'Click to enable location'}
                  </p>
                </div>
              </div>

              {/* Profile Link */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/patient/profile');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User className="h-4 w-4 text-slate-500" />
                <span>My Profile & Settings</span>
              </button>

              {/* Divider */}
              <div className="h-px bg-slate-100 my-1.5" />

              {/* Logout Button */}
              {user ? (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#1271F5] hover:bg-blue-50 transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span>Log In to Account</span>
                </button>
              )}

            </div>
          )}
        </div>

      </div>
    </header>
  );
}
