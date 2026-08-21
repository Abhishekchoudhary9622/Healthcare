import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import ToastContainer from '@/components/ui/Toast';

import Login    from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import PatientDashboard from '@/pages/patient/PatientDashboard';
import FindDoctors      from '@/pages/patient/FindDoctors';
import MyAppointments   from '@/pages/patient/MyAppointments';
import PatientProfile   from '@/pages/patient/PatientProfile';
import DoctorDashboard    from '@/pages/doctor/DoctorDashboard';
import DoctorAppointments from '@/pages/doctor/DoctorAppointments';
import TodaySchedule      from '@/pages/doctor/TodaySchedule';
import DoctorProfile      from '@/pages/doctor/DoctorProfile';
import AdminDashboard    from '@/pages/admin/AdminDashboard';
import AdminDoctors      from '@/pages/admin/AdminDoctors';
import AdminPatients     from '@/pages/admin/AdminPatients';
import AdminAppointments from '@/pages/admin/AdminAppointments';
import AddDoctor         from '@/pages/admin/AddDoctor';

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const portals = { PATIENT: '/patient', DOCTOR: '/doctor', ADMIN: '/admin' };
  return <Navigate to={portals[user?.role] || '/login'} replace />;
}

export default function App() {
  const { initTheme } = useThemeStore();
  const { isAuthenticated, fetchMe } = useAuthStore();
  const hasFetched = useRef(false);

  // Init theme once on mount only
  useEffect(() => {
    initTheme();
  }, []); // eslint-disable-line

  // Fetch user profile ONCE on mount if already authenticated
  useEffect(() => {
    if (isAuthenticated && !hasFetched.current) {
      hasFetched.current = true;
      fetchMe().catch(() => {});
    }
  }, []); // eslint-disable-line — intentionally run once on mount

  return (
    <>
      <Routes>
        <Route path="/"         element={<RootRedirect />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/patient"              element={<ProtectedRoute role="PATIENT"><PatientDashboard /></ProtectedRoute>} />
        <Route path="/patient/doctors"      element={<ProtectedRoute role="PATIENT"><FindDoctors /></ProtectedRoute>} />
        <Route path="/patient/appointments" element={<ProtectedRoute role="PATIENT"><MyAppointments /></ProtectedRoute>} />
        <Route path="/patient/profile"      element={<ProtectedRoute role="PATIENT"><PatientProfile /></ProtectedRoute>} />

        <Route path="/doctor"              element={<ProtectedRoute role="DOCTOR"><DoctorDashboard /></ProtectedRoute>} />
        <Route path="/doctor/appointments" element={<ProtectedRoute role="DOCTOR"><DoctorAppointments /></ProtectedRoute>} />
        <Route path="/doctor/today"        element={<ProtectedRoute role="DOCTOR"><TodaySchedule /></ProtectedRoute>} />
        <Route path="/doctor/profile"      element={<ProtectedRoute role="DOCTOR"><DoctorProfile /></ProtectedRoute>} />

        <Route path="/admin"              element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/doctors"      element={<ProtectedRoute role="ADMIN"><AdminDoctors /></ProtectedRoute>} />
        <Route path="/admin/doctors/new"  element={<ProtectedRoute role="ADMIN"><AddDoctor /></ProtectedRoute>} />
        <Route path="/admin/patients"     element={<ProtectedRoute role="ADMIN"><AdminPatients /></ProtectedRoute>} />
        <Route path="/admin/appointments" element={<ProtectedRoute role="ADMIN"><AdminAppointments /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}
