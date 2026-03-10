import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// Doctor pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorProfile from './pages/doctor/DoctorProfile';
import DoctorPatients from './pages/doctor/DoctorPatients';
import DoctorPatientRecords from './pages/doctor/DoctorPatientRecords';
import DoctorAuditLogs from './pages/doctor/DoctorAuditLogs';

// Nurse pages
import NurseDashboard from './pages/nurse/NurseDashboard';
import NurseProfile from './pages/nurse/NurseProfile';
import NurseCreateRecord from './pages/nurse/NurseCreateRecord';
import NurseEditRecord from './pages/nurse/NurseEditRecord';
import NurseRecords from './pages/nurse/NurseRecords';
import NurseAuditLogs from './pages/nurse/NurseAuditLogs';

// Hospital pages
import HospitalDashboard from './pages/hospital/HospitalDashboard';
import HospitalProfile from './pages/hospital/HospitalProfile';
import HospitalDoctors from './pages/hospital/HospitalDoctors';
import HospitalNurses from './pages/hospital/HospitalNurses';
import HospitalAuditLogs from './pages/hospital/HospitalAuditLogs';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProfile from './pages/admin/AdminProfile';
import AdminHospitals from './pages/admin/AdminHospitals';
import AdminDoctors from './pages/admin/AdminDoctors';
import AdminNurses from './pages/admin/AdminNurses';

function App() {
  return (
    <Router>
      <AuthProvider>
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
            path="/nurse/create-record" 
            element={
              <ProtectedRoute allowedRoles={['nurse']}>
                <NurseCreateRecord />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/nurse/edit-record" 
            element={
              <ProtectedRoute allowedRoles={['nurse']}>
                <NurseEditRecord />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/nurse/records" 
            element={
              <ProtectedRoute allowedRoles={['nurse']}>
                <NurseRecords />
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
      </AuthProvider>
    </Router>
  );
}

export default App;
