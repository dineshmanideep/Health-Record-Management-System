import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { profileService } from '../../services/api';

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
      .catch(() => setError('Failed to load profile'));
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
        setSuccessMsg('Profile updated successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Profile">
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center animate-pulse">
          ⚠️ {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center animate-in slide-in-from-top-2">
          ✅ {successMsg}
        </div>
      )}
      {!profile ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
           <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="mt-4 text-slate-500 font-medium tracking-widest uppercase text-[10px]">Loading profile...</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 mb-6 transition-all">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-[2rem] bg-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-indigo-500/20">
                  {profile.name ? profile.name[0].toUpperCase() : 'N'}
                </div>
                <div>
                   <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{profile.name?.toUpperCase() || 'NURSE PROFILE'}</h2>
                   <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1 tracking-tighter">Nurse · {profile.experience || 0} years experience</p>
                </div>
              </div>
              {!editing && (
                <button 
                  onClick={startEdit} 
                  className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all hover:bg-slate-900 dark:hover:bg-white dark:hover:text-slate-900"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                    <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Phone</label>
                    <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Qualification</label>
                    <input type="text" value={editForm.qualification} onChange={e => setEditForm({...editForm, qualification: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Experience (Years)</label>
                    <input type="number" value={editForm.experience} onChange={e => setEditForm({...editForm, experience: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Department</label>
                    <input type="text" value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Shift</label>
                    <select value={editForm.shift} onChange={e => setEditForm({...editForm, shift: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none">
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Night">Night</option>
                      <option value="Rotating">Rotating</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t dark:border-slate-800">
                  <button onClick={handleSave} disabled={saving} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 hover:bg-slate-900 dark:hover:bg-white dark:hover:text-slate-900">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditing(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-8">Professional Info</h3>
                  {[
                    { label: 'Role', value: 'Registered Nurse' },
                    { label: 'Qualification', value: profile.qualification || 'Not provided' },
                    { label: 'License Number', value: profile.licenseNumber || 'Not provided' },
                    { label: 'Experience', value: profile.experience != null ? `${profile.experience} years` : '0 years' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{item.label}</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-8">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-8">Contact & Work Info</h3>
                  {[
                    { label: 'Registered Email', value: profile.email || 'N/A' },
                    { label: 'Phone', value: profile.phone || 'N/A' },
                    { label: 'Shift', value: profile.shift || 'Morning' },
                    { label: 'Assigned Patients', value: `${profile.assignedPatients ?? 0}` },
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{item.label}</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 transition-all text-center">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 opacity-50">Profile Status</p>
             <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 italic">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default NurseProfile;
