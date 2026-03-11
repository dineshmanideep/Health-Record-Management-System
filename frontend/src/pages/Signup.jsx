import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPasswordError } from '../utils/passwordValidation';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';

const Signup = () => {
  const navigate = useNavigate();
  const { signup, isAuthenticated, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    // Doctor/Nurse specific - only license number required
    licenseNumber: '',
    // Hospital specific - only registration number required
    registrationNumber: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingState, setPendingState] = useState({ isPending: false, message: '', role: '' });

  if (authLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
  };

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

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!validatePassword()) {
      return;
    }

    setLoading(true);

    // Build signup data with only essential fields
    const { confirmPassword: _, ...baseFields } = formData;
    
    // Remove empty/unused fields based on role
    const signupData = { ...baseFields };
    
    // Remove licenseNumber for patient and hospital
    if (formData.role === 'user' || formData.role === 'hospital') {
      delete signupData.licenseNumber;
    }
    
    // Remove registrationNumber for patient, doctor, and nurse
    if (formData.role !== 'hospital') {
      delete signupData.registrationNumber;
    }

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

  // Pending approval screen for hospital/doctor/nurse
  if (pendingState.isPending) {
    const icons = {
      hospital: '🏥',
      doctor: '👨‍⚕️',
      nurse: '👩‍⚕️'
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-purple-600 to-purple-800 p-5">
        <div className="bg-white rounded-xl shadow-2xl p-10 w-full max-w-lg text-center">
          <div className="text-6xl mb-4">{icons[pendingState.role] || '✅'}</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Account Submitted!</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">{pendingState.message}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-amber-800 text-sm font-semibold">What happens next?</p>
            {pendingState.role === 'hospital' && (
              <ul className="text-amber-700 text-sm mt-2 space-y-1">
                <li>• An admin will review your registration</li>
                <li>• Once approved, you can log in and manage your staff</li>
                <li>• You can then generate OTPs to invite doctors and nurses</li>
              </ul>
            )}
            {(pendingState.role === 'doctor' || pendingState.role === 'nurse') && (
              <ul className="text-amber-700 text-sm mt-2 space-y-1">
                <li>• An admin will verify your license number</li>
                <li>• Once verified, you can log in to your account</li>
                <li>• Hospitals can then invite you to affiliate using an OTP</li>
              </ul>
            )}
          </div>
          <Link
            to="/login"
            className="inline-block w-full py-3 bg-linear-to-r from-purple-600 to-purple-800 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-purple-600 to-purple-800 p-5 py-10">
      <div className="bg-white rounded-xl shadow-2xl p-10 w-full max-w-2xl my-8">
        <div className="text-center mb-8">
          <h1 className="text-purple-600 text-3xl font-bold mb-2">Health Record Management System</h1>
          <h2 className="text-gray-800 text-2xl font-semibold">Create Account</h2>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg border-l-4 border-red-600 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="role" className="block text-sm font-semibold text-gray-700">
              Select Role
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
            >
              <option value="user">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
              <option value="hospital">Hospital</option>
            </select>
          </div>

          {/* Common Fields */}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
              {formData.role === 'hospital' ? 'Hospital Name' : 'Full Name'}
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={formData.role === 'hospital' ? 'Enter hospital name' : 'Enter your full name'}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
            />
          </div>

          {/* Doctor/Nurse: License Number */}
          {(formData.role === 'doctor' || formData.role === 'nurse') && (
            <div className="space-y-2">
              <label htmlFor="licenseNumber" className="block text-sm font-semibold text-gray-700">
                {formData.role === 'doctor' ? 'Medical License Number' : 'Nursing License Number'} *
              </label>
              <input
                type="text"
                id="licenseNumber"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                placeholder={`Enter your ${formData.role === 'doctor' ? 'medical' : 'nursing'} license number`}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be verified by an admin before your account is activated.
              </p>
            </div>
          )}

          {/* Hospital: Registration Number */}
          {formData.role === 'hospital' && (
            <div className="space-y-2">
              <label htmlFor="registrationNumber" className="block text-sm font-semibold text-gray-700">
                Hospital Registration Number *
              </label>
              <input
                type="text"
                id="registrationNumber"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                placeholder="Enter hospital registration number"
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be verified by an admin before your account is activated.
              </p>
            </div>
          )}

          {/* Password Fields */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
            />
            
            {/* Password Strength Indicator */}
            <PasswordStrengthIndicator password={formData.password} />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
            />
          </div>

       

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-linear-to-r from-purple-600 to-purple-800 text-white rounded-lg text-base font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-3"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-gray-200">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-600 font-semibold hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
