import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { profileService } from '../../services/api';

// ── Defined OUTSIDE to avoid remounting on every render ──
const InfoRow = ({ label, value, icon }) => (
  <div className="flex items-center gap-5 py-6 border-b border-slate-100 dark:border-slate-800/50 last:border-0 group">
    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-xl group-hover:scale-110 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-all shadow-sm border border-slate-100 dark:border-slate-800 shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1.5">{label}</p>
      <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest truncate">{value || 'Registry Null'}</p>
    </div>
  </div>
);

const inputCls = "w-full px-6 py-4 rounded-[1.5rem] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all uppercase tracking-widest";

const PatientProfile = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editProfile, setEditProfile] = useState(false);
  const [editEmergency, setEditEmergency] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', dateOfBirth: '', gender: '', bloodGroup: '' });
  const [ecForm, setEcForm] = useState({ name: '', relationship: '', phone: '' });

  useEffect(() => {
    profileService.patient.get()
      .then((res) => { if (res.success) { setProfile(res.data); syncForms(res.data); } })
      .catch(() => setError('Failed to load profile intelligence'));
  }, []);

  const syncForms = (data) => {
    setForm({ name: data.name || '', phone: data.phone || '', dateOfBirth: data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '', gender: data.gender || '', bloodGroup: data.bloodGroup || '' });
    setEcForm({ name: data.emergencyContact?.name || '', relationship: data.emergencyContact?.relationship || '', phone: data.emergencyContact?.phone || '' });
  };

  const handleProfileSave = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      const res = await profileService.patient.update(form);
      if (res.success) { setProfile(res.data); syncForms(res.data); setEditProfile(false); setSuccess('Artifact updated successfully'); setTimeout(() => setSuccess(''), 3000); }
    } catch { setError('Failed to sync artifact data'); }
    setSaving(false);
  };

  const handleEmergencySave = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      const res = await profileService.patient.update({ emergencyContact: ecForm });
      if (res.success) { setProfile(res.data); syncForms(res.data); setEditEmergency(false); setSuccess('Liaison contact updated'); setTimeout(() => setSuccess(''), 3000); }
    } catch { setError('Failed to sync liaison data'); }
    setSaving(false);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'LONG', day: 'numeric' }).toUpperCase() : 'NOT PROVIDED';

  return (
    <DashboardLayout title="Biological Identity">
      <div className="max-w-6xl mx-auto space-y-10 pb-24">
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 p-6 rounded-[2.5rem] border-l-4 border-rose-500 shadow-xl shadow-rose-500/10 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-4 duration-500">
            ⚠️ SYSTEM ERROR: {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 p-6 rounded-[2.5rem] border-l-4 border-emerald-500 shadow-xl shadow-emerald-500/10 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-4 duration-500">
            ✅ PROTOCOL SUCCESS: {success}
          </div>
        )}

        {!profile ? (
          <div className="flex flex-col items-center justify-center py-40 animate-pulse">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-8" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Downloading Biological Artifacts...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-fadeIn">
            {/* Left Column: Artifact Summary */}
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 text-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-emerald-500 to-teal-600" />
                <div className="relative z-10 pt-10">
                  <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-4xl mx-auto mb-6 shadow-2xl border-4 border-white dark:border-slate-900 font-black text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                    {profile.name?.charAt(0)}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase mb-1">{profile.name}</h2>
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 mb-8 uppercase tracking-[0.3em]">
                    Subject Profile // {profile.patientId}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 pb-2">
                    <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 italic">Genotype</p>
                      <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{profile.gender || '??'}</p>
                    </div>
                    <div className="p-5 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-[2rem] border border-emerald-100/50 dark:border-emerald-800/20">
                      <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-1.5 italic">Serum Group</p>
                      <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{profile.bloodGroup || '??'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                <h3 className="text-[10px] font-black text-slate-950 dark:text-white mb-8 uppercase tracking-[0.3em] flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Security Protocols
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Cipher</span>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">AES-256 BIT</span>
                  </div>
                  <div className="flex justify-between items-center p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Identity</span>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Verified ✓</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Detailed Data */}
            <div className="lg:col-span-8 space-y-10">
              {/* Biological Metadata Section */}
              <div className="bg-white dark:bg-slate-900 p-10 sm:p-14 rounded-[4rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Biological Metadata</h2>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-3 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 
                       Core Subject Parameters
                    </p>
                  </div>
                  {!editProfile && (
                    <button onClick={() => setEditProfile(true)} className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 hover:-translate-y-1">
                      Update Artifact
                    </button>
                  )}
                </div>

                {editProfile ? (
                  <form onSubmit={handleProfileSave} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">Subject Identifier</label>
                        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">Communication Link</label>
                        <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91-0000000000" className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">Temporal Origin (DOB)</label>
                        <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">Genotype</label>
                        <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={inputCls}>
                          <option value="">DETECTION PENDING</option>
                          <option value="male">ALPHA / MALE</option>
                          <option value="female">BETA / FEMALE</option>
                          <option value="other">NON-BINARY / OTHER</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">Serum Classification</label>
                        <select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} className={inputCls}>
                          <option value="">SELECT GROUP</option>
                          {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((g) => <option key={g} value={g}>{g} SERUM</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-4 pt-10 border-t border-slate-100 dark:border-slate-800">
                      <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50">
                        {saving ? 'SYNCHRONIZING...' : 'COMMIT CHANGES'}
                      </button>
                      <button type="button" onClick={() => { setEditProfile(false); syncForms(profile); }} className="bg-slate-50 dark:bg-slate-950 text-slate-400 px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-slate-100 dark:border-slate-800">
                        ABORT
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 px-2">
                    <InfoRow label="Access Vector" value={profile.email} icon="📧" />
                    <InfoRow label="Comm Frequency" value={profile.phone} icon="📞" />
                    <InfoRow label="Origin Phase" value={formatDate(profile.dateOfBirth)} icon="🎂" />
                    <InfoRow label="Biological Sex" value={profile.gender ? profile.gender.toUpperCase() : null} icon="🧬" />
                  </div>
                )}
              </div>

              {/* Liaison Node Section */}
              <div className="bg-white dark:bg-slate-900 p-10 sm:p-14 rounded-[4rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Emergency Liaison</h2>
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mt-3 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> 
                       Fail-Safe Communication Node
                    </p>
                  </div>
                  {!editEmergency && (
                    <button onClick={() => setEditEmergency(true)} className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 hover:-translate-y-1">
                      {profile.emergencyContact?.name ? 'Modify Liaison' : 'Initialize Liaison'}
                    </button>
                  )}
                </div>

                {editEmergency ? (
                  <form onSubmit={handleEmergencySave} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">Liaison Name</label>
                        <input type="text" value={ecForm.name} onChange={(e) => setEcForm({ ...ecForm, name: e.target.value })} placeholder="FULL LEGAL NAME" className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">Kinship Vector</label>
                        <input type="text" value={ecForm.relationship} onChange={(e) => setEcForm({ ...ecForm, relationship: e.target.value })} placeholder="E.G. PARENT, SPOUSE" className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">Contact Frequency</label>
                        <input type="text" value={ecForm.phone} onChange={(e) => setEcForm({ ...ecForm, phone: e.target.value })} placeholder="+91-0000000000" className={inputCls} />
                      </div>
                    </div>
                    <div className="flex gap-4 pt-10 border-t border-slate-100 dark:border-slate-800">
                      <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50">
                        {saving ? 'SYNCHRONIZING...' : 'BIND LIAISON'}
                      </button>
                      <button type="button" onClick={() => { setEditEmergency(false); syncForms(profile); }} className="bg-slate-50 dark:bg-slate-950 text-slate-400 px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-slate-100 dark:border-slate-800">
                        ABORT
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 px-2">
                    <InfoRow label="Node Agent" value={profile.emergencyContact?.name} icon="🤝" />
                    <InfoRow label="Artifact Bond" value={profile.emergencyContact?.relationship} icon="🔗" />
                    <InfoRow label="Comms Protocol" value={profile.emergencyContact?.phone} icon="🚨" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PatientProfile;
