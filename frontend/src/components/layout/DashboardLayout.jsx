import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AiChat from '@/components/shared/AiChat';
import EmergencySOS from '@/components/shared/EmergencySOS';
import { useAuthStore } from '@/store/authStore';

export default function DashboardLayout({ children, title }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <Sidebar mobile onClose={() => setMobileOpen(false)} />
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setMobileOpen(true)} title={title} />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>

      {/* AI Chat Widget — floats on all dashboard pages */}
      <AiChat />
    </div>
  );
}
