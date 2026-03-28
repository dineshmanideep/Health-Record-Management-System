import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const DashboardLayout = ({ children, title }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const getRoleName = (role) => {
    const roles = {
      user: 'Patient',
      doctor: 'Doctor',
      nurse: 'Nurse',
      hospital: 'Hospital',
      admin: 'Admin'
    };
    return roles[role] || 'User';
  };

  const NavLink = ({ to, icon, children }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        onClick={() => setIsMobileMenuOpen(false)}
        className={`flex items-center gap-3 px-5 py-3.5 transition-all duration-200 border-l-4 ${
          isActive 
            ? 'bg-white/15 border-white text-white font-medium' 
            : 'border-transparent text-white/70 hover:bg-white/10 hover:text-white'
        }`}
      >
        <span className="text-xl">{icon}</span> {children}
      </Link>
    );
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-indigo-700 dark:bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-md">
        <h2 className="text-xl font-bold tracking-tight">HRMS</h2>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-white/20 transition-colors">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <span className="text-2xl">{isMobileMenuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-72 bg-indigo-700 dark:bg-slate-900 text-white transform transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-full flex flex-col overflow-y-auto">
          <div className="p-6 border-b border-white/10 mb-2">
            <h2 className="text-2xl font-bold tracking-tight">HRMS</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <p className="text-xs font-medium text-white/70 uppercase tracking-wider">{getRoleName(user?.role)} Portal</p>
            </div>
          </div>

          <nav className="flex-1 py-4">
            <NavLink to={`/${user?.role === 'user' ? 'patient' : user?.role}/dashboard`} icon="📊">Dashboard</NavLink>
            <NavLink to={`/${user?.role === 'user' ? 'patient' : user?.role}/profile`} icon="👤">My Profile</NavLink>
            
            {user?.role === 'user' && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="px-5 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Medical Services</p>
                <NavLink to="/patient/records" icon="📋">Medical Records</NavLink>
                <NavLink to="/patient/health-analytics" icon="📈">Health Analytics</NavLink>
                <NavLink to="/patient/smartwatch-insights" icon="⌚">Watch Insights</NavLink>
                <NavLink to="/patient/activity-logs" icon="📝">Activity logs</NavLink>
              </div>
            )}

            {user?.role === 'doctor' && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="px-5 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Patient Care</p>
                <NavLink to="/doctor/patients" icon="👥">My Patients</NavLink>
                <NavLink to="/doctor/assign-records" icon="✍️">Record Entry</NavLink>
                <NavLink to="/doctor/audit-logs" icon="📋">Audit Logs</NavLink>
              </div>
            )}

            {user?.role === 'nurse' && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="px-5 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Assignments</p>
                <NavLink to="/nurse/assignments" icon="📋">Doctor Tasks</NavLink>
                <NavLink to="/nurse/test-assignments" icon="🧪">Test Center</NavLink>
                <NavLink to="/nurse/audit-logs" icon="🔍">Activity Logs</NavLink>
              </div>
            )}

            {user?.role === 'hospital' && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="px-5 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Management</p>
                <NavLink to="/hospital/doctors" icon="⚕️">Doctors</NavLink>
                <NavLink to="/hospital/nurses" icon="👩‍⚕️">Nurses</NavLink>
                <NavLink to="/hospital/tests" icon="🔬">Test Types</NavLink>
                <NavLink to="/hospital/test-assignments" icon="📋">Assignments</NavLink>
                <NavLink to="/hospital/audit-logs" icon="🔍">Safety Logs</NavLink>
              </div>
            )}

            {user?.role === 'admin' && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="px-5 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Administration</p>
                <NavLink to="/admin/hospitals" icon="🏥">Hospitals</NavLink>
                <NavLink to="/admin/doctors" icon="⚕️">Doctors</NavLink>
                <NavLink to="/admin/nurses" icon="👩‍⚕️">Nurses</NavLink>
              </div>
            )}
          </nav>

          <div className="p-4 border-t border-white/10">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-200 hover:text-white px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <header className="hidden md:flex bg-white dark:bg-slate-900 px-8 py-5 justify-between items-center shadow-sm border-b dark:border-slate-800">
          <h1 className="text-slate-800 dark:text-white text-2xl font-bold tracking-tight">{title}</h1>
          <div className="flex items-center gap-6">
            <button 
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-amber-400 hover:scale-105 transition-all shadow-sm"
              title="Toggle Dark Mode"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <div className="flex items-center gap-3 pl-6 border-l dark:border-slate-700">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 dark:text-white">{user?.name}</p>
                <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{getRoleName(user?.role)} Account</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto animate-fadeIn">
            {children}
          </div>
        </main>

        <footer className="px-8 py-4 text-center text-xs text-slate-400 dark:text-slate-600 border-t dark:border-slate-900">
          HEALTH RECORD MANAGEMENT SYSTEM &copy; {new Date().getFullYear()} &bull; Secure Healthcare Access
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
