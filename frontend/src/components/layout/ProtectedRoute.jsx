import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function ProtectedRoute({ children, role }) {
  const hasHydrated    = useAuthStore(s => s._hasHydrated);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user           = useAuthStore(s => s.user);

  // Wait silently until Zustand has rehydrated from localStorage.
  // Returning null prevents the flicker where the page briefly shows
  // the login screen before the stored session is read.
  if (!hasHydrated) return null;

  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  if (role && user.role !== role) {
    const portals = { PATIENT: '/patient', DOCTOR: '/doctor', ADMIN: '/admin', DRIVER: '/driver' };
    return <Navigate to={portals[user.role] || '/login'} replace />;
  }

  return children;
}
