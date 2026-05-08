import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingScreen from '../../components/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { patientService } from '../../services/api';

const StatCard = ({ label, value, icon, color }) => (
  <div className="group bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 hover-lift transition-all duration-300 relative overflow-hidden">
    <div className={`absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br ${color} opacity-10 dark:opacity-15 blur-xl rounded-full group-hover:scale-150 transition-transform duration-500`} />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{value ?? 0}</span>
      </div>
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">{label}</p>
    </div>
  </div>
);

const PatientDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
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
      if (res.success) {
        setOtpInfo(res.data);
        toast.success('Access code generated successfully');
      }
    } catch {
      toast.error('Failed to generate access code');
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

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : t({ en: 'N/A', hi: 'उपलब्ध नहीं' });
  
  const actionLabel = (action) => {
    const map = {
      record_created: t({ en: 'Record Created', hi: 'रिकॉर्ड बना' }),
      record_viewed: t({ en: 'Record Viewed', hi: 'रिकॉर्ड देखा गया' }),
      record_modified: t({ en: 'Record Modified', hi: 'रिकॉर्ड बदला गया' }),
      self_record_uploaded: t({ en: 'Document Uploaded', hi: 'दस्तावेज़ अपलोड हुआ' }),
      self_record_deleted: t({ en: 'Document Deleted', hi: 'दस्तावेज़ हटाया गया' }),
      doctor_access_granted: t({ en: 'Doctor Access Granted', hi: 'डॉक्टर एक्सेस मिला' }),
      doctor_access_revoked: t({ en: 'Doctor Access Revoked', hi: 'डॉक्टर एक्सेस हटाया' }),
      doctor_viewed_records: t({ en: 'Doctor Viewed Records', hi: 'डॉक्टर ने रिकॉर्ड देखा' }),
      profile_updated: t({ en: 'Profile Updated', hi: 'प्रोफाइल अपडेट हुई' })
    };
    return map[action] || action;
  };

  return (
    <DashboardLayout title={t({ en: 'Dashboard', hi: 'डैशबोर्ड' })}>
      {loading ? (
        <LoadingScreen message={t({ en: 'Fetching medical profile', hi: 'मेडिकल प्रोफाइल लोड हो रही है' })} />
      ) : (
        <div className="space-y-6 pb-12 stagger-children">
          {/* Welcome Banner */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl relative overflow-hidden shadow-lg dark:shadow-xl border border-slate-200 dark:border-slate-800 animate-fadeIn">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/8 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-500/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-2xl" />
            <div className="relative z-10">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t({ en: 'Welcome back,', hi: 'वापसी पर स्वागत है,' })} {user?.name?.split(' ')[0]}! 👋</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-lg mb-6 leading-relaxed">
                {t({ en: 'Your medical records are unified and secure. View your latest records or generate a code to share access with your doctor.', hi: 'आपके मेडिकल रिकॉर्ड एक जगह और सुरक्षित हैं। नए रिकॉर्ड देखें या डॉक्टर के साथ साझा करने के लिए कोड बनाएं।' })}
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => navigate('/patient/records')} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                  {t({ en: 'View Records', hi: 'रिकॉर्ड देखें' })}
                </button>
                <button onClick={handleGenerateOTP} disabled={otpLoading} className="px-5 py-2.5 bg-slate-100 dark:bg-white/15 hover:bg-slate-200 dark:hover:bg-white/25 text-slate-700 dark:text-white rounded-xl font-semibold text-sm active:scale-95 transition-all disabled:opacity-50 border border-slate-200 dark:border-white/20">
                  {otpLoading ? t({ en: 'Generating...', hi: 'बन रहा है...' }) : t({ en: '🔑 Get Access Code', hi: '🔑 एक्सेस कोड लें' })}
                </button>
                <button onClick={() => setShowQR(!showQR)} className="px-5 py-2.5 bg-slate-100 dark:bg-white/15 hover:bg-slate-200 dark:hover:bg-white/25 text-slate-700 dark:text-white rounded-xl font-semibold text-sm active:scale-95 transition-all border border-slate-200 dark:border-white/20">
                  {showQR ? t({ en: 'Hide QR', hi: 'QR छिपाएं' }) : t({ en: '📱 Show QR', hi: '📱 QR दिखाएं' })}
                </button>
              </div>
            </div>

            {/* OTP & QR Displays */}
            {(otpInfo || showQR) && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/20 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                 {otpInfo && (
                    <div className="bg-slate-50 dark:bg-white/10 backdrop-blur-md p-5 rounded-xl border border-slate-200 dark:border-white/20 animate-fadeIn">
                       <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">{t({ en: 'Doctor Access Code', hi: 'डॉक्टर एक्सेस कोड' })}</p>
                      <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-[0.4em] font-mono mb-1">{otpInfo.otp}</div>
                       <p className="text-[11px] text-slate-400 dark:text-slate-500">{t({ en: 'Valid for', hi: 'मान्य' })} {otpInfo.expiresInMinutes}m · {t({ en: 'Single-use', hi: 'एक बार उपयोग' })}</p>
                    </div>
                 )}
                 {showQR && (
                    <div className="bg-slate-50 dark:bg-white/10 backdrop-blur-md p-5 rounded-xl border border-slate-200 dark:border-white/20 animate-fadeIn flex flex-col items-center">
                       <div className="bg-white p-3 rounded-xl shadow-md mb-3">
                          <QRCodeSVG value={`hrms:patient:${data.qrToken}`} size={120} level="H" />
                       </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">{t({ en: 'Let your doctor scan this code', hi: 'अपने डॉक्टर से यह कोड स्कैन करवाएं' })}</p>
                    </div>
                 )}
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            <StatCard label={t({ en: 'Medical Records', hi: 'मेडिकल रिकॉर्ड' })} value={data?.recordCount} icon="📂" color="from-blue-500 to-cyan-500" />
            <StatCard label={t({ en: 'Self Documents', hi: 'मेरे दस्तावेज़' })} value={data?.selfRecordCount} icon="📄" color="from-teal-500 to-emerald-500" />
            <StatCard label={t({ en: 'Trusted Doctors', hi: 'विश्वसनीय डॉक्टर' })} value={data?.trustedDoctorCount} icon="👨‍⚕️" color="from-emerald-500 to-teal-500" />
            <StatCard label={t({ en: 'Reminders', hi: 'रिमाइंडर' })} value={data?.upcomingReminders?.length} icon="⏰" color="from-amber-500 to-orange-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Records */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 animate-fadeIn" style={{ animationDelay: '0.15s' }}>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-5">{t({ en: 'Recent Visits', hi: 'हाल की विज़िट' })}</h3>
              {data?.recentRecords?.length > 0 ? (
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-800/50">
                        <th className="py-3 px-6 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t({ en: 'Date', hi: 'तारीख' })}</th>
                        <th className="py-3 px-4 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t({ en: 'Hospital', hi: 'अस्पताल' })}</th>
                        <th className="py-3 px-4 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t({ en: 'Diagnosis', hi: 'निदान' })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentRecords.map((r) => (
                        <tr key={r._id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
                          <td className="py-4 px-6 text-sm font-medium text-slate-600 dark:text-slate-300">{formatDate(r.visitDate)}</td>
                          <td className="py-4 px-4">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{r.hospital?.name}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">{t({ en: 'Dr.', hi: 'डॉ.' })} {r.doctor?.name}</p>
                          </td>
                          <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400">{r.diagnosis}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-sm italic">{t({ en: 'No visits recorded yet.', hi: 'अभी कोई विज़िट दर्ज नहीं है।' })}</div>
              )}
            </div>

            {/* Notifications */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{t({ en: 'Notifications', hi: 'सूचनाएं' })}</h3>
                  {notifications.some(n => !n.read) && (
                    <button onClick={handleMarkAllRead} className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">{t({ en: 'Mark all read', hi: 'सभी पढ़े हुए' })}</button>
                  )}
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {notifications.length > 0 ? notifications.map((n) => (
                    <div key={n._id} className={`p-3 rounded-xl border transition-all ${n.read ? 'bg-slate-50/50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800' : 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50'}`}>
                      <div className="flex gap-2.5">
                        <span className="text-base mt-0.5">{getNotificationIcon(n.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold mb-0.5 ${n.read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>{n.title}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal">{n.message}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            {!n.read && <button onClick={() => handleMarkRead(n._id)} className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{t({ en: 'Mark read', hi: 'पढ़ा गया' })}</button>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-sm text-slate-400 italic">{t({ en: 'No notifications', hi: 'कोई सूचना नहीं' })}</div>
                  )}
                </div>
              </div>

              {/* Activity Feed */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden animate-fadeIn" style={{ animationDelay: '0.25s' }}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-500/10 blur-2xl rounded-full" />
                <h3 className="text-base font-bold mb-4 relative z-10 text-slate-900 dark:text-white">{t({ en: 'Recent Activity', hi: 'हाल की गतिविधि' })}</h3>
                <div className="space-y-4 relative z-10">
                  {data?.recentActivity?.slice(0, 4).map((log) => (
                    <div key={log._id} className="flex gap-3 border-l-2 border-slate-200 dark:border-slate-700 pl-3 py-0.5">
                      <div className="flex-1">
                        <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5">{actionLabel(log.action)}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{log.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/patient/activity-logs')} className="w-full mt-5 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700">
                  {t({ en: 'View All Activity →', hi: 'सभी गतिविधि देखें →' })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PatientDashboard;
