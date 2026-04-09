import { useState, useCallback, memo } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    licenseNumber: '',
    registrationNumber: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingState, setPendingState] = useState({ isPending: false, message: '', role: '' });

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  }, []);

  if (authLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const validatePassword = () => {
    const errorMessage = getPasswordError(formData.password);
    if (errorMessage) {
      setError(errorMessage);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!validatePassword()) return;
    setLoading(true);

    const { confirmPassword: _, ...baseFields } = formData;
    const signupData = { ...baseFields };
    if (formData.role === 'user' || formData.role === 'hospital') delete signupData.licenseNumber;
    if (formData.role !== 'hospital') delete signupData.registrationNumber;

    const result = await signup(signupData);
    if (result.success) {
      if (result.pending) {
        setPendingState({ isPending: true, message: result.message, role: formData.role });
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.message || 'Signup failed. Please try again.');
    }
    setLoading(false);
  };

  const roleOptions = [
    { value: 'user', label: 'Patient', icon: '🛡️' },
    { value: 'doctor', label: 'Doctor', icon: '🩺' },
    { value: 'nurse', label: 'Nurse', icon: '💉' },
    { value: 'hospital', label: 'Hospital', icon: '🏥' }
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
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">Account Submitted!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed text-sm">{pendingState.message}</p>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-xl p-4 mb-6 text-left">
            <p className="text-amber-700 dark:text-amber-400 text-xs font-semibold mb-2 uppercase tracking-wider">What happens next?</p>
            {pendingState.role === 'hospital' && (
              <ul className="text-amber-600 dark:text-amber-400/80 text-xs space-y-1.5">
                <li>• An admin will review your registration</li>
                <li>• Once approved, you can log in and manage your staff</li>
                <li>• You can then generate OTPs to invite doctors and nurses</li>
              </ul>
            )}
            {(pendingState.role === 'doctor' || pendingState.role === 'nurse') && (
              <ul className="text-amber-600 dark:text-amber-400/80 text-xs space-y-1.5">
                <li>• An admin will verify your license number</li>
                <li>• Once verified, you can log in to your account</li>
                <li>• Hospitals can then invite you to affiliate using an OTP</li>
              </ul>
            )}
          </div>
          <Link
            to="/login"
            className="inline-flex w-full justify-center py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Go to Login
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
            <span className="text-white text-lg font-bold">HRMS Portal</span>
          </div>
        </div>
        
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            Join the future of healthcare
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed max-w-md">
            Create your account to start managing medical records securely. Whether you're a patient, doctor, nurse, or hospital.
          </p>
        </div>
        
        <div className="relative z-10 flex gap-6">
          {[
            { val: 'Free', label: 'For Patients' },
            { val: 'Instant', label: 'Setup' },
            { val: 'Secure', label: 'Always' }
          ].map((s, i) => (
            <div key={i}>
              <p className="text-xl font-extrabold text-white">{s.val}</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-950 p-6 sm:p-10 relative overflow-y-auto">
        <button 
          onClick={toggleTheme}
          className="absolute top-6 right-6 w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-amber-400 hover:scale-105 transition-all flex items-center justify-center z-10"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        <div className="w-full max-w-lg my-8 animate-fadeIn">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-emerald-500/20">✚</div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">HRMS Portal</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Create your account</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Fill in your details to get started</p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3.5 rounded-xl border border-red-100 dark:border-red-900/30 mb-6 text-sm font-medium animate-fadeIn flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2.5 uppercase tracking-wider">I am a...</label>
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
                label={formData.role === 'hospital' ? 'Hospital Name' : 'Full Name'}
                id="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={formData.role === 'hospital' ? 'Hospital name' : 'Your full name'}
                required
              />
              <InputField
                label="Email"
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Doctor/Nurse: License Number */}
            {(formData.role === 'doctor' || formData.role === 'nurse') && (
              <InputField
                label={formData.role === 'doctor' ? 'Medical License Number' : 'Nursing License Number'}
                id="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                placeholder={`Enter your ${formData.role === 'doctor' ? 'medical' : 'nursing'} license number`}
                required
                hint="This will be verified by an admin before activation."
              />
            )}

            {/* Hospital: Registration Number */}
            {formData.role === 'hospital' && (
              <InputField
                label="Hospital Registration Number"
                id="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                placeholder="Enter registration number"
                required
                hint="This will be verified by an admin before activation."
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <InputField
                  label="Password"
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  required
                />
                <PasswordStrengthIndicator password={formData.password} />
              </div>
              <InputField
                label="Confirm Password"
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
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
                  Creating Account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <div className="text-center mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
