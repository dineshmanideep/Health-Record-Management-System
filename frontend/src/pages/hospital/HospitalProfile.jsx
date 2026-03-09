import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { profileService } from '../../services/api';

const HospitalProfile = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    profileService.hospital.get()
      .then((res) => { if (res.success) setProfile(res.data); })
      .catch(() => setError('Failed to load profile'));
  }, []);

  return (
    <DashboardLayout title="Hospital Profile">
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {!profile ? (
        <p className="text-gray-500">Loading profile...</p>
      ) : (
        <>
          <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
            <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Hospital Information</h2>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Hospital Name</span><span className="text-gray-800 flex-1">{profile.name || 'N/A'}</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Email</span><span className="text-gray-800 flex-1">{profile.email || 'N/A'}</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Role</span><span className="text-gray-800 flex-1">Hospital</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Registration Number</span><span className="text-gray-800 flex-1">{profile.registrationNumber || 'Not provided'}</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Type</span><span className="text-gray-800 flex-1">{profile.hospitalType || 'Not specified'}</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Phone</span><span className="text-gray-800 flex-1">{profile.phone || 'Not provided'}</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Website</span><span className="text-gray-800 flex-1">{profile.website || 'Not provided'}</span></div>
            <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Established Year</span><span className="text-gray-800 flex-1">{profile.establishedYear || 'Not provided'}</span></div>
            <button className="bg-teal-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-teal-700 transition-colors mt-5 border-none cursor-pointer">Edit Profile</button>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
            <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Address</h2>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Street</span><span className="text-gray-800 flex-1">{profile.address?.street || 'Not provided'}</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">City</span><span className="text-gray-800 flex-1">{profile.address?.city || 'Not provided'}</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">State</span><span className="text-gray-800 flex-1">{profile.address?.state || 'Not provided'}</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">ZIP Code</span><span className="text-gray-800 flex-1">{profile.address?.zipCode || 'Not provided'}</span></div>
            <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Country</span><span className="text-gray-800 flex-1">{profile.address?.country || 'Not provided'}</span></div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm">
            <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Facilities & Services</h2>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Total Beds</span><span className="text-gray-800 flex-1">{profile.totalBeds ?? 0}</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Available Beds</span><span className="text-gray-800 flex-1">{profile.availableBeds ?? 0}</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Emergency Services</span><span className="text-gray-800 flex-1">{profile.emergencyServices ? 'Yes' : 'No'}</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Ambulance Service</span><span className="text-gray-800 flex-1">{profile.ambulanceService ? 'Yes' : 'No'}</span></div>
            <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Rating</span><span className="text-gray-800 flex-1">{profile.rating != null ? `${profile.rating} / 5.0` : '0.0 / 5.0'}</span></div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default HospitalProfile;
