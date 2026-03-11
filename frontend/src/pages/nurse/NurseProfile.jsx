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
    <DashboardLayout title="Nurse Profile">
      {error && <p className="text-red-600 mb-4 bg-red-50 p-3 rounded-lg">{error}</p>}
      {successMsg && <p className="text-green-600 mb-4 bg-green-50 p-3 rounded-lg">{successMsg}</p>}
      {!profile ? (
        <p className="text-gray-500">Loading profile...</p>
      ) : (
        <>
          <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-gray-800 text-2xl font-semibold">Professional Information</h2>
              {!editing && (
                <button onClick={startEdit} className="bg-purple-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-purple-700 transition-colors border-none cursor-pointer">Edit Profile</button>
              )}
            </div>

            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Full Name</label><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600" /></div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Phone</label><input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600" /></div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Qualification</label><input type="text" value={editForm.qualification} onChange={e => setEditForm({...editForm, qualification: e.target.value})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600" /></div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Experience (years)</label><input type="number" value={editForm.experience} onChange={e => setEditForm({...editForm, experience: e.target.value})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600" /></div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Department</label><input type="text" value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600" /></div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Shift</label>
                    <select value={editForm.shift} onChange={e => setEditForm({...editForm, shift: e.target.value})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600">
                      <option value="Morning">Morning</option><option value="Afternoon">Afternoon</option><option value="Night">Night</option><option value="Rotating">Rotating</option>
                    </select>
                  </div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Assigned Ward</label><input type="text" value={editForm.assignedWard} onChange={e => setEditForm({...editForm, assignedWard: e.target.value})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600" /></div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={handleSave} disabled={saving} className="bg-purple-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
                  <button onClick={() => setEditing(false)} className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-md font-semibold hover:bg-gray-300 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Full Name</span><span className="text-gray-800 flex-1">{profile.name || 'N/A'}</span></div>
                <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Email</span><span className="text-gray-800 flex-1">{profile.email || 'N/A'}</span></div>
                <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Role</span><span className="text-gray-800 flex-1">Nurse</span></div>
                <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Qualification</span><span className="text-gray-800 flex-1">{profile.qualification || 'Not provided'}</span></div>
                <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">License Number</span><span className="text-gray-800 flex-1">{profile.licenseNumber || 'Not provided'}</span></div>
                <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Experience</span><span className="text-gray-800 flex-1">{profile.experience != null ? `${profile.experience} years` : '0 years'}</span></div>
                <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Phone</span><span className="text-gray-800 flex-1">{profile.phone || 'Not provided'}</span></div>
              </>
            )}
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
            <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Work Details</h2>
            {/* <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Hospital</span><span className="text-gray-800 flex-1">{profile.hospitalAffiliation || 'Not affiliated'}</span></div> */}
            {/* <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Department</span><span className="text-gray-800 flex-1">{profile.department || 'Not provided'}</span></div> */}
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Shift</span><span className="text-gray-800 flex-1">{profile.shift || 'Morning'}</span></div>
            {/* <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Assigned Ward</span><span className="text-gray-800 flex-1">{profile.assignedWard || 'Not assigned'}</span></div> */}
            {/* <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Supervising Doctor</span><span className="text-gray-800 flex-1">{profile.supervisingDoctor || 'Not assigned'}</span></div> */}
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm">
            <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Statistics</h2>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Assigned Patients</span><span className="text-gray-800 flex-1">{profile.assignedPatients ?? 0}</span></div>
            {/* <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Rating</span><span className="text-gray-800 flex-1">{profile.rating != null ? `${profile.rating} / 5.0` : '0.0 / 5.0'}</span></div> */}
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default NurseProfile;
