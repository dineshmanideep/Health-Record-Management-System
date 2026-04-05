import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { profileService } from '../../services/api';

const InfoRow = ({ label, value }) => (
  <div className="flex items-center py-6 border-b border-slate-100 dark:border-slate-800/50 last:border-0 group">
    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] w-56 shrink-0 italic group-hover:text-emerald-500 transition-colors">{label}</span>
    <span className="text-sm font-black text-slate-800 dark:text-white flex-1 uppercase tracking-widest">{value || 'Registry Null'}</span>
  </div>
);

const inputCls = "w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all";

const NurseProfile = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    profileService.nurse.get()
      .then((res) => { if (res.success) setProfile(res.data); })
      .catch(() => setError('Failed to load clinician credentials'));
  }, []);

  const startEdit = () => {
    setEditForm({
      name: profile.name || '',
      phone: profile.phone || '',
      qualification: profile.qualification || '',
      experience: profile.experience || '',
      department: profile.department || '',
      shift: profile.shift || 'Morning',
      assignedWard: profile.assignedWard || ''
    });
    setEditing(true);
    setSuccessMsg('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await profileService.nurse.update(editForm);
      if (res.success) {
        setProfile(res.data);
        setEditing(false);
        setSuccessMsg('Clinician credentials synchronized');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch {
      setError('Synchronization protocol failure');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Clinician Identity">
      <div className="max-w-5xl mx-auto space-y-10 pb-24">
        {error && (
          <div className="p-6 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 rounded-[2.5rem] border-l-4 border-rose-500 shadow-xl shadow-rose-500/10 text-[10px] font-black uppercase tracking-widest">
            ⚠️ SYSTEM ERROR: {error}
          </div>
        )}
        {successMsg && (
          <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-[2.5rem] border-l-4 border-emerald-500 shadow-xl shadow-emerald-500/10 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-4 duration-500">
            ✅ PROTOCOL SUCCESS: {successMsg}
          </div>
        )}

        {!profile ? (
          <div className="flex flex-col items-center justify-center py-40 animate-pulse">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-8" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Downloading Clinician Artifacts...</p>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-10 mb-12 relative z-10">
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-emerald-500/20 shrink-0 border-4 border-white dark:border-slate-800 transition-transform group-hover:scale-105">
                    {profile.name ? profile.name[0].toUpperCase() : 'N'}
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2 flex items-center justify-center sm:justify-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 
                      Clinician Node // REB#{profile.licenseNumber || 'PENDING'}
                    </p>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{profile.name}</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 italic">{profile.experience || 0} Operation Cycles Completed</p>
                  </div>
                </div>
                {!editing && (
                  <button 
                    onClick={startEdit} 
                    className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all hover:-translate-y-1"
                  >
                    Modify Artifacts
                  </button>
                )}
              </div>

              {editing ? (
                <div className="space-y-10 animate-in fade-in duration-500 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] italic ml-1">Subject Identifier</label>
                      <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className={inputCls} />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] italic ml-1">Comm link frequency</label>
                      <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className={inputCls} />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] italic ml-1">Clinician Credentials</label>
                      <input type="text" value={editForm.qualification} onChange={e => setEditForm({...editForm, qualification: e.target.value})} className={inputCls} />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] italic ml-1">Cycle Count (Years)</label>
                      <input type="number" value={editForm.experience} onChange={e => setEditForm({...editForm, experience: e.target.value})} className={inputCls} />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] italic ml-1">Assigned Division</label>
                      <input type="text" value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})} className={inputCls} />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] italic ml-1">Temporal Shift</label>
                      <select value={editForm.shift} onChange={e => setEditForm({...editForm, shift: e.target.value})} className={inputCls}>
                        <option value="Morning">ALPHA / MORNING</option>
                        <option value="Afternoon">BETA / AFTERNOON</option>
                        <option value="Night">GAMMA / NIGHT</option>
                        <option value="Rotating">DYNAMIC / ROTATING</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-10 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50">
                      {saving ? 'SYNCHRONIZING...' : 'COMMIT CHANGES'}
                    </button>
                    <button onClick={() => setEditing(false)} className="bg-slate-50 dark:bg-slate-950 text-slate-400 px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-slate-100 dark:border-slate-800">
                      ABORT
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 relative z-10">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-950 dark:text-white mb-6 uppercase tracking-[0.3em] flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Professional Artifacts
                    </h3>
                    <div className="px-2">
                       <InfoRow label="Clinician Role" value="AUTHORITY · REGISTERED NURSE" />
                       <InfoRow label="Academic Credits" value={profile.qualification} />
                       <InfoRow label="Registry Identifier" value={profile.licenseNumber} />
                       <InfoRow label="Cycle Count" value={profile.experience != null ? `${profile.experience} YEARS` : '0 YEARS'} />
                    </div>
                  </div>
                  <div className="mt-10 md:mt-0">
                    <h3 className="text-[10px] font-black text-slate-950 dark:text-white mb-6 uppercase tracking-[0.3em] flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Operational Metrics
                    </h3>
                    <div className="px-2">
                       <InfoRow label="Access Vector" value={profile.email} />
                       <InfoRow label="Comm Link" value={profile.phone} />
                       <InfoRow label="Temporal Shift" value={profile.shift || 'MORNING'} />
                       <InfoRow label="Active Subjects" value={`${profile.assignedPatients ?? 0} ASSIGNED`} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800 transition-all text-center">
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 italic opacity-50">Node Registry Lifecycle Status</p>
               <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center justify-center gap-3">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 Last Sync: {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()} // Status: ONLINE
               </p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NurseProfile;
