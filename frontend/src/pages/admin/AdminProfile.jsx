import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { profileService } from '../../services/api';

const InfoRow = ({ label, value }) => (
  <div className="flex items-center py-6 border-b border-slate-100 dark:border-slate-800/50 last:border-0 group">
    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] w-56 shrink-0 italic group-hover:text-emerald-500 transition-colors uppercase tracking-widest">{label}</span>
    <span className="text-sm font-black text-slate-800 dark:text-white flex-1 uppercase tracking-widest">{value || 'Registry Null'}</span>
  </div>
);

const AdminProfile = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    profileService.admin.get()
      .then((res) => { if (res.success) setProfile(res.data); })
      .catch(() => setError('Failed to load administrator artifacts'));
  }, []);

  const permissions = [
    { icon: '👥', label: 'USER_REGISTRY_MGMT' },
    { icon: '⚕️', label: 'DOCTOR_CREDENTIAL_MGMT' },
    { icon: '🏥', label: 'FACILITY_INFRA_MGMT' },
    { icon: '👩‍⚕️', label: 'CLINICIAN_NODE_MGMT' },
    { icon: '📋', label: 'MASTER_RECORD_ACCESS' },
    { icon: '⚙️', label: 'KERNEL_CONFIG' },
    { icon: '📊', label: 'RECURSIVE_ANALYTICS' }
  ];

  return (
    <DashboardLayout title="System Authority Profile">
      <div className="max-w-5xl mx-auto space-y-10 pb-24">
        {error && (
          <div className="p-6 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 rounded-[2.5rem] border-l-4 border-rose-500 shadow-xl shadow-rose-500/10 text-[10px] font-black uppercase tracking-widest">
            ⚠️ KERNEL ERROR: {error}
          </div>
        )}

        {!profile ? (
          <div className="flex flex-col items-center justify-center py-40 animate-pulse">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-8" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Downloading Administrative Artifacts...</p>
          </div>
        ) : (
          <>
            {/* Header Section */}
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl opacity-50" />
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-10 relative z-10">
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-emerald-500/20 shrink-0 border-4 border-white dark:border-slate-800 transition-transform group-hover:rotate-6">
                    {profile.name ? profile.name[0].toUpperCase() : 'A'}
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2 flex items-center justify-center sm:justify-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 
                      Root Administrative Node
                    </p>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{profile.name}</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 italic">Level 0 Access // {profile.department || 'SYSTEM_CORE'}</p>
                  </div>
                </div>
                <div className="text-right">
                   <span className={`px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.3em] border-2 ${
                     profile.isActive === false
                       ? 'bg-rose-50 dark:bg-rose-900/10 text-rose-500 border-rose-500/20'
                       : 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500 border-emerald-500/20 animate-pulse'
                   }`}>
                     {profile.isActive === false ? 'NODE_OFFLINE' : 'NODE_ONLINE'}
                   </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Credentials / Details */}
              <div className="lg:col-span-2 space-y-10">
                <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-200/50 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                   <h3 className="text-[10px] font-black text-slate-900 dark:text-white mb-10 uppercase tracking-[0.3em] flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Authority Credentials
                   </h3>
                   <div className="px-2">
                      <InfoRow label="Access Identifier" value={profile.email} />
                      <InfoRow label="Temporal Status" value={profile.isActive === false ? 'REVOKED' : 'AUTHORIZED'} />
                      <InfoRow label="Auth Department" value={profile.department || 'CORE_ADMIN'} />
                      <InfoRow label="Permission Level" value={profile.accessLevel || 'LVL_0'} />
                      <InfoRow label="Communication Hook" value={profile.phone || 'NO_DIRECT_LINK'} />
                   </div>
                </div>
              </div>

              {/* Secure Capabilities */}
              <div className="space-y-10">
                <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-200/50 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                   <h3 className="text-[10px] font-black text-slate-900 dark:text-white mb-10 uppercase tracking-[0.3em] flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      Authority Capabilities
                   </h3>
                   <div className="space-y-3">
                      {permissions.map((p, i) => (
                        <div key={p.label} className="flex items-center gap-4 px-5 py-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 group/perm border-l-4 border-l-transparent hover:border-l-emerald-500 transition-all">
                           <span className="text-lg group-hover/perm:scale-110 transition-transform grayscale group-hover:grayscale-0">{p.icon}</span>
                           <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{p.label}</span>
                           <span className="ml-auto text-emerald-500 text-[10px] font-black group-hover:animate-bounce">✓</span>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="bg-slate-900 dark:bg-white p-8 rounded-[3rem] shadow-xl text-center group transition-transform hover:-translate-y-2">
                   <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 italic opacity-50">Authorized Personnel Only</p>
                   <p className="text-[10px] font-black text-white dark:text-slate-900 uppercase tracking-[0.2em]">
                   Registry Sync: {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                   </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminProfile;
