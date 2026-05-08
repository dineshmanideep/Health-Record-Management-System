import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAccessibility } from '../context/useAccessibility';
import { useLanguage } from '../context/LanguageContext';

const SectionLabel = ({ children }) => (
  <p className="px-7 pt-5 pb-1.5 text-[10px] font-semibold text-slate-400 dark:text-white/25 uppercase tracking-[0.15em]">{children}</p>
);

const SidebarNavLink = ({ to, icon, children, isActive, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
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

const DashboardLayout = ({ children, title }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { profile, updateProfile, toggleAccessibilityMode, formErrors, clearFormErrors } = useAccessibility();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const getRoleName = (role) => {
    const roles = { user: 'Patient', doctor: 'Doctor', nurse: 'Nurse', hospital: 'Hospital', admin: 'Admin' };
    return roles[role] || 'User';
  };

  return (
    <>
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-lg"
    >
      {t({ en: 'Skip to main content', hi: 'मुख्य सामग्री पर जाएं' })}
    </a>
    <div className={`min-h-screen flex flex-col md:flex-row bg-slate-100 dark:bg-[#0B1120] transition-colors duration-300 ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-4 sticky top-0 z-50 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-md">✚</div>
          <h2 className="text-base font-bold tracking-tight">HRMS</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            title={theme === 'light'
              ? t({ en: 'Switch to Dark Mode', hi: 'डार्क मोड पर जाएं' })
              : t({ en: 'Switch to Light Mode', hi: 'लाइट मोड पर जाएं' })
            }
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button
            onClick={toggleLanguage}
            title={t({ en: 'Switch language', hi: 'भाषा बदलें' })}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          >
            {language === 'en' ? 'EN' : 'HI'}
          </button>
          <button
            onClick={handleLogout}
            title={t({ en: 'Sign Out', hi: 'साइन आउट' })}
            className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center transition-all hover:scale-105 active:scale-95 border border-red-100 dark:border-red-900/20"
          >
            🚪
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className={`w-9 h-9 rounded-xl transition-all flex items-center justify-center ${isMobileMenuOpen ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800'}`}
          >
            <span className="text-lg">{isMobileMenuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky md:top-0 inset-y-0 left-0 z-50 w-64 h-screen
        bg-white dark:bg-slate-900
        border-r border-slate-200 dark:border-slate-800
        transform transition-transform duration-300 ease-in-out
        shadow-2xl md:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-full flex flex-col overflow-y-auto custom-scrollbar">
          {/* Logo */}
          <div className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-emerald-500/30">✚</div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">HRMS</h2>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tracking-wider uppercase">{t({ en: 'Portal Node', hi: 'पोर्टल नोड' })}</p>
              </div>
            </div>
            {/* Premium Navigation Controls */}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => navigate(-1)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800/50 rounded-xl transition-all duration-200 group active:scale-95"
                title={t({ en: 'Go Back', hi: 'पीछे जाएं' })}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform"><path d="m15 18-6-6 6-6"/></svg>
                <span className="text-[10px] font-bold uppercase tracking-wider">{t({ en: 'Back', hi: 'वापस' })}</span>
              </button>
              <button
                onClick={() => navigate(1)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800/50 rounded-xl transition-all duration-200 group active:scale-95"
                title={t({ en: 'Go Forward', hi: 'आगे जाएं' })}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider">{t({ en: 'Next', hi: 'आगे' })}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform"><path d="m9 18 6-6 6-6"/></svg>
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 space-y-1">
            <SectionLabel>{t({ en: 'Main Terminal', hi: 'मुख्य भाग' })}</SectionLabel>
            <SidebarNavLink to={`/${user?.role === 'user' ? 'patient' : user?.role}/dashboard`} icon="📊" isActive={location.pathname === `/${user?.role === 'user' ? 'patient' : user?.role}/dashboard`} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'Dashboard', hi: 'डैशबोर्ड' })}</SidebarNavLink>
            <SidebarNavLink to={`/${user?.role === 'user' ? 'patient' : user?.role}/profile`} icon="👤" isActive={location.pathname === `/${user?.role === 'user' ? 'patient' : user?.role}/profile`} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'My Profile', hi: 'मेरी प्रोफाइल' })}</SidebarNavLink>

            {user?.role === 'user' && (
              <>
                <SectionLabel>{t({ en: 'Medical Data', hi: 'मेडिकल डेटा' })}</SectionLabel>
                <SidebarNavLink to="/patient/records" icon="📋" isActive={location.pathname === '/patient/records'} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'Records', hi: 'रिकॉर्ड' })}</SidebarNavLink>
                <SidebarNavLink to="/patient/health-analytics" icon="📈" isActive={location.pathname === '/patient/health-analytics'} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'Analytics', hi: 'विश्लेषण' })}</SidebarNavLink>
                <SidebarNavLink to="/patient/smartwatch-insights" icon="⌚" isActive={location.pathname === '/patient/smartwatch-insights'} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'Insights', hi: 'जानकारी' })}</SidebarNavLink>
                <SidebarNavLink to="/patient/activity-logs" icon="📝" isActive={location.pathname === '/patient/activity-logs'} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'Activity', hi: 'गतिविधि' })}</SidebarNavLink>
              </>
            )}
            {user?.role === 'doctor' && (
              <>
                <SectionLabel>{t({ en: 'Patient Care', hi: 'मरीज देखभाल' })}</SectionLabel>
                <SidebarNavLink to="/doctor/patients" icon="👥" isActive={location.pathname === '/doctor/patients'} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'Patients', hi: 'मरीज' })}</SidebarNavLink>
                <SidebarNavLink to="/doctor/assign-records" icon="✍️" isActive={location.pathname === '/doctor/assign-records'} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'Records', hi: 'रिकॉर्ड' })}</SidebarNavLink>
                <SidebarNavLink to="/doctor/audit-logs" icon="📋" isActive={location.pathname === '/doctor/audit-logs'} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'Audits', hi: 'ऑडिट' })}</SidebarNavLink>
              </>
            )}
            {user?.role === 'nurse' && (
              <>
                <SectionLabel>{t({ en: 'Assignments', hi: 'काम' })}</SectionLabel>
                <SidebarNavLink to="/nurse/assignments" icon="📋" isActive={location.pathname === '/nurse/assignments'} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'Doctor Tasks', hi: 'डॉक्टर कार्य' })}</SidebarNavLink>
                <SidebarNavLink to="/nurse/test-assignments" icon="🧪" isActive={location.pathname === '/nurse/test-assignments'} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'Test Center', hi: 'टेस्ट केंद्र' })}</SidebarNavLink>
                <SidebarNavLink to="/nurse/audit-logs" icon="🔍" isActive={location.pathname === '/nurse/audit-logs'} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'Audits', hi: 'ऑडिट' })}</SidebarNavLink>
              </>
            )}
            {user?.role === 'hospital' && (
              <>
                <SectionLabel>{t({ en: 'Operations', hi: 'संचालन' })}</SectionLabel>
                <SidebarNavLink to="/hospital/doctors" icon="⚕️" isActive={location.pathname === '/hospital/doctors'} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'Doctors', hi: 'डॉक्टर' })}</SidebarNavLink>
                <SidebarNavLink to="/hospital/nurses" icon="👩‍⚕️" isActive={location.pathname === '/hospital/nurses'} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'Nurses', hi: 'नर्स' })}</SidebarNavLink>
                <SidebarNavLink to="/hospital/tests" icon="🔬" isActive={location.pathname === '/hospital/tests'} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'Protocols', hi: 'प्रोटोकॉल' })}</SidebarNavLink>
                <SidebarNavLink to="/hospital/test-assignments" icon="📋" isActive={location.pathname === '/hospital/test-assignments'} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'Deployments', hi: 'तैनाती' })}</SidebarNavLink>
                <SidebarNavLink to="/hospital/audit-logs" icon="🔍" isActive={location.pathname === '/hospital/audit-logs'} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'Safety', hi: 'सुरक्षा' })}</SidebarNavLink>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <SectionLabel>{t({ en: 'System Admin', hi: 'सिस्टम एडमिन' })}</SectionLabel>
                <SidebarNavLink to="/admin/hospitals" icon="🏥" isActive={location.pathname === '/admin/hospitals'} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'Hospitals', hi: 'अस्पताल' })}</SidebarNavLink>
                <SidebarNavLink to="/admin/doctors" icon="⚕️" isActive={location.pathname === '/admin/doctors'} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'Doctors', hi: 'डॉक्टर' })}</SidebarNavLink>
                <SidebarNavLink to="/admin/nurses" icon="👩‍⚕️" isActive={location.pathname === '/admin/nurses'} onClick={() => setIsMobileMenuOpen(false)}>{t({ en: 'Nurses', hi: 'नर्स' })}</SidebarNavLink>
              </>
            )}
          </nav>

          <div className="p-6 border-t border-slate-100 dark:border-slate-800">
             <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-[0.2em] uppercase text-center">{t({ en: 'Version 2.4.0-Stable', hi: 'संस्करण 2.4.0-स्थिर' })}</p>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Desktop Header */}
        <header className="hidden md:flex bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-8 py-4 justify-between items-center border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              title={theme === 'light'
                ? t({ en: 'Switch to Dark Mode', hi: 'डार्क मोड पर जाएं' })
                : t({ en: 'Switch to Light Mode', hi: 'लाइट मोड पर जाएं' })
              }
              className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center justify-center transition-all hover:scale-105 active:scale-95 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <span className="text-base">{theme === 'light' ? '🌙' : '☀️'}</span>
            </button>

            <button
              onClick={toggleLanguage}
              title={t({ en: 'Switch language', hi: 'भाषा बदलें' })}
              className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center justify-center text-[12px] font-bold text-slate-600 dark:text-slate-300 transition-all hover:scale-105 active:scale-95 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              {language === 'en' ? 'EN' : 'HI'}
            </button>

            <button
              onClick={handleLogout}
              className="px-5 py-2.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 border border-red-100 dark:border-red-900/20 flex items-center gap-2.5 shadow-sm hover:scale-105 active:scale-95"
              title={t({ en: 'End session', hi: 'सत्र समाप्त करें' })}
            >
              <span className="text-sm">🚪</span>
              <span className="hidden lg:inline">{t({ en: 'Sign Out', hi: 'साइन आउट' })}</span>
            </button>
          </div>
        </header>


        {/* Page Content */}
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-10 outline-none">
          <div className="max-w-7xl mx-auto animate-fadeIn">
            {children}
          </div>
        </main>

        <footer className="px-4 sm:px-8 py-5 text-center border-t border-slate-200 dark:border-slate-800 transition-colors">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">
            {t({ en: 'HRMS PORTAL OPS', hi: 'HRMS पोर्टल ऑप्स' })} · © {new Date().getFullYear()} · {t({ en: 'SECURE ACCESS POINT', hi: 'सुरक्षित एक्सेस पॉइंट' })}
          </p>
        </footer>
      </div>
    </div>
    </>
  );
};

export default DashboardLayout;
