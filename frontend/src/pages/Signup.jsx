import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'user',
    // Patient fields
    bloodGroup: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    // Doctor/Nurse fields
    specialization: '',
    licenseNumber: '',
    qualification: '',
    experience: '',
    // Nurse specific
    shift: 'Morning',
    // Hospital fields
    registrationNumber: '',
    hospitalType: 'Private',
    // Admin fields
    accessLevel: 'admin'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    // Build role-specific data
    const { confirmPassword: _, ...signupData } = formData;
    
    const result = await signup(signupData);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Signup failed. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-purple-800 p-5 py-10">
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

        <form onSubmit={handleSubmit} className="space-y-5 max-h-[60vh] overflow-y-auto px-2">
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
              <option value="admin">Admin</option>
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

          <div className="space-y-2">
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter your phone number"
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
            />
          </div>

          {/* Patient Specific Fields */}
          {formData.role === 'user' && (
            <>
              <div className="space-y-2">
                <label htmlFor="dateOfBirth" className="block text-sm font-semibold text-gray-700">
                  Date of Birth
                </label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="gender" className="block text-sm font-semibold text-gray-700">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="bloodGroup" className="block text-sm font-semibold text-gray-700">
                  Blood Group
                </label>
                <select
                  id="bloodGroup"
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="address" className="block text-sm font-semibold text-gray-700">
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street address"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="city" className="block text-sm font-semibold text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="state" className="block text-sm font-semibold text-gray-700">
                    State
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="State"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="zipCode" className="block text-sm font-semibold text-gray-700">
                  ZIP Code
                </label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  placeholder="ZIP code"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="emergencyContactName" className="block text-sm font-semibold text-gray-700">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  id="emergencyContactName"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  placeholder="Emergency contact name"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="emergencyContactPhone" className="block text-sm font-semibold text-gray-700">
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  id="emergencyContactPhone"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={handleChange}
                  placeholder="Emergency contact phone"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                />
              </div>
            </>
          )}

          {/* Doctor Specific Fields */}
          {formData.role === 'doctor' && (
            <>
              <div className="space-y-2">
                <label htmlFor="specialization" className="block text-sm font-semibold text-gray-700">
                  Specialization
                </label>
                <input
                  type="text"
                  id="specialization"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  placeholder="e.g., Cardiology, Neurology"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="licenseNumber" className="block text-sm font-semibold text-gray-700">
                  License Number
                </label>
                <input
                  type="text"
                  id="licenseNumber"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  placeholder="Medical license number"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="qualification" className="block text-sm font-semibold text-gray-700">
                  Qualification
                </label>
                <input
                  type="text"
                  id="qualification"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  placeholder="e.g., MBBS, MD"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="experience" className="block text-sm font-semibold text-gray-700">
                  Experience (years)
                </label>
                <input
                  type="number"
                  id="experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder="Years of experience"
                  min="0"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                />
              </div>
            </>
          )}

          {/* Nurse Specific Fields */}
          {formData.role === 'nurse' && (
            <>
              <div className="space-y-2">
                <label htmlFor="licenseNumber" className="block text-sm font-semibold text-gray-700">
                  License Number
                </label>
                <input
                  type="text"
                  id="licenseNumber"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  placeholder="Nursing license number"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="qualification" className="block text-sm font-semibold text-gray-700">
                  Qualification
                </label>
                <input
                  type="text"
                  id="qualification"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  placeholder="e.g., BSN, RN"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="experience" className="block text-sm font-semibold text-gray-700">
                  Experience (years)
                </label>
                <input
                  type="number"
                  id="experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder="Years of experience"
                  min="0"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="shift" className="block text-sm font-semibold text-gray-700">
                  Preferred Shift
                </label>
                <select
                  id="shift"
                  name="shift"
                  value={formData.shift}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                >
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                </select>
              </div>
            </>
          )}

          {/* Hospital Specific Fields */}
          {formData.role === 'hospital' && (
            <>
              <div className="space-y-2">
                <label htmlFor="registrationNumber" className="block text-sm font-semibold text-gray-700">
                  Registration Number
                </label>
                <input
                  type="text"
                  id="registrationNumber"
                  name="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  placeholder="Hospital registration number"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="hospitalType" className="block text-sm font-semibold text-gray-700">
                  Hospital Type
                </label>
                <select
                  id="hospitalType"
                  name="hospitalType"
                  value={formData.hospitalType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                >
                  <option value="Private">Private</option>
                  <option value="Government">Government</option>
                  <option value="Semi-Government">Semi-Government</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="address" className="block text-sm font-semibold text-gray-700">
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street address"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="city" className="block text-sm font-semibold text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="state" className="block text-sm font-semibold text-gray-700">
                    State
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="State"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="zipCode" className="block text-sm font-semibold text-gray-700">
                  ZIP Code
                </label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  placeholder="ZIP code"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                />
              </div>
            </>
          )}

          {/* Admin Specific Fields */}
          {formData.role === 'admin' && (
            <>
              <div className="space-y-2">
                <label htmlFor="accessLevel" className="block text-sm font-semibold text-gray-700">
                  Access Level
                </label>
                <select
                  id="accessLevel"
                  name="accessLevel"
                  value={formData.accessLevel}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                >
                  <option value="admin">Admin</option>
                  <option value="super-admin">Super Admin</option>
                  <option value="moderator">Moderator</option>
                </select>
              </div>
            </>
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
              placeholder="Enter your password (min 6 characters)"
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
            />
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
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-lg text-base font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-3"
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
