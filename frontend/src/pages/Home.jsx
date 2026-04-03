import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Home = () => {
  const { isAuthenticated, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const features = [
    { icon: '🛡️', title: 'For Patients', desc: 'Securely store and access your complete medical history from anywhere, anytime with a single tap.', color: 'from-indigo-500 to-purple-500' },
    { icon: '🩺', title: 'For Doctors', desc: 'Instant access to comprehensive patient data for faster, evidence-based clinical decisions.', color: 'from-teal-500 to-cyan-500' },
    { icon: '🏥', title: 'For Hospitals', desc: 'Elevate operational efficiency by centralizing records and eliminating data silos across departments.', color: 'from-blue-500 to-indigo-500' },
    { icon: '💉', title: 'For Nurses', desc: 'Real-time updates and seamless test result uploads for perfectly coordinated patient care.', color: 'from-pink-500 to-rose-500' }
  ];

  const stats = [
    { value: '99.9%', label: 'Uptime' },
    { value: '256-bit', label: 'Encryption' },
    { value: 'HIPAA', label: 'Compliant' },
    { value: '24/7', label: 'Support' }
  ];

  return (
    <div className={`min-h-screen bg-white dark:bg-[#0a0f1e] transition-colors duration-500 ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-strong border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 group-hover:scale-105 transition-all">
              <span className="text-sm font-bold">✚</span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white hidden sm:block">
              HRMS <span className="text-indigo-600 dark:text-indigo-400">Portal</span>
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-amber-400 hover:scale-105 transition-all flex items-center justify-center"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <Link to="/login" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-3 py-2">
              Sign In
            </Link>
            <Link to="/signup" className="hidden sm:inline-flex bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-indigo-400/10 dark:bg-indigo-500/5 blur-[120px] rounded-full -z-10" />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-purple-400/10 dark:bg-purple-500/5 blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide uppercase mb-8 animate-fadeIn border border-indigo-100 dark:border-indigo-800/50">
            <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Next-Gen Healthcare Platform
          </div>
          
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white mb-6 leading-[1.1] tracking-tight animate-slideUp">
            Your Health Data,{' '}
            <br className="hidden sm:block" />
            <span className="gradient-text">Unified & Secure</span>
          </h1>
          
          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10 animate-slideUp" style={{ animationDelay: '0.1s' }}>
            A centralized, globally accessible health record platform. Empower patients, doctors, and hospitals with unified medical intelligence.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center animate-slideUp" style={{ animationDelay: '0.2s' }}>
            <Link to="/signup" className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3.5 rounded-2xl font-semibold text-base shadow-xl shadow-indigo-500/25 hover:-translate-y-1 hover:shadow-indigo-500/40 transition-all">
              Create Free Account
            </Link>
            <Link to="/login" className="w-full sm:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-white px-8 py-3.5 rounded-2xl font-semibold text-base hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              Sign In →
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8 px-4 border-y border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-8 sm:gap-16">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">Built for Everyone</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">Role-based access ensures every stakeholder gets exactly what they need.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
          {features.map((f, i) => (
            <div key={i} className="group p-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover-lift animate-fadeInScale" style={{ animationDelay: `${i * 0.1}s`, opacity: 0, animationFillMode: 'forwards' }}>
              <div className={`w-14 h-14 text-3xl mb-5 bg-gradient-to-br ${f.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                <span className="drop-shadow-sm">{f.icon}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{f.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden shadow-2xl shadow-indigo-500/30">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
          
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-4 relative z-10 tracking-tight">
            Ready to modernize your healthcare?
          </h2>
          <p className="text-indigo-100 text-base sm:text-lg mb-8 relative z-10 max-w-xl mx-auto leading-relaxed opacity-90">
            Join the platform trusted by healthcare professionals for secure, centralized medical record management.
          </p>
          <Link to="/signup" className="relative z-10 inline-flex bg-white text-indigo-700 px-8 py-3.5 rounded-2xl font-bold text-base shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all">
            Start for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-[#0a0f1e] border-t border-slate-100 dark:border-slate-800/50 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center text-[10px] text-white font-bold shadow-md">✚</div>
            <span className="font-bold text-slate-900 dark:text-white text-sm">HRMS Portal</span>
          </div>
          <p className="text-slate-400 dark:text-slate-600 text-xs font-medium">
            © {new Date().getFullYear()} Health Record Management System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
