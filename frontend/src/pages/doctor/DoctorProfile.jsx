import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { profileService } from '../../services/api';

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
      .catch(() => setError('Failed to load profile'));
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
        setSaveMsg({ type: 'success', text: 'Profile updated successfully!' });
      }
    } catch (err) {
      setSaveMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Doctor Profile">
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {saveMsg.text && !editing && (
        <p className={`mb-4 text-sm font-medium ${saveMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{saveMsg.text}</p>
      )}
      {!profile ? (
        <p className="text-gray-500">Loading profile...</p>
      ) : (
        <>
          <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
            <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Professional Information</h2>

            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Full Name</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Phone</label>
                    <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Specialization</label>
                    <select value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600">
                      <option value="">Select...</option>
                      {['General Medicine', 'Cardiology', 'Dermatology', 'Endocrinology', 'Orthopedics', 'Neurology', 'Pediatrics', 'Pulmonology', 'Ophthalmology', 'ENT', 'Psychiatry', 'Gastroenterology'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Qualification</label>
                    <input type="text" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Experience (years)</label>
                    <input type="number" min="0" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Consultation Fee ($)</label>
                    <input type="number" min="0" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Department</label>
                    <input type="text" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600" />
                  </div>
                </div>
                {saveMsg.text && editing && (
                  <p className={`text-sm font-medium ${saveMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{saveMsg.text}</p>
                )}
                <div className="flex gap-3 mt-4">
                  <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-purple-600 text-white rounded-md font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditing(false)} className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-md font-semibold hover:bg-gray-300 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Full Name</span><span className="text-gray-800 flex-1">Dr. {profile.name || 'N/A'}</span></div>
                <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Email</span><span className="text-gray-800 flex-1">{profile.email || 'N/A'}</span></div>
                <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Role</span><span className="text-gray-800 flex-1">Doctor</span></div>
                <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Specialization</span><span className="text-gray-800 flex-1">{profile.specialization || 'Not provided'}</span></div>
                <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Qualification</span><span className="text-gray-800 flex-1">{profile.qualification || 'Not provided'}</span></div>
                <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">License Number</span><span className="text-gray-800 flex-1">{profile.licenseNumber || 'Not provided'}</span></div>
                <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Experience</span><span className="text-gray-800 flex-1">{profile.experience != null ? `${profile.experience} years` : '0 years'}</span></div>
                <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Department</span><span className="text-gray-800 flex-1">{profile.department || 'Not provided'}</span></div>
                <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Phone</span><span className="text-gray-800 flex-1">{profile.phone || 'Not provided'}</span></div>
                <button onClick={startEdit} className="bg-purple-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-purple-700 transition-colors mt-5 border-none cursor-pointer">Edit Profile</button>
              </>
            )}
          </div>

          {/* <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
            <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Hospital Affiliation</h2>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Hospital</span><span className="text-gray-800 flex-1">{profile.hospitalAffiliation || 'Not affiliated'}</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Department</span><span className="text-gray-800 flex-1">{profile.department || 'Not provided'}</span></div>
            <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Consultation Fee</span><span className="text-gray-800 flex-1">{profile.consultationFee != null ? `$${profile.consultationFee}` : 'Not set'}</span></div>
          </div> */}

          <div className="bg-white p-8 rounded-xl shadow-sm">
            <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Statistics</h2>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Total Patients</span><span className="text-gray-800 flex-1">{profile.patients?.length ?? 0}</span></div>
            {/* <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Rating</span><span className="text-gray-800 flex-1">{profile.rating != null ? `${profile.rating} / 5.0` : '0.0 / 5.0'}</span></div>
            <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Reviews</span><span className="text-gray-800 flex-1">{profile.reviewCount ?? 0}</span></div> */}
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default DoctorProfile;
