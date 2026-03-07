import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to role-specific dashboard
  switch (user.role) {
    case 'user':
      return <Navigate to="/patient/dashboard" replace />;
    case 'doctor':
      return <Navigate to="/doctor/dashboard" replace />;
    case 'nurse':
      return <Navigate to="/nurse/dashboard" replace />;
    case 'hospital':
      return <Navigate to="/hospital/dashboard" replace />;
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    default:
      return <Navigate to="/" replace />;
  }
};

export default Dashboard;
