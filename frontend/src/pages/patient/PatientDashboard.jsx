import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { patientService } from '../../services/api';

const PatientDashboard = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
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
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await patientService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setData((prev) => prev ? { ...prev, unreadNotificationCount: 0 } : prev);
    } catch { /* silent */ }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      doctor_access_granted: '✅',
      doctor_access_revoked: '🚫',
      record_created: '📋',
      record_modified: '✏️',
      doctor_access_request: '🔑',
      visit_reminder: '⏰'
    };
    return icons[type] || '🔔';
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

  const StatCard = ({ label, value, icon, gradient }) => (
    <div className={`p-6 rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden relative group hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
      <div className={`absolute top-0 right-0 w-24 h-24 ${gradient} opacity-10 dark:opacity-20 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform`} />
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-2xl mb-4 shadow-sm group-hover:rotate-6 transition-transform">
          {icon}
        </div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{label}</h3>
        <p className="text-3xl font-black text-slate-900 dark:text-white">{value ?? 0}</p>
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Overview">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
           <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="mt-4 text-slate-500 font-medium">Analyzing dashboard data...</p>
        </div>
      ) : (
        <div className="space-y-8 pb-12">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Records" value={data?.recordCount} icon="📂" gradient="bg-blue-500" />
            <StatCard label="Documents" value={data?.selfRecordCount} icon="📄" gradient="bg-indigo-500" />
            <StatCard label="Doctors" value={data?.trustedDoctorCount} icon="👨‍⚕️" gradient="bg-emerald-500" />
            <StatCard label="Reminders" value={data?.upcomingReminders?.length} icon="⏰" gradient="bg-amber-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Profile Card */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-200/50 dark:border-slate-800 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
                  <span className="text-9xl">🩺</span>
                </div>
                <div className="relative z-10">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-4">Welcome back, {user?.name.split(' ')[0]}!</h2>
                  <p className="text-slate-500 dark:text-slate-400 max-w-lg mb-8 leading-relaxed">
                    Your medical history is unified and secure. Access your latest records or generate an OTP to share access with a trusted clinician.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button onClick={() => navigate('/patient/records')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                      Browse Records
                    </button>
                    <button onClick={handleGenerateOTP} disabled={otpLoading} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50">
                      {otpLoading ? 'Generating...' : 'Get Access OTP'}
                    </button>
                    <button onClick={() => setShowQR(!showQR)} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all">
                      {showQR ? 'Hide QR' : 'Show QR'}
                    </button>
                  </div>
                </div>

                {/* OTP & QR Displays */}
                {(otpInfo || showQR) && (
                  <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-8">
                     {otpInfo && (
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/50 animate-fadeInRotate">
                          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-3"> clinician Access OTP</p>
                          <div className="text-4xl font-black text-emerald-600 dark:text-emerald-300 tracking-[0.5em] font-mono mb-2">{otpInfo.otp}</div>
                          <p className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-500">Valid for {otpInfo.expiresInMinutes}m • Shared access only.</p>
                        </div>
                     )}
                     {showQR && (
                        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/50 animate-fadeInRotate flex flex-col items-center">
                           <div className="bg-white p-3 rounded-2xl shadow-sm mb-4">
                              <QRCodeSVG value={`hrms:patient:${data.qrToken}`} size={140} level="H" />
                           </div>
                           <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 text-center leading-relaxed">Scan to request document access instantly.</p>
                        </div>
                     )}
                  </div>
                )}
              </div>

              {/* Recent Records Table */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">Latest Hospital Visits</h3>
                {data?.recentRecords?.length > 0 ? (
                  <div className="overflow-x-auto -mx-8">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                          <th className="py-4 px-8 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date</th>
                          <th className="py-4 px-8 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Hospital</th>
                          <th className="py-4 px-8 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Diagnosis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentRecords.map((r) => (
                          <tr key={r._id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-b dark:border-slate-800 last:border-0 cursor-pointer">
                            <td className="py-5 px-8 text-sm font-bold text-slate-600 dark:text-slate-300">{formatDate(r.visitDate)}</td>
                            <td className="py-5 px-8">
                              <p className="text-sm font-black text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">{r.hospital?.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Dr. {r.doctor?.name}</p>
                            </td>
                            <td className="py-5 px-8 text-sm font-medium text-slate-500 dark:text-slate-400">{r.diagnosis}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 dark:text-slate-600 font-medium italic">No visits recorded yet.</div>
                )}
              </div>
            </div>

            <div className="space-y-8">
              {/* Notifications */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Alerts</h3>
                  {notifications.some(n => !n.read) && (
                    <button onClick={handleMarkAllRead} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-widest">Clear All</button>
                  )}
                </div>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {notifications.length > 0 ? notifications.map((n) => (
                    <div key={n._id} className={`p-4 rounded-2xl border transition-all ${n.read ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800' : 'bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/50 shadow-sm'}`}>
                      <div className="flex gap-3">
                        <span className="text-xl mt-1">{getNotificationIcon(n.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold mb-1 ${n.read ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>{n.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal mb-2">{n.message}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(n.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            {!n.read && <button onClick={() => handleMarkRead(n._id)} className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 hover:scale-105 transition-transform">Mark read</button>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-10 opacity-30 italic text-sm">Quiet for now...</div>
                  )}
                </div>
              </div>

              {/* Activity Log */}
              <div className="bg-indigo-600 dark:bg-indigo-900 p-8 rounded-[2rem] shadow-xl shadow-indigo-500/10 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10"><span className="text-6xl italic">LOG</span></div>
                <h3 className="text-xl font-black mb-6 relative z-10">Live Feed</h3>
                <div className="space-y-6 relative z-10">
                  {data?.recentActivity?.slice(0, 5).map((log) => (
                    <div key={log._id} className="flex gap-4 border-l-2 border-white/20 pl-4 py-1">
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">{actionLabel(log.action)}</p>
                        <p className="text-xs font-semibold leading-relaxed opacity-90">{log.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/patient/activity-logs')} className="w-full mt-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">See full audit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PatientDashboard;
