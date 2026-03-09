import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
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
  const [showQR, setShowQR] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    patientService.getDashboard()
      .then((res) => {
        if (res.success) {
          setData(res.data);
          setNotifications(res.data.recentNotifications || []);
        }
      })
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

  const handleMarkRead = async (id) => {
    try {
      await patientService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setData((prev) => prev ? { ...prev, unreadNotificationCount: Math.max(0, (prev.unreadNotificationCount || 0) - 1) } : prev);
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await patientService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setData((prev) => prev ? { ...prev, unreadNotificationCount: 0 } : prev);
    } catch {
      // silent
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'doctor_access_granted': return '✅';
      case 'doctor_access_revoked': return '🚫';
      case 'record_created': return '📋';
      case 'record_modified': return '✏️';
      case 'doctor_access_request': return '🔑';
      case 'visit_reminder': return '⏰';
      default: return '🔔';
    }
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
              <button onClick={() => setShowQR(!showQR)} className="bg-blue-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-blue-700 transition-colors border-none cursor-pointer">
                {showQR ? 'Hide QR Code' : 'Show QR Code'}
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

            {/* QR Code Display */}
            {showQR && data?.qrToken && (
              <div className="mt-4 p-6 bg-blue-50 border border-blue-200 rounded-lg flex flex-col items-center">
                <p className="text-blue-800 font-semibold mb-3">Patient QR Code</p>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <QRCodeSVG
                    value={`hrms:patient:${data.qrToken}`}
                    size={200}
                    level="H"
                  />
                </div>
                <p className="text-sm text-blue-600 mt-3 text-center max-w-xs">
                  Show this QR code to your doctor. They can scan it to request access to your medical records.
                </p>
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

          {/* Notifications */}
          <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-gray-800 text-2xl font-semibold">
                🔔 Notifications
                {(data?.unreadNotificationCount || 0) > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-red-100 text-red-700">
                    {data.unreadNotificationCount} new
                  </span>
                )}
              </h2>
              {notifications.some((n) => !n.read) && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No notifications yet</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n._id}
                    className={`flex items-start gap-3 p-3 rounded-lg border-l-4 transition-colors ${
                      n.read ? 'border-gray-200 bg-gray-50 opacity-70' : 'border-purple-500 bg-purple-50'
                    }`}
                  >
                    <span className="text-lg mt-0.5">{getNotificationIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${n.read ? 'text-gray-600' : 'text-gray-900'}`}>{n.title}</p>
                      <p className="text-sm text-gray-600">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    {!n.read && (
                      <button
                        onClick={() => handleMarkRead(n._id)}
                        className="text-xs text-purple-600 hover:text-purple-800 font-medium whitespace-nowrap"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

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
