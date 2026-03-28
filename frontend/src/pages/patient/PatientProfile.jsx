import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { profileService } from '../../services/api';

const PatientProfile = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit modes
  const [editProfile, setEditProfile] = useState(false);
  const [editEmergency, setEditEmergency] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile edit form
  const [form, setForm] = useState({ name: '', phone: '', dateOfBirth: '', gender: '', bloodGroup: '' });
  // Emergency contact edit form
  const [ecForm, setEcForm] = useState({ name: '', relationship: '', phone: '' });

  useEffect(() => {
    profileService.patient.get()
      .then((res) => {
        if (res.success) {
          setProfile(res.data);
          syncForms(res.data);
        }
      })
      .catch(() => setError('Failed to load profile'));
  }, []);

  const syncForms = (data) => {
    setForm({
      name: data.name || '',
      phone: data.phone || '',
      dateOfBirth: data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '',
      gender: data.gender || '',
      bloodGroup: data.bloodGroup || ''
    });
    setEcForm({
      name: data.emergencyContact?.name || '',
      relationship: data.emergencyContact?.relationship || '',
      phone: data.emergencyContact?.phone || ''
    });
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await profileService.patient.update(form);
      if (res.success) {
        setProfile(res.data);
        syncForms(res.data);
        setEditProfile(false);
        setSuccess('Profile updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {
      setError('Failed to update profile');
    }
    setSaving(false);
  };

  const handleEmergencySave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await profileService.patient.update({ emergencyContact: ecForm });
      if (res.success) {
        setProfile(res.data);
        syncForms(res.data);
        setEditEmergency(false);
        setSuccess('Emergency contact updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {
      setError('Failed to update emergency contact');
    }
    setSaving(false);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not provided';

  const InfoRow = ({ label, value, icon }) => (
    <div className="flex items-center gap-6 py-6 border-b border-slate-200/50 dark:border-slate-800 last:border-0 group">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-sm font-black text-slate-800 dark:text-slate-200">{value || 'Not provided'}</p>
      </div>
    </div>
  );

  const FormInput = ({ label, value, onChange, type = 'text', placeholder }) => (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={onChange} 
        placeholder={placeholder}
        className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold transition-all outline-none" 
      />
    </div>
  );

  return (
    <DashboardLayout title="Account Sovereignty">
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        {(error || success) && (
          <div className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest animate-slide-up ${
            error ? 'bg-red-50 dark:bg-red-900/10 text-red-600 border border-red-100 dark:border-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 border border-emerald-100 dark:border-emerald-900/20'
          }`}>
            {error || success}
          </div>
        )}

        {!profile ? (
          <div className="flex flex-col items-center justify-center py-32 animate-pulse">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Synchronizing profile...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Avatar & Quick Info */}
            <div className="lg:col-span-1 space-y-8">
               <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800 text-center relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                     <span className="text-8xl">👤</span>
                  </div>
                  <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-[2.5rem] flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner relative z-10 font-black text-indigo-600 dark:text-indigo-400">
                     {profile.name?.charAt(0)}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight break-words mb-2">{profile.name}</h2>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg inline-block">
                    {profile.role?.toUpperCase()} · {profile.patientId}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3 mt-8">
                     <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-800">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Blood type</p>
                        <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{profile.bloodGroup || '--'}</p>
                     </div>
                     <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-800">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gender</p>
                        <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase">{profile.gender?.slice(0,1) || '--'}</p>
                     </div>
                  </div>
               </div>

               <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight mb-6">Security Metadata</h3>
                  <div className="space-y-4 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                     <div className="flex justify-between">
                        <span>Cluster:</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-black">Main-Net</span>
                     </div>
                     <div className="flex justify-between">
                        <span>Encryption:</span>
                        <span className="text-emerald-500 font-black uppercase tracking-tight">AES-256</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Right Column: Main Forms */}
            <div className="lg:col-span-2 space-y-8">
              {/* Personal Info Section */}
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Identity Parameters</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Core demographic synchronization</p>
                  </div>
                  {!editProfile && (
                    <button 
                      onClick={() => setEditProfile(true)} 
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"
                    >
                      Modify Parameters
                    </button>
                  )}
                </div>

                {editProfile ? (
                  <form onSubmit={handleProfileSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput label="Full Identity Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      <FormInput label="Comms Channel (Phone)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+00-0000000000" />
                      <FormInput label="Biological Inception (DOB)" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Biological Gender</label>
                        <select 
                          value={form.gender} 
                          onChange={(e) => setForm({ ...form, gender: e.target.value })}
                          className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold transition-all outline-none"
                        >
                          <option value="">Undisclosed</option>
                          <option value="male">Staminate (Male)</option>
                          <option value="female">Pistillate (Female)</option>
                          <option value="other">Other Spec</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Serology (Blood Class)</label>
                        <select 
                          value={form.bloodGroup} 
                          onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                          className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold transition-all outline-none"
                        >
                          <option value="">Unknown</option>
                          {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-4 pt-6 border-t dark:border-slate-800">
                      <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 disabled:opacity-50">
                        {saving ? 'Syncing...' : 'Commit Changes'}
                      </button>
                      <button type="button" onClick={() => { setEditProfile(false); syncForms(profile); }} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-8 py-3 rounded-xl font-black text-[10px] uppercase transition-all">
                        Abort
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                    <InfoRow label="Access Principal (Email)" value={profile.email} icon="📧" />
                    <InfoRow label="Comms Vector" value={profile.phone} icon="📞" />
                    <InfoRow label="Biological Inception" value={formatDate(profile.dateOfBirth)} icon="🎂" />
                    <InfoRow label="Gender Spec" value={profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : null} icon="🧬" />
                  </div>
                )}
              </div>

              {/* Emergency Contact Section */}
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Contingency Principal</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Emergency contact authorization</p>
                  </div>
                  {!editEmergency && (
                    <button 
                      onClick={() => setEditEmergency(true)} 
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"
                    >
                      {profile.emergencyContact?.name ? 'Review Protocol' : 'Assign Principal +'}
                    </button>
                  )}
                </div>

                {editEmergency ? (
                  <form onSubmit={handleEmergencySave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormInput label="Principal Name" value={ecForm.name} onChange={(e) => setEcForm({ ...ecForm, name: e.target.value })} placeholder="Full Name" />
                      <FormInput label="Kinship Factor" value={ecForm.relationship} onChange={(e) => setEcForm({ ...ecForm, relationship: e.target.value })} placeholder="Relationship" />
                      <FormInput label="Urgent Comms" value={ecForm.phone} onChange={(e) => setEcForm({ ...ecForm, phone: e.target.value })} placeholder="+00-0000000000" />
                    </div>
                    <div className="flex gap-4 pt-6 border-t dark:border-slate-800">
                      <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 disabled:opacity-50">
                        {saving ? 'Authorizing...' : 'Lock Protocol'}
                      </button>
                      <button type="button" onClick={() => { setEditEmergency(false); syncForms(profile); }} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-8 py-3 rounded-xl font-black text-[10px] uppercase transition-all">
                        Abort
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12">
                    <InfoRow label="Principal Name" value={profile.emergencyContact?.name} icon="🤝" />
                    <InfoRow label="Kinship Factor" value={profile.emergencyContact?.relationship} icon="🔗" />
                    <InfoRow label="Urgent Comms" value={profile.emergencyContact?.phone} icon="🚨" />
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
