import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DashboardLayout = ({ children, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'user':
        return 'Patient';
      case 'doctor':
        return 'Doctor';
      case 'nurse':
        return 'Nurse';
      case 'hospital':
        return 'Hospital';
      case 'admin':
        return 'Admin';
      default:
        return 'User';
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-purple-600 to-purple-800 text-white py-5 fixed h-screen overflow-y-auto">
        <div className="px-5 pb-5 border-b border-white/20 mb-5">
          <h2 className="text-2xl font-bold mb-1">HRMS</h2>
          <p className="text-sm opacity-90">{getRoleName(user?.role)}</p>
        </div>
        <nav className="flex flex-col">
          <Link 
            to={`/${user?.role === 'user' ? 'patient' : user?.role}/dashboard`}
            className="text-white no-underline px-5 py-4 flex items-center gap-3 hover:bg-white/10 transition-colors"
          >
            <span className="text-xl">📊</span> Dashboard
          </Link>
          <Link 
            to={`/${user?.role === 'user' ? 'patient' : user?.role}/profile`}
            className="text-white no-underline px-5 py-4 flex items-center gap-3 hover:bg-white/10 transition-colors"
          >
            <span className="text-xl">👤</span> Profile
          </Link>
          {user?.role === 'user' && (
            <>
              <Link to="/patient/records" className="text-white no-underline px-5 py-4 flex items-center gap-3 hover:bg-white/10 transition-colors">
                <span className="text-xl">📋</span> Medical Records
              </Link>
            </>
          )}
          {user?.role === 'doctor' && (
            <>
              <Link to="/doctor/patients" className="text-white no-underline px-5 py-4 flex items-center gap-3 hover:bg-white/10 transition-colors">
                <span className="text-xl">👥</span> Patients
              </Link>
              <Link to="/doctor/appointments" className="text-white no-underline px-5 py-4 flex items-center gap-3 hover:bg-white/10 transition-colors">
                <span className="text-xl">📅</span> Appointments
              </Link>
            </>
          )}
          {user?.role === 'nurse' && (
            <>
              <Link to="/nurse/patients" className="text-white no-underline px-5 py-4 flex items-center gap-3 hover:bg-white/10 transition-colors">
                <span className="text-xl">👥</span> Assigned Patients
              </Link>
              <Link to="/nurse/tasks" className="text-white no-underline px-5 py-4 flex items-center gap-3 hover:bg-white/10 transition-colors">
                <span className="text-xl">✓</span> Tasks
              </Link>
            </>
          )}
          {user?.role === 'hospital' && (
            <>
              <Link to="/hospital/doctors" className="text-white no-underline px-5 py-4 flex items-center gap-3 hover:bg-white/10 transition-colors">
                <span className="text-xl">⚕️</span> Doctors
              </Link>
              <Link to="/hospital/nurses" className="text-white no-underline px-5 py-4 flex items-center gap-3 hover:bg-white/10 transition-colors">
                <span className="text-xl">👩‍⚕️</span> Nurses
              </Link>
              <Link to="/hospital/departments" className="text-white no-underline px-5 py-4 flex items-center gap-3 hover:bg-white/10 transition-colors">
                <span className="text-xl">🏥</span> Departments
              </Link>
            </>
          )}
          {user?.role === 'admin' && (
            <>
              <Link to="/admin/hospitals" className="text-white no-underline px-5 py-4 flex items-center gap-3 hover:bg-white/10 transition-colors">
                <span className="text-xl">🏥</span> Manage Hospitals
              </Link>
              <Link to="/admin/doctors" className="text-white no-underline px-5 py-4 flex items-center gap-3 hover:bg-white/10 transition-colors">
                <span className="text-xl">⚕️</span> Manage Doctors
              </Link>
              <Link to="/admin/nurses" className="text-white no-underline px-5 py-4 flex items-center gap-3 hover:bg-white/10 transition-colors">
                <span className="text-xl">👩‍⚕️</span> Manage Nurses
              </Link>
              <Link to="/admin/reports" className="text-white no-underline px-5 py-4 flex items-center gap-3 hover:bg-white/10 transition-colors">
                <span className="text-xl">📊</span> Reports
              </Link>
            </>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 bg-gray-50">
        <header className="bg-white px-10 py-5 flex justify-between items-center shadow-sm">
          <h1 className="text-gray-800 text-3xl font-semibold m-0">{title}</h1>
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-end">
              <span className="font-semibold text-gray-800">{user?.name}</span>
              <span className="text-xs text-gray-600 capitalize">{getRoleName(user?.role)}</span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="p-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
