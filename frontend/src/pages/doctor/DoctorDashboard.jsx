import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/api';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [affiliations, setAffiliations] = useState([]);
  const [otpInput, setOtpInput] = useState('');
  const [deptInput, setDeptInput] = useState('');
  const [affiliating, setAffiliating] = useState(false);
  const [affiliateMsg, setAffiliateMsg] = useState({ type: '', text: '' });

  const fetchAffiliations = () => {
    profileService.doctor.getAffiliations()
      .then((r) => setAffiliations(r.data || []))
      .catch(() => {});
  };

  useEffect(() => { fetchAffiliations(); }, []);

  const handleAffiliate = async (e) => {
    e.preventDefault();
    if (!otpInput.trim()) return;
    setAffiliating(true);
    setAffiliateMsg({ type: '', text: '' });
    try {
      const data = await profileService.doctor.affiliate(otpInput.trim(), deptInput.trim());
      setAffiliateMsg({ type: 'success', text: `Successfully affiliated with ${data.hospital?.name || 'the hospital'}!` });
      setOtpInput('');
      setDeptInput('');
      fetchAffiliations();
    } catch (err) {
      setAffiliateMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to affiliate. Check your OTP.' });
    } finally {
      setAffiliating(false);
    }
  };

  return (
    <DashboardLayout title="Doctor Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Total Patients</h3>
          <p className="text-4xl font-bold text-purple-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Today's Appointments</h3>
          <p className="text-4xl font-bold text-purple-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Hospital Affiliations</h3>
          <p className="text-4xl font-bold text-purple-600">{affiliations.filter(a => a.status === 'active').length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Rating</h3>
          <p className="text-4xl font-bold text-purple-600">{user?.rating?.toFixed(1) ?? '0.0'}</p>
        </div>
      </div>

      {/* Affiliate with a hospital */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 text-xl font-semibold mb-2">Link to a Hospital</h2>
        <p className="text-gray-500 text-sm mb-4">
          Enter the 6-digit OTP provided by the hospital to affiliate your account.
        </p>
        <form onSubmit={handleAffiliate} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">OTP from Hospital</label>
            <input
              type="text"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
              placeholder="6-digit OTP"
              className="w-36 px-3 py-2 border-2 border-gray-200 rounded-lg text-base font-mono focus:outline-none focus:border-purple-600 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Department (optional)</label>
            <input
              type="text"
              value={deptInput}
              onChange={(e) => setDeptInput(e.target.value)}
              placeholder="e.g., Cardiology"
              className="w-48 px-3 py-2 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={affiliating || otpInput.length !== 6}
            className="px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {affiliating ? 'Linking...' : 'Link'}
          </button>
        </form>
        {affiliateMsg.text && (
          <p className={`mt-3 text-sm font-medium ${affiliateMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {affiliateMsg.text}
          </p>
        )}
      </div>

      {/* Current affiliations */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 text-xl font-semibold mb-4">My Hospital Affiliations</h2>
        {affiliations.length === 0 ? (
          <p className="text-gray-500 text-sm">No affiliations yet. Use an OTP from a hospital to link your account.</p>
        ) : (
          <ul className="space-y-3">
            {affiliations.map((aff) => (
              <li key={aff._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-800">{aff.hospital?.name || 'Hospital'}</p>
                  <p className="text-sm text-gray-500">
                    {aff.hospital?.address?.city && `${aff.hospital.address.city} · `}
                    {aff.department || 'No department assigned'}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${aff.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {aff.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-gray-800 text-xl font-semibold mb-2">Today's Schedule</h2>
        <p className="text-gray-500 text-sm">No appointments scheduled for today.</p>
      </div>
    </DashboardLayout>
  );
};

export default DoctorDashboard;
