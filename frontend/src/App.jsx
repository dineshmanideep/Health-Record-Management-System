import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized';

// Patient pages
import PatientDashboard from './pages/patient/PatientDashboard';
import PatientProfile from './pages/patient/PatientProfile';
import PatientMedicalRecords from './pages/patient/PatientMedicalRecords';
import PatientHealthAnalytics from './pages/patient/PatientHealthAnalytics';
import PatientActivityLogs from './pages/patient/PatientActivityLogs';
import PatientSmartwatchInsights from './pages/patient/PatientSmartwatchInsights';

// Doctor pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorProfile from './pages/doctor/DoctorProfile';
import DoctorPatients from './pages/doctor/DoctorPatients';
import DoctorPatientRecords from './pages/doctor/DoctorPatientRecords';
import DoctorAuditLogs from './pages/doctor/DoctorAuditLogs';
import DoctorAssignRecords from './pages/doctor/DoctorAssignRecords';

// Nurse pages
import NurseDashboard from './pages/nurse/NurseDashboard';
import NurseProfile from './pages/nurse/NurseProfile';
import NurseAuditLogs from './pages/nurse/NurseAuditLogs';
import NurseAssignments from './pages/nurse/NurseAssignments';
import NurseTestAssignments from './pages/nurse/NurseTestAssignments';

// Hospital pages
import HospitalDashboard from './pages/hospital/HospitalDashboard';
import HospitalProfile from './pages/hospital/HospitalProfile';
import HospitalDoctors from './pages/hospital/HospitalDoctors';
import HospitalNurses from './pages/hospital/HospitalNurses';
import HospitalAuditLogs from './pages/hospital/HospitalAuditLogs';
import HospitalTests from './pages/hospital/HospitalTests';
import HospitalTestAssignments from './pages/hospital/HospitalTestAssignments';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProfile from './pages/admin/AdminProfile';
import AdminHospitals from './pages/admin/AdminHospitals';
import AdminDoctors from './pages/admin/AdminDoctors';
import AdminNurses from './pages/admin/AdminNurses';

import { ThemeProvider } from './context/ThemeContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import ContextVoiceHelpButton from './components/ContextVoiceHelpButton';
import FloatingNav from './components/FloatingNav';
import AccessibilityTools from './components/AccessibilityTools';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
        <AccessibilityProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* General Dashboard Route */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          {/* Patient Routes */}
          <Route 
            path="/patient/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <PatientDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/patient/profile" 
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <PatientProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/patient/records" 
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <PatientMedicalRecords />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/patient/health-analytics" 
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <PatientHealthAnalytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/patient/activity-logs" 
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <PatientActivityLogs />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/patient/smartwatch-insights"
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <PatientSmartwatchInsights />
              </ProtectedRoute>
            }
          />

          {/* Doctor Routes */}
          <Route 
            path="/doctor/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/doctor/profile" 
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/doctor/patients" 
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorPatients />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/doctor/patient-records/:patientId" 
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorPatientRecords />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/doctor/audit-logs" 
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorAuditLogs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/doctor/assign-records" 
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorAssignRecords />
              </ProtectedRoute>
            } 
          />

          {/* Nurse Routes */}
          <Route 
            path="/nurse/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['nurse']}>
                <NurseDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/nurse/profile" 
            element={
              <ProtectedRoute allowedRoles={['nurse']}>
                <NurseProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/nurse/audit-logs" 
            element={
              <ProtectedRoute allowedRoles={['nurse']}>
                <NurseAuditLogs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/nurse/assignments" 
            element={
              <ProtectedRoute allowedRoles={['nurse']}>
                <NurseAssignments />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/nurse/test-assignments" 
            element={
              <ProtectedRoute allowedRoles={['nurse']}>
                <NurseTestAssignments />
              </ProtectedRoute>
            } 
          />

          {/* Hospital Routes */}
          <Route 
            path="/hospital/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['hospital']}>
                <HospitalDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/hospital/profile" 
            element={
              <ProtectedRoute allowedRoles={['hospital']}>
                <HospitalProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/hospital/doctors" 
            element={
              <ProtectedRoute allowedRoles={['hospital']}>
                <HospitalDoctors />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/hospital/nurses" 
            element={
              <ProtectedRoute allowedRoles={['hospital']}>
                <HospitalNurses />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/hospital/audit-logs" 
            element={
              <ProtectedRoute allowedRoles={['hospital']}>
                <HospitalAuditLogs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/hospital/tests" 
            element={
              <ProtectedRoute allowedRoles={['hospital']}>
                <HospitalTests />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/hospital/test-assignments" 
            element={
              <ProtectedRoute allowedRoles={['hospital']}>
                <HospitalTestAssignments />
              </ProtectedRoute>
            } 
          />

          {/* Admin Routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/profile" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/hospitals" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminHospitals />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/doctors" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDoctors />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/nurses" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminNurses />
              </ProtectedRoute>
            } 
          />

          {/* Catch-all: unknown paths within known role spaces → redirect to that role's dashboard */}
          <Route path="/patient/*" element={<ProtectedRoute allowedRoles={['user']}><Navigate to="/patient/dashboard" replace /></ProtectedRoute>} />
          <Route path="/doctor/*" element={<ProtectedRoute allowedRoles={['doctor']}><Navigate to="/doctor/dashboard" replace /></ProtectedRoute>} />
          <Route path="/nurse/*" element={<ProtectedRoute allowedRoles={['nurse']}><Navigate to="/nurse/dashboard" replace /></ProtectedRoute>} />
          <Route path="/hospital/*" element={<ProtectedRoute allowedRoles={['hospital']}><Navigate to="/hospital/dashboard" replace /></ProtectedRoute>} />
          <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['admin']}><Navigate to="/admin/dashboard" replace /></ProtectedRoute>} />

          {/* Final catch-all → role-aware redirect via /dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <ContextVoiceHelpButton />
        <AccessibilityTools />
        <FloatingNav />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0F172A',
              color: '#fff',
              borderRadius: '16px',
              fontSize: '14px',
              padding: '12px 20px',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
        </AccessibilityProvider>
      </AuthProvider>
    </Router>
  </ThemeProvider>
  );
}

export default App;
