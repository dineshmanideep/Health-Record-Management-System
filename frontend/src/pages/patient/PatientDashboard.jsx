import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { patientService } from '../../services/api';

const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otpInfo, setOtpInfo] = useState(null);
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    patientService.getDashboard()
      .then((res) => { if (res.success) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateOTP = async () => {
    setOtpLoading(true);
    try {
      const res = await patientService.generateAccessOTP();
      if (res.success) setOtpInfo(res.data);
    } catch {
      alert('Failed to generate OTP');
    }
    setOtpLoading(false);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';

  const actionLabel = (action) => {
    const map = {
      record_created: 'Record Created',
      record_viewed: 'Record Viewed',
      record_modified: 'Record Modified',
      self_record_uploaded: 'Document Uploaded',
      self_record_deleted: 'Document Deleted',
      doctor_access_granted: 'Doctor Access Granted',
      doctor_access_revoked: 'Doctor Access Revoked',
      doctor_viewed_records: 'Doctor Viewed Records',
      profile_updated: 'Profile Updated'
    };
    return map[action] || action;
  };

  return (
    <DashboardLayout title="Patient Dashboard">
      {loading ? (
        <p className="text-gray-500">Loading dashboard...</p>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Medical Records</h3>
              <p className="text-4xl font-bold text-purple-600">{data?.recordCount || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Self-Uploaded Docs</h3>
              <p className="text-4xl font-bold text-purple-600">{data?.selfRecordCount || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Trusted Doctors</h3>
              <p className="text-4xl font-bold text-purple-600">{data?.trustedDoctorCount || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Upcoming Reminders</h3>
              <p className="text-4xl font-bold text-purple-600">{data?.upcomingReminders?.length || 0}</p>
            </div>
          </div>

          {/* Welcome + Quick Actions */}
          <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
            <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Welcome, {user?.name}!</h2>
            <p className="text-gray-600 leading-relaxed">
              Your centralized health record system is ready. Use the sections below to manage your health data.
            </p>
            <div className="flex gap-4 mt-5 flex-wrap">
              <button onClick={() => navigate('/patient/records')} className="bg-purple-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-purple-700 transition-colors border-none cursor-pointer">
                View Medical Records
              </button>
              <button onClick={handleGenerateOTP} disabled={otpLoading} className="bg-green-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-green-700 transition-colors border-none cursor-pointer disabled:opacity-50">
                {otpLoading ? 'Generating...' : 'Generate Access OTP'}
              </button>
            </div>

            {/* OTP Display */}
            {otpInfo && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-semibold">Your Access OTP</p>
                <p className="text-3xl font-bold text-green-700 tracking-widest mt-1">{otpInfo.otp}</p>
                <p className="text-sm text-green-600 mt-1">Share this with your doctor. Expires in {otpInfo.expiresInMinutes} minutes.</p>
              </div>
            )}
          </div>

          {/* Upcoming Visit Reminders */}
          {data?.upcomingReminders?.length > 0 && (
            <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
              <h2 className="text-gray-800 mb-5 text-2xl font-semibold">📅 Upcoming Visit Reminders</h2>
              <div className="space-y-3">
                {data.upcomingReminders.map((r) => (
                  <div key={r._id} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-800">{r.diagnosis}</p>
                      <p className="text-sm text-gray-600">
                        Dr. {r.doctor?.name} ({r.doctor?.specialization}) — {r.hospital?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-700">{formatDate(r.nextVisitDate)}</p>
                      <p className="text-xs text-gray-500">Next Visit</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Medical Records */}
          {data?.recentRecords?.length > 0 && (
            <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
              <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Recent Medical Records</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                      <th className="py-3 px-4 text-sm font-semibold text-gray-600">Hospital</th>
                      <th className="py-3 px-4 text-sm font-semibold text-gray-600">Doctor</th>
                      <th className="py-3 px-4 text-sm font-semibold text-gray-600">Diagnosis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentRecords.map((r) => (
                      <tr key={r._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{formatDate(r.visitDate)}</td>
                        <td className="py-3 px-4 text-sm">{r.hospital?.name || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm">Dr. {r.doctor?.name || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm">{r.diagnosis}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {data?.recentActivity?.length > 0 && (
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Recent Activity</h2>
              <div className="space-y-3">
                {data.recentActivity.map((log) => (
                  <div key={log._id} className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-700 mr-2">
                        {actionLabel(log.action)}
                      </span>
                      <span className="text-sm text-gray-600">{log.details}</span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default PatientDashboard;
