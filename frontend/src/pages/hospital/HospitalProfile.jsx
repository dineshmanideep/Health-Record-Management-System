import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { profileService } from '../../services/api';

const HospitalProfile = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editAddr, setEditAddr] = useState(false);
  const [form, setForm] = useState({});
  const [addrForm, setAddrForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    profileService.hospital.get()
      .then((res) => { if (res.success) setProfile(res.data); })
      .catch(() => setError('Failed to load profile'));
  }, []);

  const startEdit = () => {
    setForm({
      name: profile.name || '',
      phone: profile.phone || '',
      website: profile.website || '',
      hospitalType: profile.hospitalType || '',
      establishedYear: profile.establishedYear || '',
      totalBeds: profile.totalBeds || 0,
      emergencyServices: profile.emergencyServices ?? true,
      ambulanceService: profile.ambulanceService ?? false
    });
    setEditing(true);
    setSuccess('');
  };

  const startEditAddr = () => {
    setAddrForm({
      street: profile.address?.street || '',
      city: profile.address?.city || '',
      state: profile.address?.state || '',
      zipCode: profile.address?.zipCode || '',
      country: profile.address?.country || ''
    });
    setEditAddr(true);
    setSuccess('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await profileService.hospital.update(form);
      if (res.success) { setProfile(res.data); setEditing(false); setSuccess('Profile updated successfully'); }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddr = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await profileService.hospital.update({ address: addrForm });
      if (res.success) { setProfile(res.data); setEditAddr(false); setSuccess('Address updated successfully'); }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update address');
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, value }) => (
    <div className="flex py-4 border-b border-gray-200">
      <span className="font-semibold text-gray-600 w-52">{label}</span>
      <span className="text-gray-800 flex-1">{value ?? 'Not provided'}</span>
    </div>
  );

  const Input = ({ label, name, value, onChange, type = 'text' }) => (
    <div className="flex items-center py-3 border-b border-gray-200">
      <label className="font-semibold text-gray-600 w-52">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(name, e.target.value)}
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
    </div>
  );

  const handleFormChange = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  const handleAddrChange = (name, value) => setAddrForm((prev) => ({ ...prev, [name]: value }));

  return (
    <DashboardLayout title="Hospital Profile">
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-4">{success}</div>}
      {!profile ? (
        <p className="text-gray-500">Loading profile...</p>
      ) : (
        <>
          {/* Hospital Information */}
          <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-gray-800 text-2xl font-semibold">Hospital Information</h2>
              {!editing && (
                <button onClick={startEdit} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
                  Edit
                </button>
              )}
            </div>
            {editing ? (
              <>
                <Input label="Hospital Name" name="name" value={form.name} onChange={handleFormChange} />
                <Input label="Phone" name="phone" value={form.phone} onChange={handleFormChange} />
                <Input label="Website" name="website" value={form.website} onChange={handleFormChange} />
                <div className="flex items-center py-3 border-b border-gray-200">
                  <label className="font-semibold text-gray-600 w-52">Type</label>
                  <select value={form.hospitalType} onChange={(e) => handleFormChange('hospitalType', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">Select type</option>
                    <option value="Government">Government</option>
                    <option value="Private">Private</option>
                    <option value="Semi-Government">Semi-Government</option>
                  </select>
                </div>
                <Input label="Established Year" name="establishedYear" value={form.establishedYear} onChange={handleFormChange} type="number" />
                <Input label="Total Beds" name="totalBeds" value={form.totalBeds} onChange={handleFormChange} type="number" />
                <div className="flex items-center py-3 border-b border-gray-200">
                  <span className="font-semibold text-gray-600 w-52">Emergency Services</span>
                  <input type="checkbox" checked={form.emergencyServices} onChange={(e) => handleFormChange('emergencyServices', e.target.checked)}
                    className="w-5 h-5 text-teal-600 rounded" />
                </div>
                <div className="flex items-center py-3 border-b border-gray-200">
                  <span className="font-semibold text-gray-600 w-52">Ambulance Service</span>
                  <input type="checkbox" checked={form.ambulanceService} onChange={(e) => handleFormChange('ambulanceService', e.target.checked)}
                    className="w-5 h-5 text-teal-600 rounded" />
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={handleSave} disabled={saving} className="bg-teal-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditing(false)} className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-md font-semibold hover:bg-gray-300 transition-colors">
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <Field label="Hospital Name" value={profile.name} />
                <Field label="Email" value={profile.email} />
                <Field label="Registration Number" value={profile.registrationNumber} />
                <Field label="Type" value={profile.hospitalType} />
                <Field label="Phone" value={profile.phone} />
                <Field label="Website" value={profile.website} />
                <Field label="Established Year" value={profile.establishedYear} />
              </>
            )}
          </div>

          {/* Address */}
          <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-gray-800 text-2xl font-semibold">Address</h2>
              {!editAddr && (
                <button onClick={startEditAddr} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
                  Edit
                </button>
              )}
            </div>
            {editAddr ? (
              <>
                <Input label="Street" name="street" value={addrForm.street} onChange={handleAddrChange} />
                <Input label="City" name="city" value={addrForm.city} onChange={handleAddrChange} />
                <Input label="State" name="state" value={addrForm.state} onChange={handleAddrChange} />
                <Input label="ZIP Code" name="zipCode" value={addrForm.zipCode} onChange={handleAddrChange} />
                <Input label="Country" name="country" value={addrForm.country} onChange={handleAddrChange} />
                <div className="flex gap-3 mt-5">
                  <button onClick={handleSaveAddr} disabled={saving} className="bg-teal-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Address'}
                  </button>
                  <button onClick={() => setEditAddr(false)} className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-md font-semibold hover:bg-gray-300 transition-colors">
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <Field label="Street" value={profile.address?.street} />
                <Field label="City" value={profile.address?.city} />
                <Field label="State" value={profile.address?.state} />
                <Field label="ZIP Code" value={profile.address?.zipCode} />
                <Field label="Country" value={profile.address?.country} />
              </>
            )}
          </div>

          {/* Facilities */}
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Facilities & Services</h2>
            <Field label="Total Beds" value={profile.totalBeds ?? 0} />
            <Field label="Available Beds" value={profile.availableBeds ?? 0} />
            <Field label="Emergency Services" value={profile.emergencyServices ? 'Yes' : 'No'} />
            <Field label="Ambulance Service" value={profile.ambulanceService ? 'Yes' : 'No'} />
            <Field label="Rating" value={profile.rating != null ? `${profile.rating} / 5.0` : '0.0 / 5.0'} />
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default HospitalProfile;
