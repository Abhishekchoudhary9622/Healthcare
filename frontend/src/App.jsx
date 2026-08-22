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
import HealthAnalytics  from '@/pages/patient/HealthAnalytics';
import PatientRecords   from '@/pages/patient/PatientRecords';
import Pharmacies       from '@/pages/patient/Pharmacies';
import Hospitals        from '@/pages/patient/Hospitals';
import MLPrediction     from '@/pages/patient/MLPrediction';
import TelemedicineLobby from '@/pages/patient/TelemedicineLobby';
import TelemedicineRoom from '@/pages/shared/TelemedicineRoom';
import DoctorDashboard    from '@/pages/doctor/DoctorDashboard';
import DoctorAppointments from '@/pages/doctor/DoctorAppointments';
import TodaySchedule      from '@/pages/doctor/TodaySchedule';
import DoctorProfile      from '@/pages/doctor/DoctorProfile';
import AdminDashboard    from '@/pages/admin/AdminDashboard';
import AdminDoctors      from '@/pages/admin/AdminDoctors';
import AdminPatients     from '@/pages/admin/AdminPatients';
import AdminAppointments from '@/pages/admin/AdminAppointments';
import AddDoctor         from '@/pages/admin/AddDoctor';
import DriverDashboard   from '@/pages/driver/DriverDashboard';

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const portals = { PATIENT: '/patient', DOCTOR: '/doctor', ADMIN: '/admin', DRIVER: '/driver' };
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
        <Route path="/patient/hospitals"    element={<ProtectedRoute role="PATIENT"><Hospitals /></ProtectedRoute>} />
        <Route path="/patient/ml-prediction" element={<ProtectedRoute role="PATIENT"><MLPrediction /></ProtectedRoute>} />
        <Route path="/patient/appointments" element={<ProtectedRoute role="PATIENT"><MyAppointments /></ProtectedRoute>} />
        <Route path="/patient/telemedicine" element={<ProtectedRoute role="PATIENT"><TelemedicineLobby /></ProtectedRoute>} />
        <Route path="/patient/profile"      element={<ProtectedRoute role="PATIENT"><PatientProfile /></ProtectedRoute>} />
        <Route path="/patient/analytics"    element={<ProtectedRoute role="PATIENT"><HealthAnalytics /></ProtectedRoute>} />
        <Route path="/patient/records"      element={<ProtectedRoute role="PATIENT"><PatientRecords /></ProtectedRoute>} />
        <Route path="/patient/pharmacies"   element={<ProtectedRoute role="PATIENT"><Pharmacies /></ProtectedRoute>} />

        <Route path="/telemedicine/:roomId" element={<ProtectedRoute><TelemedicineRoom /></ProtectedRoute>} />

        <Route path="/doctor"              element={<ProtectedRoute role="DOCTOR"><DoctorDashboard /></ProtectedRoute>} />
        <Route path="/doctor/appointments" element={<ProtectedRoute role="DOCTOR"><DoctorAppointments /></ProtectedRoute>} />
        <Route path="/doctor/today"        element={<ProtectedRoute role="DOCTOR"><TodaySchedule /></ProtectedRoute>} />
        <Route path="/doctor/telemedicine" element={<ProtectedRoute role="DOCTOR"><TelemedicineLobby /></ProtectedRoute>} />
        <Route path="/doctor/profile"      element={<ProtectedRoute role="DOCTOR"><DoctorProfile /></ProtectedRoute>} />

        <Route path="/admin"              element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/doctors"      element={<ProtectedRoute role="ADMIN"><AdminDoctors /></ProtectedRoute>} />
        <Route path="/admin/doctors/new"  element={<ProtectedRoute role="ADMIN"><AddDoctor /></ProtectedRoute>} />
        <Route path="/admin/patients"     element={<ProtectedRoute role="ADMIN"><AdminPatients /></ProtectedRoute>} />
        <Route path="/admin/appointments" element={<ProtectedRoute role="ADMIN"><AdminAppointments /></ProtectedRoute>} />

        <Route path="/driver" element={<ProtectedRoute role="DRIVER"><DriverDashboard /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}
