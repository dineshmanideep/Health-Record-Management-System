import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Home = () => {
  const { isAuthenticated, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const features = [
    { icon: '👤', title: 'For Patients', desc: 'Securely store and access your full medical history with a single tap, anywhere you go.' },
    { icon: '⚕️', title: 'For Doctors', desc: 'Instant access to holistic patient data for faster, evidence-based clinical decisions.' },
    { icon: '🏥', title: 'For Hospitals', desc: 'Elevate operational efficiency by centralizing records and eliminating data silos.' },
    { icon: '👩‍⚕️', title: 'For Nurses', desc: 'Real-time updates and seamless test result uploads for coordinated care.' }
  ];

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 font-sans ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Premium Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-indigo-500/20 shadow-lg group-hover:rotate-12 transition-transform">
              <span className="text-xl">✚</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:block hidden">
              HRMS <span className="text-indigo-600">Portal</span>
            </h2>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-amber-400 hover:scale-105 transition-all shadow-sm"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <Link to="/login" className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="hidden sm:inline-flex bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 transition-all">
              Join Now
            </Link>
          </div>
        </div>
      </nav>

      {/* Modern Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-indigo-600/5 dark:bg-indigo-500/10 blur-3xl rounded-full -z-10" />
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold tracking-widest uppercase mb-8 animate-bounce-slow">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
            Reinventing Healthcare Access
          </div>
          <h1 className="text-5xl sm:text-7xl font-black text-slate-900 dark:text-white mb-8 leading-[1.1] tracking-tight">
            The Future of <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Your Health Data</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
            Secure, centralized, and globally accessible health records. Empower yourself and your doctors with unified medical intelligence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/signup" className="w-full sm:w-auto bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-10 py-4 rounded-2xl font-bold text-lg hover:-translate-y-1 hover:shadow-2xl transition-all">
              Create Free Account
            </Link>
            <Link to="/login" className="w-full sm:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              Watch Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Advanced Features Grid */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <div key={i} className="group p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl dark:shadow-indigo-500/5 hover:-translate-y-2 transition-all duration-300">
              <div className="w-16 h-16 text-4xl mb-6 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{f.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Quote / Stats Section */}
      <section className="py-20 px-8">
        <div className="max-w-4xl mx-auto bg-indigo-600 rounded-[3rem] p-10 sm:p-20 text-center relative overflow-hidden shadow-2xl shadow-indigo-500/40">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6 relative z-10">Trusted by modern care teams globally.</h2>
          <p className="text-indigo-100 text-lg sm:text-xl font-medium mb-10 relative z-10 opacity-90">
            "We finally integrated patient data from disparate sources into one source of truth."
          </p>
          <div className="flex justify-center gap-8 relative z-10 text-white">
            <div><p className="text-3xl font-black">99.9%</p><p className="text-xs uppercase tracking-widest font-bold opacity-70">Security</p></div>
            <div className="w-px h-10 bg-white/20 self-center" />
            <div><p className="text-3xl font-black">2M+</p><p className="text-xs uppercase tracking-widest font-bold opacity-70">Records</p></div>
          </div>
        </div>
      </section>

      {/* Modern Footer */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <div className="flex items-center gap-2 mb-6 opacity-50 gray-scale">
            <div className="w-6 h-6 bg-slate-900 dark:bg-white rounded flex items-center justify-center text-[10px] text-white dark:text-slate-900 font-bold">✚</div>
            <span className="font-extrabold text-slate-900 dark:text-white">HRMS</span>
          </div>
          <p className="text-slate-400 dark:text-slate-600 text-sm font-medium mb-0">
            &copy; {new Date().getFullYear()} Health Record Management System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
