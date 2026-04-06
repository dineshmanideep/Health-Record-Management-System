import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAccessibility } from '../context/useAccessibility';

const DashboardLayout = ({ children, title }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { profile, updateProfile, toggleAccessibilityMode, formErrors, clearFormErrors } = useAccessibility();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAccessibilityPanel, setShowAccessibilityPanel] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const getRoleName = (role) => {
    const roles = { user: 'Patient', doctor: 'Doctor', nurse: 'Nurse', hospital: 'Hospital', admin: 'Admin' };
    return roles[role] || 'User';
  };

  const NavLink = ({ to, icon, children }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        onClick={() => setIsMobileMenuOpen(false)}
        className={`flex items-center gap-3 px-4 py-2.5 mx-3 rounded-xl text-[13px] font-medium transition-all duration-200 group ${
          isActive
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <span className={`text-base transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`}>{icon}</span>
        <span>{children}</span>
      </Link>
    );
  };

  const SectionLabel = ({ children }) => (
    <p className="px-7 pt-5 pb-1.5 text-[10px] font-semibold text-slate-400 dark:text-white/25 uppercase tracking-[0.15em]">{children}</p>
  );

  return (
    <>
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-lg"
    >
      Skip to main content
    </a>
    <div className={`min-h-screen flex flex-col md:flex-row bg-slate-100 dark:bg-[#0B1120] ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-4 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-md">✚</div>
          <h2 className="text-base font-bold tracking-tight">HRMS</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAccessibilityPanel((prev) => !prev)}
            title="Accessibility options"
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-all hover:scale-105"
          >
            ♿
          </button>
          <button
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-all hover:scale-105"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-all">
            <span className="text-lg">{isMobileMenuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky md:top-0 inset-y-0 left-0 z-50 w-65 h-screen
        bg-white dark:bg-slate-900
        border-r border-slate-200 dark:border-slate-800
        transform transition-transform duration-300 ease-in-out
        shadow-xl md:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-full flex flex-col overflow-y-auto custom-scrollbar">
          {/* Logo */}
          <div className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-emerald-500/30">✚</div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">HRMS</h2>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tracking-wider">Healthcare Portal</p>
              </div>
            </div>
            {/* User Card */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{user?.name}</p>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{getRoleName(user?.role)}</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 shrink-0" />
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-2 space-y-0.5">
            <SectionLabel>Main</SectionLabel>
            <NavLink to={`/${user?.role === 'user' ? 'patient' : user?.role}/dashboard`} icon="📊">Dashboard</NavLink>
            <NavLink to={`/${user?.role === 'user' ? 'patient' : user?.role}/profile`} icon="👤">My Profile</NavLink>

            {user?.role === 'user' && (
              <>
                <SectionLabel>Medical</SectionLabel>
                <NavLink to="/patient/records" icon="📋">Medical Records</NavLink>
                <NavLink to="/patient/health-analytics" icon="📈">Health Analytics</NavLink>
                <NavLink to="/patient/smartwatch-insights" icon="⌚">Watch Insights</NavLink>
                <NavLink to="/patient/activity-logs" icon="📝">Activity Logs</NavLink>
              </>
            )}
            {user?.role === 'doctor' && (
              <>
                <SectionLabel>Patient Care</SectionLabel>
                <NavLink to="/doctor/patients" icon="👥">My Patients</NavLink>
                <NavLink to="/doctor/assign-records" icon="✍️">Record Entry</NavLink>
                <NavLink to="/doctor/audit-logs" icon="📋">Audit Logs</NavLink>
              </>
            )}
            {user?.role === 'nurse' && (
              <>
                <SectionLabel>Assignments</SectionLabel>
                <NavLink to="/nurse/assignments" icon="📋">Doctor Tasks</NavLink>
                <NavLink to="/nurse/test-assignments" icon="🧪">Test Center</NavLink>
                <NavLink to="/nurse/audit-logs" icon="🔍">Activity Logs</NavLink>
              </>
            )}
            {user?.role === 'hospital' && (
              <>
                <SectionLabel>Management</SectionLabel>
                <NavLink to="/hospital/doctors" icon="⚕️">Doctors</NavLink>
                <NavLink to="/hospital/nurses" icon="👩‍⚕️">Nurses</NavLink>
                <NavLink to="/hospital/tests" icon="🔬">Test Types</NavLink>
                <NavLink to="/hospital/test-assignments" icon="📋">Assignments</NavLink>
                <NavLink to="/hospital/audit-logs" icon="🔍">Safety Logs</NavLink>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <SectionLabel>Administration</SectionLabel>
                <NavLink to="/admin/hospitals" icon="🏥">Hospitals</NavLink>
                <NavLink to="/admin/doctors" icon="⚕️">Doctors</NavLink>
                <NavLink to="/admin/nurses" icon="👩‍⚕️">Nurses</NavLink>
              </>
            )}
          </nav>

          {/* Footer — logout only */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Header */}
        <header className="hidden md:flex bg-white dark:bg-slate-900 px-8 py-4 justify-between items-center border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAccessibilityPanel((prev) => !prev)}
              title="Accessibility options"
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all hover:scale-105 border border-slate-200 dark:border-slate-700"
            >
              <span className="text-base">♿</span>
            </button>
            {/* Theme Toggle — in the top header */}
            <button
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all hover:scale-105 border border-slate-200 dark:border-slate-700"
            >
              <span className="text-base">{theme === 'light' ? '🌙' : '☀️'}</span>
            </button>
            {/* User Chip */}
            <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-700 dark:text-white">{user?.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{getRoleName(user?.role)}</p>
              </div>
            </div>
          </div>
        </header>

        {showAccessibilityPanel && (
          <div className="mx-4 md:mx-8 mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Accessibility Mode</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Readable, keyboard-friendly, and lower cognitive load UI.</p>
              </div>
              <button
                onClick={toggleAccessibilityMode}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  profile.modeEnabled
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
              >
                {profile.modeEnabled ? 'Mode: ON' : 'Mode: OFF'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Text Size
                <select
                  value={profile.textSize}
                  onChange={(e) => updateProfile({ textSize: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <option value="normal">Normal</option>
                  <option value="large">Large</option>
                  <option value="extra-large">Extra Large</option>
                </select>
              </label>

              {[
                { key: 'keyboardMode', label: 'Keyboard Navigation' },
                { key: 'dyslexiaMode', label: 'Dyslexia-friendly Spacing' },
                { key: 'targetBoost', label: 'Larger Click Targets' },
                { key: 'formAssistMode', label: 'Form Assist Hints' },
                { key: 'accessibleChartsMode', label: 'Accessible Chart Tables' }
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => updateProfile({ [item.key]: !profile[item.key] })}
                  className={`text-left px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                    profile[item.key]
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {item.label}: {profile[item.key] ? 'ON' : 'OFF'}
                </button>
              ))}
            </div>
          </div>
        )}

        {(profile.formAssistMode || profile.modeEnabled) && formErrors.length > 0 && (
          <div className="mx-4 md:mx-8 mt-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">Form Assist Summary</h3>
                <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-200">
                  {formErrors.map((error, index) => (
                    <li key={`${error}-${index}`}>• {error}</li>
                  ))}
                </ul>
              </div>
              <button
                onClick={clearFormErrors}
                className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 underline"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto animate-fadeIn">
            {children}
          </div>
        </main>

        <footer className="px-8 py-3 text-center text-[11px] font-medium text-slate-400 dark:text-slate-600 border-t border-slate-200 dark:border-slate-800">
          HRMS © {new Date().getFullYear()} · Secure Healthcare Platform
        </footer>
      </div>
    </div>
    </>
  );
};

export default DashboardLayout;
