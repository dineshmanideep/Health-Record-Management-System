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

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : 'Not provided';

  const Row = ({ label, value }) => (
    <div className="flex py-4 border-b border-gray-200">
      <span className="font-semibold text-gray-600 w-52">{label}</span>
      <span className="text-gray-800 flex-1">{value || 'Not provided'}</span>
    </div>
  );

  const InputField = ({ label, value, onChange, type = 'text', placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-purple-500" />
    </div>
  );

  return (
    <DashboardLayout title="My Profile">
      {error && <p className="text-red-600 mb-4 bg-red-50 p-3 rounded-lg">{error}</p>}
      {success && <p className="text-green-600 mb-4 bg-green-50 p-3 rounded-lg">{success}</p>}
      {!profile ? (
        <p className="text-gray-500">Loading profile...</p>
      ) : (
        <>
          {/* ===== PERSONAL INFORMATION ===== */}
          <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-gray-800 text-2xl font-semibold">Personal Information</h2>
              {!editProfile && (
                <button onClick={() => setEditProfile(true)} className="bg-purple-600 text-white px-5 py-2 rounded-md font-medium text-sm hover:bg-purple-700 transition-colors border-none cursor-pointer">
                  Edit Profile
                </button>
              )}
            </div>

            {editProfile ? (
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <InputField label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +91-9876543210" />
                  <InputField label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-purple-500">
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                    <select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-purple-500">
                      <option value="">Select</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button type="submit" disabled={saving}
                    className="bg-green-600 text-white px-6 py-2 rounded-md font-medium text-sm hover:bg-green-700 transition-colors border-none cursor-pointer disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => { setEditProfile(false); syncForms(profile); }}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md font-medium text-sm hover:bg-gray-300 transition-colors border-none cursor-pointer">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <Row label="Patient ID" value={profile.patientId} />
                <Row label="Full Name" value={profile.name} />
                <Row label="Email" value={profile.email} />
                <Row label="Role" value="Patient" />
                <Row label="Phone" value={profile.phone} />
                <Row label="Date of Birth" value={formatDate(profile.dateOfBirth)} />
                <Row label="Gender" value={profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : null} />
                <div className="flex py-4">
                  <span className="font-semibold text-gray-600 w-52">Blood Group</span>
                  <span className="text-gray-800 flex-1">{profile.bloodGroup || 'Not provided'}</span>
                </div>
              </>
            )}
          </div>

          {/* ===== EMERGENCY CONTACT ===== */}
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-gray-800 text-2xl font-semibold">Emergency Contact</h2>
              {!editEmergency && (
                <button onClick={() => setEditEmergency(true)} className="bg-purple-600 text-white px-5 py-2 rounded-md font-medium text-sm hover:bg-purple-700 transition-colors border-none cursor-pointer">
                  {profile.emergencyContact?.name ? 'Edit' : 'Add'} Emergency Contact
                </button>
              )}
            </div>

            {editEmergency ? (
              <form onSubmit={handleEmergencySave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField label="Contact Name" value={ecForm.name} onChange={(e) => setEcForm({ ...ecForm, name: e.target.value })} placeholder="e.g. John Doe" />
                  <InputField label="Relationship" value={ecForm.relationship} onChange={(e) => setEcForm({ ...ecForm, relationship: e.target.value })} placeholder="e.g. Spouse, Parent" />
                  <InputField label="Phone Number" value={ecForm.phone} onChange={(e) => setEcForm({ ...ecForm, phone: e.target.value })} placeholder="e.g. +91-9876543210" />
                </div>
                <div className="flex gap-3 mt-4">
                  <button type="submit" disabled={saving}
                    className="bg-green-600 text-white px-6 py-2 rounded-md font-medium text-sm hover:bg-green-700 transition-colors border-none cursor-pointer disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Contact'}
                  </button>
                  <button type="button" onClick={() => { setEditEmergency(false); syncForms(profile); }}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md font-medium text-sm hover:bg-gray-300 transition-colors border-none cursor-pointer">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <Row label="Contact Name" value={profile.emergencyContact?.name} />
                <Row label="Relationship" value={profile.emergencyContact?.relationship} />
                <div className="flex py-4">
                  <span className="font-semibold text-gray-600 w-52">Phone Number</span>
                  <span className="text-gray-800 flex-1">{profile.emergencyContact?.phone || 'Not provided'}</span>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default PatientProfile;
