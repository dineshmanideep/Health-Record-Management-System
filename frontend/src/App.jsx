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

// Doctor pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorProfile from './pages/doctor/DoctorProfile';

// Nurse pages
import NurseDashboard from './pages/nurse/NurseDashboard';
import NurseProfile from './pages/nurse/NurseProfile';

// Hospital pages
import HospitalDashboard from './pages/hospital/HospitalDashboard';
import HospitalProfile from './pages/hospital/HospitalProfile';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProfile from './pages/admin/AdminProfile';

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

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
