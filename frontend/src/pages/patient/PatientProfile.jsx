import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { profileService } from '../../services/api';

const PatientProfile = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    profileService.patient.get()
      .then((res) => { if (res.success) setProfile(res.data); })
      .catch(() => setError('Failed to load profile'));
  }, []);

  return (
    <DashboardLayout title="My Profile">
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {!profile ? (
        <p className="text-gray-500">Loading profile...</p>
      ) : (
        <>
          <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
            <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Personal Information</h2>
            <div className="flex py-4 border-b border-gray-200">
              <span className="font-semibold text-gray-600 w-52">Full Name</span>
              <span className="text-gray-800 flex-1">{profile.name || 'N/A'}</span>
            </div>
            <div className="flex py-4 border-b border-gray-200">
              <span className="font-semibold text-gray-600 w-52">Email</span>
              <span className="text-gray-800 flex-1">{profile.email || 'N/A'}</span>
            </div>
            <div className="flex py-4 border-b border-gray-200">
              <span className="font-semibold text-gray-600 w-52">Role</span>
              <span className="text-gray-800 flex-1">Patient</span>
            </div>
            <div className="flex py-4 border-b border-gray-200">
              <span className="font-semibold text-gray-600 w-52">Phone</span>
              <span className="text-gray-800 flex-1">{profile.phone || 'Not provided'}</span>
            </div>
            <div className="flex py-4 border-b border-gray-200">
              <span className="font-semibold text-gray-600 w-52">Date of Birth</span>
              <span className="text-gray-800 flex-1">{profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'Not provided'}</span>
            </div>
            <div className="flex py-4 border-b border-gray-200">
              <span className="font-semibold text-gray-600 w-52">Gender</span>
              <span className="text-gray-800 flex-1">{profile.gender || 'Not provided'}</span>
            </div>
            <div className="flex py-4">
              <span className="font-semibold text-gray-600 w-52">Blood Group</span>
              <span className="text-gray-800 flex-1">{profile.bloodGroup || 'Not provided'}</span>
            </div>
            <button className="bg-purple-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-purple-700 transition-colors mt-5 border-none cursor-pointer">Edit Profile</button>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm">
            <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Emergency Contact</h2>
            <div className="flex py-4 border-b border-gray-200">
              <span className="font-semibold text-gray-600 w-52">Contact Name</span>
              <span className="text-gray-800 flex-1">{profile.emergencyContact?.name || 'Not provided'}</span>
            </div>
            <div className="flex py-4 border-b border-gray-200">
              <span className="font-semibold text-gray-600 w-52">Relationship</span>
              <span className="text-gray-800 flex-1">{profile.emergencyContact?.relationship || 'Not provided'}</span>
            </div>
            <div className="flex py-4">
              <span className="font-semibold text-gray-600 w-52">Phone Number</span>
              <span className="text-gray-800 flex-1">{profile.emergencyContact?.phone || 'Not provided'}</span>
            </div>
            <button className="bg-purple-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-purple-700 transition-colors mt-5 border-none cursor-pointer">Add Emergency Contact</button>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default PatientProfile;
