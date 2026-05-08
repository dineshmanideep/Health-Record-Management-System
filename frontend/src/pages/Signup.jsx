import { useState, useCallback, memo } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getPasswordError } from '../utils/passwordValidation';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';

// ── Memoized to prevent re-renders when parent state changes ──
const InputField = memo(({ label, id, type = 'text', value, onChange, placeholder, required = false, hint }) => (
  <div className="group">
    <label htmlFor={id} className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-[0.2em] group-focus-within:text-emerald-500 transition-colors">{label}</label>
    <input
      type={type}
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
    />
    {hint && <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-2 ml-1 italic">{hint}</p>}
  </div>
));

InputField.displayName = 'InputField';

const Signup = () => {
  const navigate = useNavigate();
  const { signup, isAuthenticated, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    licenseNumber: '',
    registrationNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [pendingState, setPendingState] = useState({ isPending: false, message: '', role: '' });

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  if (authLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const validatePassword = () => {
    const errorMessage = getPasswordError(formData.password);
    if (errorMessage) {
      toast.error(errorMessage);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error(t({ en: 'Passwords do not match', hi: 'पासवर्ड मेल नहीं खाते' }));
      return;
    }
    if (!validatePassword()) {
      toast.error(t({ en: 'Invalid password format', hi: 'पासवर्ड का फॉर्मेट सही नहीं है' }));
      return;
    }

    const { confirmPassword: _, ...baseFields } = formData;
    const signupData = { ...baseFields };
    if (formData.role === 'user' || formData.role === 'hospital') delete signupData.licenseNumber;
    if (formData.role !== 'hospital') delete signupData.registrationNumber;

    const result = await signup(signupData);
    if (result.success) {
      if (result.pending) {
        toast.success(t({ en: 'Registration submitted for approval', hi: 'रजिस्ट्रेशन समीक्षा के लिए भेजा गया' }));
        setPendingState({ isPending: true, message: result.message, role: formData.role });
      } else {
        toast.success(t({ en: 'Account created successfully!', hi: 'अकाउंट सफलतापूर्वक बन गया!' }));
        navigate('/dashboard');
      }
    } else {
      toast.error(result.message || t({ en: 'Signup failed. Please try again.', hi: 'साइन अप नहीं हो सका। फिर से कोशिश करें।' }));
    }
    setLoading(false);
  };

  const roleOptions = [
    { value: 'user', label: t({ en: 'Patient', hi: 'मरीज' }), icon: '🛡️' },
    { value: 'doctor', label: t({ en: 'Doctor', hi: 'डॉक्टर' }), icon: '🩺' },
    { value: 'nurse', label: t({ en: 'Nurse', hi: 'नर्स' }), icon: '💉' },
    { value: 'hospital', label: t({ en: 'Hospital', hi: 'अस्पताल' }), icon: '🏥' }
  ];

  // Pending approval screen
  if (pendingState.isPending) {
    const icons = { hospital: '🏥', doctor: '🩺', nurse: '💉' };
    return (
      <div className={`min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0f1e] p-5 ${theme === 'dark' ? 'dark' : ''}`}>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-10 w-full max-w-lg text-center animate-fadeInScale">
          <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg shadow-emerald-500/20">
            {icons[pendingState.role] || '✅'}
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">{t({ en: 'Account Submitted!', hi: 'अकाउंट भेज दिया गया!' })}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed text-sm">{pendingState.message}</p>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-xl p-4 mb-6 text-left">
            <p className="text-amber-700 dark:text-amber-400 text-xs font-semibold mb-2 uppercase tracking-wider">{t({ en: 'What happens next?', hi: 'अब आगे क्या होगा?' })}</p>
            {pendingState.role === 'hospital' && (
              <ul className="text-amber-600 dark:text-amber-400/80 text-xs space-y-1.5">
                <li>• {t({ en: 'An admin will review your registration', hi: 'एक एडमिन आपका रजिस्ट्रेशन देखेगा' })}</li>
                <li>• {t({ en: 'Once approved, you can log in and manage your staff', hi: 'मंजूरी के बाद आप लॉगिन करके स्टाफ संभालेंगे' })}</li>
                <li>• {t({ en: 'You can then generate OTPs to invite doctors and nurses', hi: 'फिर आप OTP बनाकर डॉक्टर और नर्स को बुला सकते हैं' })}</li>
              </ul>
            )}
            {(pendingState.role === 'doctor' || pendingState.role === 'nurse') && (
              <ul className="text-amber-600 dark:text-amber-400/80 text-xs space-y-1.5">
                <li>• {t({ en: 'An admin will verify your license number', hi: 'एक एडमिन आपका लाइसेंस नंबर जांचेगा' })}</li>
                <li>• {t({ en: 'Once verified, you can log in to your account', hi: 'जांच के बाद आप अपने अकाउंट में लॉगिन कर पाएंगे' })}</li>
                <li>• {t({ en: 'Hospitals can then invite you to affiliate using an OTP', hi: 'फिर अस्पताल OTP से आपको जोड़ सकते हैं' })}</li>
              </ul>
            )}
          </div>
          <Link
            to="/login"
            className="inline-flex w-full justify-center py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {t({ en: 'Go to Login', hi: 'लॉगिन पर जाएं' })}
          </Link>
        </div>
      </div>
    );
  }

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
            {t({ en: 'Join the future of healthcare', hi: 'हेल्थकेयर के नए दौर से जुड़ें' })}
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed max-w-md">
            {t({ en: 'Create your account to start managing medical records securely. Whether you\'re a patient, doctor, nurse, or hospital.', hi: 'अपना अकाउंट बनाएं और मेडिकल रिकॉर्ड सुरक्षित रूप से संभालें। चाहे आप मरीज हों, डॉक्टर हों, नर्स हों या अस्पताल।' })}
          </p>
        </div>
        
        {/* Stats removed for cleaner UI */}
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-950 p-6 sm:p-10 relative overflow-y-auto">
        <button 
          onClick={toggleTheme}
          className="absolute top-6 right-6 w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-amber-400 hover:scale-105 transition-all flex items-center justify-center z-10"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button
          onClick={toggleLanguage}
          title={t({ en: 'Switch language', hi: 'भाषा बदलें' })}
          className="absolute top-6 right-16 w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:scale-105 transition-all flex items-center justify-center z-10"
        >
          {language === 'en' ? 'EN' : 'HI'}
        </button>

        <div className="w-full max-w-lg my-8 animate-fadeIn">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-emerald-500/20">✚</div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">HRMS {t({ en: 'Portal', hi: 'पोर्टल' })}</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">{t({ en: 'Create your account', hi: 'अपना अकाउंट बनाएं' })}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t({ en: 'Fill in your details to get started', hi: 'शुरू करने के लिए अपनी जानकारी भरें' })}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2.5 uppercase tracking-wider">{t({ en: 'I am a...', hi: 'मैं हूँ...' })}</label>
              <div className="grid grid-cols-4 gap-2">
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
                    <span className="text-xl">{role.icon}</span>
                    <span className={`text-[10px] font-bold ${formData.role === role.value ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>{role.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label={formData.role === 'hospital' ? t({ en: 'Hospital Name', hi: 'अस्पताल का नाम' }) : t({ en: 'Full Name', hi: 'पूरा नाम' })}
                id="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={formData.role === 'hospital' ? t({ en: 'Hospital name', hi: 'अस्पताल का नाम' }) : t({ en: 'Your full name', hi: 'आपका पूरा नाम' })}
                required
              />
              <InputField
                label={t({ en: 'Email', hi: 'ईमेल' })}
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t({ en: 'you@example.com', hi: 'you@example.com' })}
                required
              />
            </div>

            {/* Doctor/Nurse: License Number */}
            {(formData.role === 'doctor' || formData.role === 'nurse') && (
              <InputField
                label={formData.role === 'doctor' ? t({ en: 'Medical License Number', hi: 'मेडिकल लाइसेंस नंबर' }) : t({ en: 'Nursing License Number', hi: 'नर्सिंग लाइसेंस नंबर' })}
                id="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                placeholder={t({ en: `Enter your ${formData.role === 'doctor' ? 'medical' : 'nursing'} license number`, hi: 'अपना लाइसेंस नंबर लिखें' })}
                required
                hint={t({ en: 'This will be verified by an admin before activation.', hi: 'इसे एडमिन द्वारा जांचा जाएगा।' })}
              />
            )}

            {/* Hospital: Registration Number */}
            {formData.role === 'hospital' && (
              <InputField
                label={t({ en: 'Hospital Registration Number', hi: 'अस्पताल रजिस्ट्रेशन नंबर' })}
                id="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                placeholder={t({ en: 'Enter registration number', hi: 'रजिस्ट्रेशन नंबर लिखें' })}
                required
                hint={t({ en: 'This will be verified by an admin before activation.', hi: 'इसे एडमिन द्वारा जांचा जाएगा।' })}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <InputField
                  label={t({ en: 'Password', hi: 'पासवर्ड' })}
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={t({ en: 'Create a password', hi: 'पासवर्ड बनाएं' })}
                  required
                />
                <PasswordStrengthIndicator password={formData.password} />
              </div>
              <InputField
                label={t({ en: 'Confirm Password', hi: 'पासवर्ड फिर से लिखें' })}
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder={t({ en: 'Re-enter password', hi: 'पासवर्ड फिर से लिखें' })}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t({ en: 'Creating Account...', hi: 'अकाउंट बन रहा है...' })}
                </span>
              ) : t({ en: 'Create Account', hi: 'अकाउंट बनाएं' })}
            </button>
          </form>

          <div className="text-center mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t({ en: 'Already have an account?', hi: 'पहले से अकाउंट है?' })}{' '}
              <Link to="/login" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                {t({ en: 'Sign in', hi: 'साइन इन' })}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
