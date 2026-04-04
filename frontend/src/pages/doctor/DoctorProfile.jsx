import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { profileService } from '../../services/api';

const SPECIALIZATIONS = [
  'General Medicine', 'Cardiology', 'Dermatology', 'Endocrinology',
  'Orthopedics', 'Neurology', 'Pediatrics', 'Pulmonology',
  'Ophthalmology', 'ENT', 'Psychiatry', 'Gastroenterology'
];

const InfoRow = ({ label, value }) => (
  <div className="flex items-center py-6 border-b border-slate-100 dark:border-slate-800/50 last:border-0 group">
    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] w-56 shrink-0 italic group-hover:text-emerald-500 transition-colors">{label}</span>
    <span className="text-sm font-black text-slate-800 dark:text-white flex-1 uppercase tracking-widest">{value || 'Registry Null'}</span>
  </div>
);

const FormField = ({ label, children }) => (
  <div className="space-y-3">
    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] italic ml-1">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all uppercase tracking-widest";

const DoctorProfile = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    profileService.doctor.get()
      .then((res) => { if (res.success) setProfile(res.data); })
      .catch(() => setError('Failed to load credentials from registry'));
  }, []);

  const startEdit = () => {
    setForm({
      name: profile.name || '',
      phone: profile.phone || '',
      specialization: profile.specialization || '',
      qualification: profile.qualification || '',
      experience: profile.experience ?? '',
      consultationFee: profile.consultationFee ?? '',
      department: profile.department || ''
    });
    setEditing(true);
    setSaveMsg({ type: '', text: '' });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg({ type: '', text: '' });
    try {
      const res = await profileService.doctor.update(form);
      if (res.success) {
        setProfile(res.data);
        setEditing(false);
        setSaveMsg({ type: 'success', text: 'Credentials synchronized successfully' });
        setTimeout(() => setSaveMsg({ type: '', text: '' }), 3000);
      }
    } catch (err) {
      setSaveMsg({ type: 'error', text: err?.response?.data?.message || 'Synchronization protocol failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Physician Identity">
      <div className="space-y-10 pb-24 max-w-5xl">
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 p-6 rounded-[2.5rem] border-l-4 border-rose-500 shadow-xl shadow-rose-500/10 text-[10px] font-black uppercase tracking-widest">
            ⚠️ SYSTEM ERROR: {error}
          </div>
        )}
        {saveMsg.text && !editing && (
          <div className={`p-6 rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-4 duration-500 border-l-4 flex items-center gap-4 ${
            saveMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-emerald-500 shadow-emerald-500/10 shadow-xl'
              : 'bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 border-rose-500 shadow-rose-500/10 shadow-xl'
          }`}>
            {saveMsg.type === 'success' ? '✅' : '⚠️'} {saveMsg.text}
          </div>
        )}

        {!profile ? (
          <div className="flex flex-col items-center justify-center py-40 animate-pulse">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-8" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Downloading Physician Artifacts...</p>
          </div>
        ) : (
          <>
            {/* Physician Header */}
            <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] border border-slate-200/50 dark:border-slate-800 p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl group-hover:bg-emerald-500/15 transition-colors" />
              <div className="flex flex-col md:flex-row md:items-center gap-10 relative z-10">
                <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-emerald-500/20 shrink-0 border-4 border-white dark:border-slate-800 transition-transform group-hover:scale-105">
                  {profile.name?.[0]?.toUpperCase() || 'D'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 
                    Physician Node // {profile.licenseNumber}
                  </p>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Dr. {profile.name}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                      {profile.specialization || 'General Protocol'}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                       <span className="text-lg opacity-50">📧</span> {profile.email}
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 shrink-0">
                  <div className="text-center px-6 py-4 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                    <p className="text-2xl font-black text-slate-900 dark:text-white tracking-widest">{profile.patients?.length ?? 0}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 italic">Subjects</p>
                  </div>
                  <div className="text-center px-6 py-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-[2rem] border border-emerald-100/50 dark:border-emerald-800/20">
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-widest">{profile.experience ?? 0}</p>
                    <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mt-1 italic">Cycles</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Credential Matrix */}
            <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] border border-slate-200/50 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Credential Matrix</h3>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-2 italic flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Verified Physician Artifacts
                  </p>
                </div>
                {!editing && (
                  <button
                    onClick={startEdit}
                    className="px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 hover:-translate-y-1"
                  >
                    Modify Artifacts
                  </button>
                )}
              </div>

              {editing ? (
                <div className="p-10 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField label="Subject Identifier">
                      <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
                    </FormField>
                    <FormField label="Comm Link frequency">
                      <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
                    </FormField>
                    <FormField label="Protocol Specialization">
                      <select value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className={inputCls}>
                        <option value="">SELECT VECTOR...</option>
                        {SPECIALIZATIONS.map((s) => (
                          <option key={s} value={s}>{s.toUpperCase()}</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Academic Credentials">
                      <input type="text" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} className={inputCls} />
                    </FormField>
                    <FormField label="Experience Cycles">
                      <input type="number" min="0" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} className={inputCls} />
                    </FormField>
                    <FormField label="Consultation Energy ($)">
                      <input type="number" min="0" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} className={inputCls} />
                    </FormField>
                    <FormField label="Deployment Division">
                      <input type="text" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={inputCls} />
                    </FormField>
                  </div>

                  <div className="flex gap-4 pt-10 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {saving ? 'SYNCHRONIZING...' : 'COMMIT CHANGES'}
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="bg-slate-50 dark:bg-slate-950 text-slate-400 px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-slate-100 dark:border-slate-800"
                    >
                      ABORT
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-10 pb-10">
                  <InfoRow label="Physician Artifact" value={`DR. ${profile.name}`} />
                  <InfoRow label="Access Vector" value={profile.email} />
                  <InfoRow label="Protocol Role" value="AUTHORITY · PHYSICIAN" />
                  <InfoRow label="Medical Division" value={profile.specialization} />
                  <InfoRow label="Academic Degree" value={profile.qualification} />
                  <InfoRow label="License Identifier" value={profile.licenseNumber} />
                  <InfoRow label="Operation Cycles" value={profile.experience != null ? `${profile.experience} YEARS` : '0 YEARS'} />
                  <InfoRow label="Deployment Division" value={profile.department} />
                  <InfoRow label="Comm Frequency" value={profile.phone} />
                  {profile.consultationFee != null && (
                    <InfoRow label="Service Energy" value={`$${profile.consultationFee} PER CYCLE`} />
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DoctorProfile;
