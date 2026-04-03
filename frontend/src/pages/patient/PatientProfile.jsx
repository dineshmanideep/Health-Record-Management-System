import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { profileService } from '../../services/api';

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
      .catch(() => setError('Failed to load profile'));
  }, []);

  const syncForms = (data) => {
    setForm({ name: data.name || '', phone: data.phone || '', dateOfBirth: data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '', gender: data.gender || '', bloodGroup: data.bloodGroup || '' });
    setEcForm({ name: data.emergencyContact?.name || '', relationship: data.emergencyContact?.relationship || '', phone: data.emergencyContact?.phone || '' });
  };

  const handleProfileSave = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      const res = await profileService.patient.update(form);
      if (res.success) { setProfile(res.data); syncForms(res.data); setEditProfile(false); setSuccess('Profile updated!'); setTimeout(() => setSuccess(''), 3000); }
    } catch { setError('Failed to update profile'); }
    setSaving(false);
  };

  const handleEmergencySave = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      const res = await profileService.patient.update({ emergencyContact: ecForm });
      if (res.success) { setProfile(res.data); syncForms(res.data); setEditEmergency(false); setSuccess('Emergency contact updated!'); setTimeout(() => setSuccess(''), 3000); }
    } catch { setError('Failed to update emergency contact'); }
    setSaving(false);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not provided';

  const InfoRow = ({ label, value, icon }) => (
    <div className="flex items-center gap-4 py-4 border-b border-slate-100 dark:border-slate-800/50 last:border-0 group">
      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{value || 'Not provided'}</p>
      </div>
    </div>
  );

  const FormInput = ({ label, value, onChange, type = 'text', placeholder }) => (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all" />
    </div>
  );

  return (
    <DashboardLayout title="My Profile">
      <div className="max-w-5xl mx-auto space-y-6 pb-16">
        {(error || success) && (
          <div className={`p-3.5 rounded-xl text-sm font-medium animate-fadeIn flex items-center gap-2 ${
            error ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
          }`}>
            <span>{error ? '⚠️' : '✅'}</span> {error || success}
          </div>
        )}

        {!profile ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-400 font-medium">Loading profile...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            {/* Left Column: Avatar & Quick Info */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-br from-indigo-500 to-purple-600" />
                <div className="relative z-10 pt-6">
                  <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-xl border-4 border-white dark:border-slate-900 font-bold text-indigo-600 dark:text-indigo-400">
                    {profile.name?.charAt(0)}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-1">{profile.name}</h2>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-4">
                    Patient · {profile.patientId}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Blood Type</p>
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{profile.bloodGroup || '--'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Gender</p>
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 capitalize">{profile.gender || '--'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Security Info</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <span className="text-slate-400 font-medium">Encryption</span>
                    <span className="text-emerald-500 font-bold">AES-256 🔒</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <span className="text-slate-400 font-medium">Status</span>
                    <span className="text-emerald-500 font-bold">Active ✅</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Main Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Info Section */}
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Personal Information</h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Your basic profile details</p>
                  </div>
                  {!editProfile && (
                    <button onClick={() => setEditProfile(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95">
                      Edit Profile
                    </button>
                  )}
                </div>

                {editProfile ? (
                  <form onSubmit={handleProfileSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      <FormInput label="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91-0000000000" />
                      <FormInput label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Gender</label>
                        <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all">
                          <option value="">Select</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Blood Group</label>
                        <select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all">
                          <option value="">Select</option>
                          {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button type="button" onClick={() => { setEditProfile(false); syncForms(profile); }} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-2.5 rounded-xl text-xs font-semibold transition-all">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <InfoRow label="Email" value={profile.email} icon="📧" />
                    <InfoRow label="Phone" value={profile.phone} icon="📞" />
                    <InfoRow label="Date of Birth" value={formatDate(profile.dateOfBirth)} icon="🎂" />
                    <InfoRow label="Gender" value={profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : null} icon="🧬" />
                  </div>
                )}
              </div>

              {/* Emergency Contact Section */}
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Emergency Contact</h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Person to contact in case of emergency</p>
                  </div>
                  {!editEmergency && (
                    <button onClick={() => setEditEmergency(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95">
                      {profile.emergencyContact?.name ? 'Edit Contact' : 'Add Contact'}
                    </button>
                  )}
                </div>

                {editEmergency ? (
                  <form onSubmit={handleEmergencySave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormInput label="Contact Name" value={ecForm.name} onChange={(e) => setEcForm({ ...ecForm, name: e.target.value })} placeholder="Full Name" />
                      <FormInput label="Relationship" value={ecForm.relationship} onChange={(e) => setEcForm({ ...ecForm, relationship: e.target.value })} placeholder="e.g. Parent, Spouse" />
                      <FormInput label="Phone Number" value={ecForm.phone} onChange={(e) => setEcForm({ ...ecForm, phone: e.target.value })} placeholder="+91-0000000000" />
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save Contact'}
                      </button>
                      <button type="button" onClick={() => { setEditEmergency(false); syncForms(profile); }} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-2.5 rounded-xl text-xs font-semibold transition-all">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8">
                    <InfoRow label="Name" value={profile.emergencyContact?.name} icon="🤝" />
                    <InfoRow label="Relationship" value={profile.emergencyContact?.relationship} icon="🔗" />
                    <InfoRow label="Phone" value={profile.emergencyContact?.phone} icon="🚨" />
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
