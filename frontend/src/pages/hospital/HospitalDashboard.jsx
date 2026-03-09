import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/api';

const HospitalDashboard = () => {
  const { user } = useAuth();
  const [otp, setOtp] = useState({ value: null, expiresAt: null, targetRole: null });
  const [generating, setGenerating] = useState(false);
  const [affiliations, setAffiliations] = useState([]);
  const [otpError, setOtpError] = useState('');

  useEffect(() => {
    profileService.hospital.getAffiliations()
      .then((r) => setAffiliations(r.data || []))
      .catch(() => {});
  }, []);

  const generateOTP = async (targetRole) => {
    setGenerating(true);
    setOtpError('');
    setOtp({ value: null, expiresAt: null, targetRole: null });
    try {
      const data = await profileService.hospital.generateOTP(targetRole);
      setOtp({ value: data.otp, expiresAt: new Date(data.expiresAt), targetRole });
    } catch (err) {
      setOtpError(err?.response?.data?.message || 'Failed to generate OTP');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardLayout title="Hospital Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Affiliated Doctors</h3>
          <p className="text-4xl font-bold text-teal-600">{affiliations.filter(a => a.staffRole === 'doctor').length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Affiliated Nurses</h3>
          <p className="text-4xl font-bold text-teal-600">{affiliations.filter(a => a.staffRole === 'nurse').length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Available Beds</h3>
          <p className="text-4xl font-bold text-teal-600">{user?.availableBeds ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Total Beds</h3>
          <p className="text-4xl font-bold text-teal-600">{user?.totalBeds ?? 0}</p>
        </div>
      </div>

      {/* OTP Generation */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 text-xl font-semibold mb-4">Invite Staff via OTP</h2>
        <p className="text-gray-500 text-sm mb-4">
          Generate a 6-digit one-time code (valid 10 minutes) and share it with a verified doctor or nurse so they can affiliate with your hospital.
        </p>

        <div className="flex gap-3 mb-4">
          <button
            onClick={() => generateOTP('doctor')}
            disabled={generating}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate OTP for Doctor'}
          </button>
          <button
            onClick={() => generateOTP('nurse')}
            disabled={generating}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate OTP for Nurse'}
          </button>
        </div>

        {otpError && <p className="text-red-600 text-sm mb-3">{otpError}</p>}

        {otp.value && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-5">
            <p className="text-sm text-teal-700 font-medium mb-2">
              Share this OTP with the {otp.targetRole} — it expires at {otp.expiresAt?.toLocaleTimeString()}
            </p>
            <p className="text-5xl font-bold text-teal-800 tracking-widest text-center py-3 font-mono">
              {otp.value}
            </p>
            <p className="text-xs text-teal-600 text-center mt-2">Shown only once. Do not share publicly.</p>
          </div>
        )}
      </div>

      {/* Current Staff */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-gray-800 text-xl font-semibold mb-4">Affiliated Staff</h2>
        {affiliations.length === 0 ? (
          <p className="text-gray-500 text-sm">No staff affiliated yet. Generate an OTP above to invite doctors or nurses.</p>
        ) : (
          <ul className="space-y-2">
            {affiliations.map((aff) => (
              <li key={aff._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-xs font-semibold uppercase text-teal-600 mr-2">{aff.staffRole}</span>
                  <span className="text-gray-700 text-sm">{aff.department || 'No department'}</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(aff.joinedAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
};

export default HospitalDashboard;
