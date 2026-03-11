import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/api';

const HospitalDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState({ value: null, expiresAt: null, targetRole: null });
  const [generating, setGenerating] = useState(false);
  const [otpError, setOtpError] = useState('');

  useEffect(() => {
    profileService.hospital.getDashboard()
      .then((res) => { if (res.success) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const generateOTP = async (targetRole) => {
    setGenerating(true);
    setOtpError('');
    setOtp({ value: null, expiresAt: null, targetRole: null });
    try {
      const res = await profileService.hospital.generateOTP(targetRole);
      setOtp({ value: res.otp, expiresAt: new Date(res.expiresAt), targetRole });
    } catch (err) {
      setOtpError(err?.response?.data?.message || 'Failed to generate OTP');
    } finally {
      setGenerating(false);
    }
  };

  const actionLabel = (action) => {
    const map = {
      doctor_joined: 'Doctor Joined',
      nurse_joined: 'Nurse Joined',
      doctor_revoked: 'Doctor Revoked',
      nurse_revoked: 'Nurse Revoked',
      nurse_assigned_to_doctor: 'Nurse Assigned',
      nurse_unassigned_from_doctor: 'Nurse Unassigned',
      profile_updated: 'Profile Updated'
    };
    return map[action] || action;
  };

  const actionColor = (action) => {
    if (action.includes('joined')) return 'bg-green-100 text-green-700';
    if (action.includes('revoked')) return 'bg-red-100 text-red-700';
    if (action.includes('assigned')) return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <DashboardLayout title="Hospital Dashboard">
      {loading ? (
        <p className="text-gray-500">Loading dashboard...</p>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Affiliated Doctors</h3>
              <p className="text-4xl font-bold text-teal-600">{data?.doctorCount || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Affiliated Nurses</h3>
              <p className="text-4xl font-bold text-teal-600">{data?.nurseCount || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Available Beds</h3>
              <p className="text-4xl font-bold text-teal-600">{data?.availableBeds ?? 0}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Total Beds</h3>
              <p className="text-4xl font-bold text-teal-600">{data?.totalBeds ?? 0}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
            <h2 className="text-gray-800 text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link to="/hospital/tests" className="px-5 py-3 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors no-underline">
                🧪 Manage Test Types
              </Link>
              <Link to="/hospital/test-assignments" className="px-5 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors no-underline">
                📋 Test Assignments
              </Link>
              <Link to="/hospital/doctors" className="px-5 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors no-underline">
                👨‍⚕️ View Doctors
              </Link>
              <Link to="/hospital/nurses" className="px-5 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors no-underline">
                👩‍⚕️ View Nurses
              </Link>
              <Link to="/hospital/audit-logs" className="px-5 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors no-underline">
                📊 Audit Logs
              </Link>
            </div>
          </div>

          {/* Welcome + OTP Generation */}
          <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
            <h2 className="text-gray-800 mb-2 text-2xl font-semibold">Welcome, {user?.name}!</h2>
            <p className="text-gray-600 mb-5">Generate a one-time code (valid 10 mins) and share it with a verified doctor or nurse so they can join your hospital.</p>

            <div className="flex gap-3 mb-4 flex-wrap">
              <button onClick={() => generateOTP('doctor')} disabled={generating} className="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50">
                {generating ? 'Generating...' : 'Generate OTP for Doctor'}
              </button>
              <button onClick={() => generateOTP('nurse')} disabled={generating} className="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50">
                {generating ? 'Generating...' : 'Generate OTP for Nurse'}
              </button>
            </div>

            {otpError && <p className="text-red-600 text-sm mb-3">{otpError}</p>}

            {otp.value && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-5">
                <p className="text-sm text-teal-700 font-medium mb-2">
                  Share this OTP with the {otp.targetRole} — it expires at {otp.expiresAt?.toLocaleTimeString()}
                </p>
                <p className="text-5xl font-bold text-teal-800 tracking-widest text-center py-3 font-mono">{otp.value}</p>
                <p className="text-xs text-teal-600 text-center mt-2">Shown only once. Do not share publicly.</p>
              </div>
            )}
          </div>

          {/* Recent Audit Logs */}
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Recent Activity</h2>
            {!data?.recentLogs?.length ? (
              <p className="text-gray-500 text-sm">No activity recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {data.recentLogs.map((log) => (
                  <div key={log._id} className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded mr-2 ${actionColor(log.action)}`}>
                        {actionLabel(log.action)}
                      </span>
                      <span className="text-sm text-gray-600">
                        {typeof log.details === 'string' 
                          ? log.details 
                          : typeof log.details === 'object' && log.details !== null
                          ? JSON.stringify(log.details)
                          : String(log.details || '')}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default HospitalDashboard;
