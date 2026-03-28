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
    if (action.includes('joined')) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
    if (action.includes('revoked')) return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
    if (action.includes('assigned')) return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
  };

  const KPICard = ({ label, value, icon, color }) => (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 group hover:shadow-xl transition-all overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform pointer-events-none">
        <span className="text-8xl">{icon}</span>
      </div>
      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 relative z-10">{label}</p>
      <p className={`text-4xl font-black ${color} relative z-10`}>{value}</p>
    </div>
  );

  return (
    <DashboardLayout title="Facility Control">
      <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 sm:px-0">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 animate-pulse">
            <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Accessing facility metrics...</p>
          </div>
        ) : (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard label="Staff Physicians" value={data?.doctorCount || 0} icon="👨‍⚕️" color="text-indigo-600 dark:text-indigo-400" />
              <KPICard label="Clinical Nurses" value={data?.nurseCount || 0} icon="👩‍⚕️" color="text-teal-600 dark:text-teal-400" />
              <KPICard label="Available Capacity" value={data?.availableBeds ?? 0} icon="🛏️" color="text-emerald-500" />
              <KPICard label="Total Node Capacity" value={data?.totalBeds ?? 0} icon="🏢" color="text-slate-400" />
            </div>

            {/* Quick Actions Cluster */}
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
               <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">Facility Navigation</h2>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Link to="/hospital/tests" className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] hover:bg-slate-900 dark:hover:bg-white group transition-all">
                     <span className="text-3xl group-hover:scale-110 transition-transform">🧪</span>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-400">Manage</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-white dark:group-hover:text-slate-900">Diagnostic Types</p>
                     </div>
                  </Link>
                  <Link to="/hospital/test-assignments" className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] hover:bg-slate-900 dark:hover:bg-white group transition-all">
                     <span className="text-3xl group-hover:scale-110 transition-transform">📋</span>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-400">Queue</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-white dark:group-hover:text-slate-900">Test Assignments</p>
                     </div>
                  </Link>
                  <Link to="/hospital/doctors" className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] hover:bg-slate-900 dark:hover:bg-white group transition-all">
                     <span className="text-3xl group-hover:scale-110 transition-transform">👨‍⚕️</span>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-400">Directory</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-white dark:group-hover:text-slate-900">Medical Staff</p>
                     </div>
                  </Link>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* OTP Generation Cluster */}
               <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Personnel Onboarding</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 leading-relaxed">Generate ephemeral synchronization codes for clinical staff integration</p>
                  
                  <div className="flex gap-4 mb-8">
                     <button onClick={() => generateOTP('doctor')} disabled={generating} className="flex-1 px-5 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50">
                       {generating && otp.targetRole === 'doctor' ? 'Generating...' : 'Doctor OTP'}
                     </button>
                     <button onClick={() => generateOTP('nurse')} disabled={generating} className="flex-1 px-5 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50">
                       {generating && otp.targetRole === 'nurse' ? 'Generating...' : 'Nurse OTP'}
                     </button>
                  </div>

                  {otpError && <p className="text-red-600 text-[10px] font-black uppercase tracking-widest text-center mb-6">{otpError}</p>}

                  {otp.value && (
                    <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-900/30 rounded-[2.5rem] p-8 animate-fade-in text-center">
                      <p className="text-[10px] font-black text-teal-700 dark:text-teal-400 uppercase tracking-widest mb-4">
                        Subject Identity: {otp.targetRole} · Expires: {otp.expiresAt?.toLocaleTimeString()}
                      </p>
                      <p className="text-6xl font-black text-teal-800 dark:text-teal-300 tracking-[0.2em] mb-4 font-mono">{otp.value}</p>
                      <p className="text-[9px] font-bold text-teal-600/60 uppercase">Share this code with the principal immediately</p>
                    </div>
                  )}
               </div>

               {/* Activity Log Cluster */}
               <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800 overflow-hidden flex flex-col">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-8">Clinical Telemetry</h2>
                  {!data?.recentLogs?.length ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                       <span className="text-5xl mb-6 opacity-20">📜</span>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No activity registered in the current cycle</p>
                    </div>
                  ) : (
                    <div className="space-y-4 flex-1">
                      {data.recentLogs.slice(0, 5).map((log) => (
                        <div key={log._id} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-2xl group transition-all">
                          <div className="flex-1 min-w-0">
                            <span className={`inline-block px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg mb-2 ${actionColor(log.action)}`}>
                              {actionLabel(log.action)}
                            </span>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate pr-4">
                              {typeof log.details === 'string' ? log.details : 'System configuration update'}
                            </p>
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase whitespace-nowrap">{new Date(log.createdAt).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link to="/hospital/audit-logs" className="mt-8 text-center text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Inspect Full Audit Trail →</Link>
               </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default HospitalDashboard;
