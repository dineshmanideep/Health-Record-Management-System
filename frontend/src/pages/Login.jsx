import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'user'
  });
  const [loading, setLoading] = useState(false);

  if (authLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData);
    
    if (result.success) {
      toast.success(t({ en: `Welcome back, ${formData.email.split('@')[0]}!`, hi: `वापसी पर स्वागत है, ${formData.email.split('@')[0]}!` }));
      navigate('/dashboard');
    } else {
      toast.error(result.message || t({ en: 'Login failed. Please try again.', hi: 'लॉगिन नहीं हो सका। फिर से कोशिश करें।' }));
    }
    
    setLoading(false);
  };

  const roleOptions = [
    { value: 'user', label: t({ en: 'Patient', hi: 'मरीज' }), icon: '🛡️' },
    { value: 'doctor', label: t({ en: 'Doctor', hi: 'डॉक्टर' }), icon: '🩺' },
    { value: 'nurse', label: t({ en: 'Nurse', hi: 'नर्स' }), icon: '💉' },
    { value: 'hospital', label: t({ en: 'Hospital', hi: 'अस्पताल' }), icon: '🏥' },
    { value: 'admin', label: t({ en: 'Admin', hi: 'एडमिन' }), icon: '⚙️' }
  ];

  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-teal-500/5 rounded-full translate-y-1/3 -translate-x-1/3 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(16,185,129,0.06),transparent_60%)]" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-emerald-500/20">✚</div>
            <span className="text-white text-lg font-bold">HRMS {t({ en: 'Portal', hi: 'पोर्टल' })}</span>
          </div>
        </div>
        
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            {t({ en: 'Welcome back to your health hub', hi: 'आपके हेल्थ हब में फिर से स्वागत है' })}
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed max-w-md">
            {t({ en: 'Access your medical records, manage appointments, and stay connected with your healthcare team—all in one place.', hi: 'अपने मेडिकल रिकॉर्ड देखें, अपॉइंटमेंट संभालें और अपनी टीम से जुड़े रहें — सब एक ही जगह।' })}
          </p>
        </div>
        
        {/* Stats removed for cleaner UI */}
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-950 p-6 sm:p-10 relative">
        <button 
          onClick={toggleTheme}
          className="absolute top-6 right-6 w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-amber-400 hover:scale-105 transition-all flex items-center justify-center"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button
          onClick={toggleLanguage}
          title={t({ en: 'Switch language', hi: 'भाषा बदलें' })}
          className="absolute top-6 right-16 w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:scale-105 transition-all flex items-center justify-center"
        >
          {language === 'en' ? 'EN' : 'HI'}
        </button>

        <div className="w-full max-w-md animate-fadeIn">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-emerald-500/20">✚</div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">HRMS {t({ en: 'Portal', hi: 'पोर्टल' })}</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">{t({ en: 'Sign in to your account', hi: 'अपने अकाउंट में साइन इन करें' })}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t({ en: 'Enter your credentials to access the dashboard', hi: 'डैशबोर्ड के लिए अपनी जानकारी भरें' })}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2.5 uppercase tracking-wider">{t({ en: 'Select Role', hi: 'भूमिका चुनें' })}</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {roleOptions.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => handleChange({ target: { name: 'role', value: role.value } })}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                      formData.role === role.value
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 scale-105 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <span className="text-lg">{role.icon}</span>
                    <span className={`text-[10px] font-bold ${formData.role === role.value ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>{role.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t({ en: 'you@example.com', hi: 'you@example.com' })}
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={t({ en: 'Enter your password', hi: 'अपना पासवर्ड लिखें' })}
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t({ en: 'Signing in...', hi: 'साइन इन हो रहा है...' })}
                </span>
              ) : t({ en: 'Sign In', hi: 'साइन इन' })}
            </button>
          </form>

          <div className="text-center mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t({ en: "Don't have an account?", hi: 'अकाउंट नहीं है?' })}{' '}
              <Link to="/signup" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                {t({ en: 'Create one', hi: 'अकाउंट बनाएं' })}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
